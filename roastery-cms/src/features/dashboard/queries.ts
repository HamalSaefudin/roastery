import { queryOptions } from '@tanstack/react-query'
import { api } from '#/lib/api/client'

interface PaginatedBody {
  data: unknown[]
  total: number
}

interface DataBody {
  data: unknown[]
}

export const DASHBOARD_QK = {
  orderBaru: ['dashboard', 'order-baru'] as const,
  perluDiproses: ['dashboard', 'perlu-diproses'] as const,
  pengirimanAktif: ['dashboard', 'pengiriman-aktif'] as const,
  wholesalePending: ['dashboard', 'wholesale-pending'] as const,
  stokMenipis: ['dashboard', 'stok-menipis'] as const,
}

async function fetchTotalOrder(status: string): Promise<number> {
  const { data, response } = await api.GET('/api/orders/admin', {
    params: { query: { status, page: '1' } },
  })
  if (!response.ok) return 0
  const body = data as unknown as PaginatedBody | undefined
  return body?.total ?? 0
}

export function orderBaruQueryOptions() {
  return queryOptions({
    queryKey: DASHBOARD_QK.orderBaru,
    queryFn: () => fetchTotalOrder('created,paid'),
    staleTime: 30_000,
    retry: 1,
  })
}

export function perluDiprosesQueryOptions() {
  return queryOptions({
    queryKey: DASHBOARD_QK.perluDiproses,
    queryFn: () => fetchTotalOrder('processing'),
    staleTime: 30_000,
    retry: 1,
  })
}

async function fetchPengirimanAktif(): Promise<number> {
  const { data, response } = await api.GET('/api/delivery/dispatch')
  if (!response.ok) return 0
  const body = data as unknown as DataBody | undefined
  const items = body?.data ?? []
  return items.filter(
    (item: any) =>
      item?.status === 'assigned' ||
      item?.status === 'picked_up' ||
      item?.status === 'en_route',
  ).length
}

export function pengirimanAktifQueryOptions() {
  return queryOptions({
    queryKey: DASHBOARD_QK.pengirimanAktif,
    queryFn: fetchPengirimanAktif,
    staleTime: 30_000,
    retry: 1,
  })
}

async function fetchWholesalePending(): Promise<number> {
  const { data, response } = await api.GET(
    '/api/customers/wholesale-applications',
    { params: { query: { status: 'pending' } } },
  )
  if (!response.ok) return 0
  const body = data as unknown as DataBody | undefined
  return body?.data.length ?? 0
}

export function wholesalePendingQueryOptions() {
  return queryOptions({
    queryKey: DASHBOARD_QK.wholesalePending,
    queryFn: fetchWholesalePending,
    staleTime: 30_000,
    retry: 1,
  })
}

async function fetchStokMenipis(): Promise<number> {
  const { data, response } = await api.GET('/api/inventory/low-stock')
  if (!response.ok) return 0
  const body = data as unknown as DataBody | undefined
  return body?.data.length ?? 0
}

export function stokMenipisQueryOptions() {
  return queryOptions({
    queryKey: DASHBOARD_QK.stokMenipis,
    queryFn: fetchStokMenipis,
    staleTime: 30_000,
    retry: 1,
  })
}
