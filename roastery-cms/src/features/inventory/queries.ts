import {
  queryOptions,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { api, getErrorMessage } from '#/lib/api/client.ts'
import { toast } from 'sonner'
import type { BeanStock, EquipmentUnit, OverviewResponse } from './types.ts'

export const INVENTORY_QK = {
  overview: ['inventory', 'overview'] as const,
  lowStock: ['inventory', 'low-stock'] as const,
  units: (params?: Record<string, string>) =>
    ['inventory', 'units', params] as const,
  movements: (params?: Record<string, string>) =>
    ['inventory', 'movements', params] as const,
}

export function overviewQueryOptions() {
  return queryOptions({
    queryKey: INVENTORY_QK.overview,
    queryFn: async () => {
      const { data, response } = await api.GET('/api/inventory/overview')
      if (!response.ok) throw new Error('Gagal memuat data stok')
      return data as unknown as OverviewResponse
    },
    staleTime: 30_000,
  })
}

export function lowStockQueryOptions() {
  return queryOptions({
    queryKey: INVENTORY_QK.lowStock,
    queryFn: async () => {
      const { data, response } = await api.GET('/api/inventory/low-stock')
      if (!response.ok) throw new Error('Gagal memuat stok menipis')
      const body = data as unknown as { data: BeanStock[] } | undefined
      return body?.data ?? []
    },
    staleTime: 15_000,
  })
}

export function unitsQueryOptions(params?: Record<string, string>) {
  return queryOptions({
    queryKey: INVENTORY_QK.units(params),
    queryFn: async () => {
      const { data, response } = await api.GET(
        '/api/inventory/equipment-units',
        {
          params: { query: params as Record<string, string> },
        },
      )
      if (!response.ok) throw new Error('Gagal memuat unit')
      return data as unknown as { data: EquipmentUnit[]; total: number }
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function useAdjustStockMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      variantId,
      quantity,
      reason,
    }: {
      variantId: string
      quantity: number
      reason: string
    }) => {
      const { response } = await api.PATCH(
        '/api/inventory/bean-stock/{variantId}',
        {
          params: { path: { variantId } } as never,
          body: { quantity, reason } as never,
        },
      )
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Stok berhasil disesuaikan')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useCreateUnitMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { productId: string; serialNumber: string }) => {
      const { response } = await api.POST('/api/inventory/equipment-units', {
        body: body as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
      return response
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', 'units'] })
      toast.success('Unit berhasil ditambahkan')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useMarkDefectiveMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { response } = await api.PATCH(
        '/api/inventory/equipment-units/{id}',
        {
          params: { path: { id } } as never,
          body: { status: 'defective' } as never,
        },
      )
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', 'units'] })
      toast.success('Unit ditandai sebagai defective')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}
