import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { api, getErrorMessage } from '#/lib/api/client.ts'
import { toast } from 'sonner'
import type { Price, WholesaleTier, PromoCode } from './types.ts'

export const PRICING_QK = {
  prices: ['pricing', 'prices'] as const,
  tiers: ['pricing', 'tiers'] as const,
  promos: ['pricing', 'promos'] as const,
}

export function pricesQueryOptions() {
  return queryOptions({
    queryKey: PRICING_QK.prices,
    queryFn: async () => {
      const { data, response } = await api.GET('/api/pricing/prices' as never)
      if (!response.ok) throw new Error('Gagal memuat harga')
      const body = data as unknown as { data: Price[] } | undefined
      return body?.data ?? []
    },
    staleTime: 30_000,
  })
}

export function tiersQueryOptions() {
  return queryOptions({
    queryKey: PRICING_QK.tiers,
    queryFn: async () => {
      const { data, response } = await api.GET(
        '/api/pricing/wholesale-tiers' as never,
      )
      if (!response.ok) throw new Error('Gagal memuat tier')
      const body = data as unknown as { data: WholesaleTier[] } | undefined
      return body?.data ?? []
    },
    staleTime: 30_000,
  })
}

export function promosQueryOptions() {
  return queryOptions({
    queryKey: PRICING_QK.promos,
    queryFn: async () => {
      const { data, response } = await api.GET('/api/pricing/promo-codes')
      if (!response.ok) throw new Error('Gagal memuat promo')
      const body = data as unknown as { data: PromoCode[] } | undefined
      return body?.data ?? []
    },
    staleTime: 30_000,
  })
}

export function useSetPriceMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      variantId?: string
      productId?: string
      price: number
    }) => {
      const { response } = await api.POST('/api/pricing/prices', {
        body: body as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRICING_QK.prices })
      toast.success('Harga berhasil disimpan')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useUpdatePriceMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { response } = await api.PATCH('/api/pricing/prices/{id}', {
        params: { path: { id } } as never,
        body: { price } as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRICING_QK.prices })
      toast.success('Harga berhasil diperbarui')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useCreateTierMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      name: string
      minQuantity: number
      discountPercent: number
    }) => {
      const { response } = await api.POST('/api/pricing/wholesale-tiers', {
        body: body as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRICING_QK.tiers })
      toast.success('Tier berhasil dibuat')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useDeleteTierMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { response } = await api.DELETE(
        `/api/pricing/wholesale-tiers/${id}` as never,
      )
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRICING_QK.tiers })
      toast.success('Tier berhasil dihapus')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useCreatePromoMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { response } = await api.POST('/api/pricing/promo-codes', {
        body: body as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRICING_QK.promos })
      toast.success('Promo berhasil dibuat')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}
