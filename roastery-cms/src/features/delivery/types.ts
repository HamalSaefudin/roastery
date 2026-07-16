export interface DeliveryZone {
  id: string
  name: string
  districtCodes: string[]
  fee: number
  etaText: string | null
  isActive: boolean
  isFallback: boolean
}

export interface Vehicle {
  id: string
  plateNumber: string
  type: 'motor' | 'mobil' | 'van'
  capacityKg: number | null
  isActive: boolean
  createdAt: string
}

export interface DriverVehicleRef {
  id: string
  plateNumber: string
  type: string
}

export interface Driver {
  id: string
  name: string
  phone: string
  isAvailable: boolean
  vehicle: DriverVehicleRef | null
  activeJobs: number
}

export interface DeliveryDriverRef {
  id: string
  name: string
  phone: string
}

export interface DeliveryOrderAddress {
  recipientName: string
  phone: string
  line1: string
  line2: string | null
  province: string
  regency: string
  district: string
  village: string | null
  postalCode: string
}

export type DeliveryStatus =
  'pending' | 'assigned' | 'picked_up' | 'en_route' | 'delivered' | 'failed'

export interface Delivery {
  id: string
  deliveryNumber: string
  orderId: string
  status: DeliveryStatus
  driver: DeliveryDriverRef | null
  scheduledSlot: string | null
  deliveredAt: string | null
  codAmount: number | null
  codCollectedAt: string | null
  order: {
    orderNumber: string
    address: DeliveryOrderAddress | null
  }
}

export interface CodBalanceDelivery {
  deliveryNumber: string
  codAmount: number | null
  codCollectedAt: string | null
}

export interface CodBalance {
  balance: number
  deliveries: CodBalanceDelivery[]
}

export interface CodSettlement {
  id: string
  settlementNumber: string
  driverId: string
  amount: number
  status: 'pending' | 'confirmed'
  confirmedBy: string | null
  confirmedAt: string | null
  createdAt: string
}
