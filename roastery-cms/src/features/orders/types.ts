export interface OrderItem {
  id: string
  productId: string | null
  variantId: string | null
  name: string
  grind: string | null
  weightGrams: number | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface OrderDeliveryAddress {
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

export interface Order {
  id: string
  orderNumber: string
  status: string
  // enum backend cuma prepaid|invoice — TIDAK PERNAH 'cod'. Sinyal COD ada
  // di field codAmount (di bawah), bukan di sini.
  paymentType: 'prepaid' | 'invoice'
  codAmount: number | null
  fulfillmentMethod: 'delivery' | 'pickup'
  shippingMethod: 'internal' | 'external' | null
  courierName: string | null
  trackingNumber: string | null
  pickupCode: string | null
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  items: OrderItem[]
  deliveryAddress: OrderDeliveryAddress | null
  notes: string | null
  createdAt: string
}

export interface Payment {
  id: string
  paymentNumber: string
  orderId: string
  provider: string
  providerRef: string | null
  method: string | null
  amount: number
  status: string
  paidAt: string | null
  createdAt: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  orderId: string
  amount: number
  dueDate: string
  status: string
  issuedAt: string
  paidAt: string | null
}
