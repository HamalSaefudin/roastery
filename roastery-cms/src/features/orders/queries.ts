import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { api, getErrorMessage } from '#/lib/api/client.ts'
import { toast } from 'sonner'
import type { Order, Payment, Invoice } from './types.ts'

export const ORDERS_QK = {
  list: (params?: Record<string, unknown>) =>
    ['orders', 'list', params] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
  payment: (orderId: string) => ['orders', 'payment', orderId] as const,
  invoices: () => ['orders', 'invoices'] as const,
}

export function ordersListQueryOptions(params?: {
  status?: string
  search?: string
  page?: number
}) {
  return queryOptions({
    queryKey: ORDERS_QK.list(params),
    queryFn: async () => {
      const { data, response } = await api.GET('/api/orders/admin', {
        params: { query: params as never },
      })
      if (!response.ok) throw new Error('Gagal memuat daftar pesanan')
      const body = data as unknown as { data: Order[]; total: number }
      return body
    },
    staleTime: 15_000,
  })
}

export function orderDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: ORDERS_QK.detail(id),
    queryFn: async () => {
      const { data, response } = await api.GET('/api/orders/{id}', {
        params: { path: { id } },
      })
      if (!response.ok) throw new Error('Pesanan tidak ditemukan')
      return (data as unknown as { order: Order }).order
    },
    refetchInterval: (query) => {
      const state = query.state
      if (state.status === 'success' && state.data) {
        const done = ['delivered', 'cancelled', 'ready_for_pickup']
        if (done.includes(state.data.status)) return false
      }
      return 30_000
    },
  })
}

export function orderPaymentQueryOptions(orderId: string) {
  return queryOptions({
    queryKey: ORDERS_QK.payment(orderId),
    queryFn: async () => {
      const { data, response } = await api.GET(
        '/api/payments/order/{orderId}',
        { params: { path: { orderId } } },
      )
      // 404 wajar kalau order belum pernah checkout via payment (mis. pickup
      // COD tanpa payment record) — bukan error, cuma "belum ada pembayaran".
      if (response.status === 404) return null
      if (!response.ok) throw new Error('Gagal memuat pembayaran')
      return (data as unknown as { payment: Payment }).payment
    },
    staleTime: 30_000,
  })
}

export function useChangeOrderStatusMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string
      status: string
      note?: string
    }) => {
      const { response } = await api.PATCH('/api/orders/{id}/status', {
        params: { path: { id } },
        body: { status, note } as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ORDERS_QK.detail(vars.id) })
      // prefix key (bukan ORDERS_QK.list() tanpa arg — hasilnya
      // ['orders','list',undefined] yg tidak partial-match cache asli
      // ['orders','list',{...params nyata...}], invalidate jadi no-op)
      qc.invalidateQueries({ queryKey: ['orders', 'list'] })
      toast.success('Status berhasil diperbarui')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useUpdateShippingMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      courier,
      trackingNumber,
    }: {
      id: string
      courier: string
      trackingNumber: string
    }) => {
      const { response } = await api.PATCH('/api/orders/{id}/shipping', {
        params: { path: { id } },
        body: { courier, trackingNumber } as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ORDERS_QK.detail(vars.id) })
      toast.success('Informasi pengiriman disimpan')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useRefundMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      paymentId,
      amount,
      reason,
    }: {
      orderId: string
      paymentId: string
      amount: number
      reason: string
    }) => {
      const { response } = await api.POST('/api/payments/{id}/refund', {
        params: { path: { id: paymentId } },
        body: { amount, reason } as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ORDERS_QK.payment(vars.orderId) })
      qc.invalidateQueries({ queryKey: ORDERS_QK.detail(vars.orderId) })
      toast.success('Refund berhasil diproses')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function invoicesListQueryOptions() {
  return queryOptions({
    queryKey: ORDERS_QK.invoices(),
    queryFn: async () => {
      // CATATAN: GET /payments/invoices (list) belum ada di backend —
      // modul Payments cuma punya POST (create) + PATCH .../pay per-id,
      // tidak ada endpoint utk browse semua invoice. Query ini akan
      // SELALU 404 sampai endpoint-nya ditambah (di luar scope "frontend
      // only" — lihat catatan step 08 di todo.md).
      const { data, response } = await api.GET(
        '/api/payments/invoices' as never,
      )
      if (!response.ok) throw new Error('Gagal memuat invoice')
      const body = data as unknown as { data: Invoice[] } | undefined
      return body?.data ?? []
    },
    staleTime: 15_000,
  })
}

export function usePayInvoiceMutation() {
  const qc = useQueryClient()
  return useMutation({
    // Backend PATCH /payments/invoices/:id/pay tidak menerima body sama
    // sekali (tandai lunas PENUH, bukan pembayaran parsial) — tidak ada
    // konsep `paidAmount` di skema invoices.
    mutationFn: async ({ id }: { id: string }) => {
      const { response } = await api.PATCH('/api/payments/invoices/{id}/pay', {
        params: { path: { id } },
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ORDERS_QK.invoices() })
      toast.success('Invoice berhasil dibayar')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}
