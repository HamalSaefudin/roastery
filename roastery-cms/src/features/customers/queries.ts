import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { api, getErrorMessage } from '#/lib/api/client.ts'
import { toast } from 'sonner'
import type {
  Customer,
  WholesaleApplication,
  PaginatedResponse,
} from './types.ts'

export const CUSTOMERS_QK = {
  list: (params?: Record<string, unknown>) =>
    ['customers', 'list', params] as const,
  detail: (id: string) => ['customers', 'detail', id] as const,
  wholesaleList: (status?: string) =>
    ['customers', 'wholesale', status] as const,
}

export function customersListQueryOptions(params?: {
  search?: string
  type?: string
  page?: number
  limit?: number
}) {
  return queryOptions({
    queryKey: CUSTOMERS_QK.list(params),
    queryFn: async () => {
      const { data, response } = await api.GET('/api/customers', {
        params: { query: params as never },
      })
      if (!response.ok) throw new Error('Gagal memuat daftar pelanggan')
      const body = data as unknown as PaginatedResponse<Customer> | undefined
      return body ?? { data: [], total: 0, page: 1 }
    },
    staleTime: 15_000,
  })
}

export function customerDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: CUSTOMERS_QK.detail(id),
    queryFn: async () => {
      const { data: raw, response } = await api.GET('/api/customers', {
        params: { query: { search: id } as never },
      })
      if (!response.ok) throw new Error('Gagal memuat detail pelanggan')
      const list: Customer[] = (raw as unknown as { data: Customer[] }).data
      if (list.length === 0) throw new Error('Pelanggan tidak ditemukan')
      return list[0]
    },
    staleTime: 30_000,
  })
}

export function wholesaleApplicationsQueryOptions(status?: string) {
  return queryOptions({
    queryKey: CUSTOMERS_QK.wholesaleList(status),
    queryFn: async () => {
      const { data, response } = await api.GET(
        '/api/customers/wholesale-applications',
        {
          params: { query: { status } as never },
        },
      )
      if (!response.ok) throw new Error('Gagal memuat pengajuan wholesale')
      const body = data as unknown as
        { data: WholesaleApplication[] } | undefined
      return body?.data ?? []
    },
    staleTime: 15_000,
  })
}

export function useApproveWholesaleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { response } = await api.PATCH(
        '/api/customers/wholesale-applications/{id}',
        {
          params: { path: { id } },
          body: { decision: 'approve', note } as never,
        },
      )
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUSTOMERS_QK.wholesaleList() })
      qc.invalidateQueries({ queryKey: CUSTOMERS_QK.list() })
      toast.success('Pengajuan wholesale berhasil disetujui')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useRejectWholesaleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { response } = await api.PATCH(
        '/api/customers/wholesale-applications/{id}',
        {
          params: { path: { id } },
          body: { decision: 'reject', note } as never,
        },
      )
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUSTOMERS_QK.wholesaleList() })
      qc.invalidateQueries({ queryKey: CUSTOMERS_QK.list() })
      toast.success('Pengajuan wholesale ditolak')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}
