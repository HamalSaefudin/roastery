import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { api, getErrorMessage } from '#/lib/api/client.ts'
import { toast } from 'sonner'
import type {
  CodBalance,
  CodSettlement,
  Delivery,
  DeliveryZone,
  Driver,
  Vehicle,
} from './types.ts'

export const DELIVERY_QK = {
  zones: () => ['delivery', 'zones'] as const,
  vehicles: () => ['delivery', 'vehicles'] as const,
  drivers: () => ['delivery', 'drivers'] as const,
  board: (status?: string) => ['delivery', 'board', status] as const,
  codBalance: (driverId: string) =>
    ['delivery', 'codBalance', driverId] as const,
  codSettlements: (driverId?: string) =>
    ['delivery', 'codSettlements', driverId] as const,
}

// --- Zona ---

export function zonesQueryOptions() {
  return queryOptions({
    queryKey: DELIVERY_QK.zones(),
    queryFn: async () => {
      const { data, response } = await api.GET('/api/delivery/zones')
      if (!response.ok) throw new Error('Gagal memuat zona')
      return (data as unknown as { data: DeliveryZone[] }).data
    },
    staleTime: 15_000,
  })
}

export function useCreateZoneMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      name: string
      districtCodes: string[]
      fee: number
      etaText?: string
      isFallback?: boolean
    }) => {
      const { response } = await api.POST('/api/delivery/zones', {
        body: body as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DELIVERY_QK.zones() })
      toast.success('Zona berhasil dibuat')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useUpdateZoneMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string
      name?: string
      districtCodes?: string[]
      fee?: number
      etaText?: string
      isActive?: boolean
    }) => {
      const { response } = await api.PATCH('/api/delivery/zones/{id}', {
        params: { path: { id } },
        body: body as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DELIVERY_QK.zones() })
      toast.success('Zona berhasil disimpan')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

// --- Kendaraan ---

export function vehiclesQueryOptions() {
  return queryOptions({
    queryKey: DELIVERY_QK.vehicles(),
    queryFn: async () => {
      const { data, response } = await api.GET('/api/delivery/vehicles')
      if (!response.ok) throw new Error('Gagal memuat kendaraan')
      return (data as unknown as { data: Vehicle[] }).data
    },
    staleTime: 15_000,
  })
}

export function useCreateVehicleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      plateNumber: string
      type: 'motor' | 'mobil' | 'van'
      capacityKg?: number
    }) => {
      const { response } = await api.POST('/api/delivery/vehicles', {
        body,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DELIVERY_QK.vehicles() })
      toast.success('Kendaraan berhasil ditambahkan')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useUpdateVehicleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string
      plateNumber?: string
      type?: 'motor' | 'mobil' | 'van'
      capacityKg?: number
      isActive?: boolean
    }) => {
      const { response } = await api.PATCH('/api/delivery/vehicles/{id}', {
        params: { path: { id } },
        body: body as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DELIVERY_QK.vehicles() })
      toast.success('Kendaraan berhasil disimpan')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

// --- Driver ---

export function driversQueryOptions() {
  return queryOptions({
    queryKey: DELIVERY_QK.drivers(),
    queryFn: async () => {
      const { data, response } = await api.GET('/api/delivery/drivers')
      if (!response.ok) throw new Error('Gagal memuat driver')
      return (data as unknown as { data: Driver[] }).data
    },
    staleTime: 15_000,
  })
}

export function useRegisterDriverMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      userId: string
      name: string
      phone: string
      vehicleId?: string
    }) => {
      const { response } = await api.POST('/api/delivery/drivers', {
        body,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DELIVERY_QK.drivers() })
      toast.success('Driver berhasil didaftarkan')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useToggleDriverAvailabilityMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      isAvailable,
    }: {
      id: string
      isAvailable: boolean
    }) => {
      const { response } = await api.PATCH('/api/delivery/drivers/{id}', {
        params: { path: { id } },
        body: { isAvailable } as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DELIVERY_QK.drivers() })
      toast.success('Status driver diperbarui')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

// --- Papan dispatch ---

export function dispatchBoardQueryOptions(status?: string) {
  return queryOptions({
    queryKey: DELIVERY_QK.board(status),
    queryFn: async () => {
      const { data, response } = await api.GET('/api/delivery/dispatch', {
        params: { query: status ? { status } : {} },
      })
      if (!response.ok) throw new Error('Gagal memuat papan dispatch')
      return (data as unknown as { data: Delivery[] }).data
    },
    refetchInterval: 30_000,
  })
}

export function useAssignDeliveryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      driverId,
      scheduledSlot,
    }: {
      id: string
      driverId: string
      scheduledSlot?: string
    }) => {
      const { response } = await api.POST('/api/delivery/{id}/assign', {
        params: { path: { id } },
        body: { driverId, scheduledSlot },
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery', 'board'] })
      qc.invalidateQueries({ queryKey: DELIVERY_QK.drivers() })
      toast.success('Tugas terkirim ke driver')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

// --- COD ---

export function codBalanceQueryOptions(driverId: string) {
  return queryOptions({
    queryKey: DELIVERY_QK.codBalance(driverId),
    queryFn: async () => {
      const { data, response } = await api.GET(
        '/api/delivery/drivers/{driverId}/cod-balance',
        { params: { path: { driverId } } },
      )
      if (!response.ok) throw new Error('Gagal memuat saldo COD')
      return data as unknown as CodBalance
    },
    enabled: !!driverId,
  })
}

export function codSettlementsQueryOptions(driverId?: string) {
  return queryOptions({
    queryKey: DELIVERY_QK.codSettlements(driverId),
    queryFn: async () => {
      const { data, response } = await api.GET(
        '/api/delivery/cod-settlements',
        {
          params: { query: driverId ? { driverId } : {} },
        },
      )
      if (!response.ok) throw new Error('Gagal memuat riwayat setoran')
      return (data as unknown as { data: CodSettlement[] }).data
    },
  })
}

export function useCreateCodSettlementMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ driverId }: { driverId: string }) => {
      const { response } = await api.POST('/api/delivery/cod-settlements', {
        body: { driverId },
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: DELIVERY_QK.codBalance(vars.driverId) })
      qc.invalidateQueries({ queryKey: ['delivery', 'codSettlements'] })
      toast.success('Setoran berhasil dibuat, menunggu konfirmasi')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useConfirmCodSettlementMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; driverId: string }) => {
      const { response } = await api.PATCH(
        '/api/delivery/cod-settlements/{id}/confirm',
        { params: { path: { id } } },
      )
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: DELIVERY_QK.codBalance(vars.driverId) })
      qc.invalidateQueries({ queryKey: ['delivery', 'codSettlements'] })
      toast.success('Setoran dikonfirmasi')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}
