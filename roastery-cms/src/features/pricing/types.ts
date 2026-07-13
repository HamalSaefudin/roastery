export interface Price {
  id: string
  variantId?: string | null
  productId?: string | null
  price: number
  currency: string
  itemName?: string
  itemSku?: string
  isActive?: boolean
}

export interface WholesaleTier {
  id: string
  name: string
  minQuantity: number
  discountPercent: number
}

export interface PromoCode {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  minOrder: number
  maxDiscount: number | null
  startsAt: string
  endsAt: string
  usageLimit: number
  usedCount: number
  isActive: boolean
}
