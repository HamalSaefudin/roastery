export interface Customer {
  id: string
  userId: string
  code: string
  fullName: string | null
  email: string
  phone: string | null
  customerType: 'retail' | 'wholesale'
  createdAt: string
}

export interface WholesaleApplication {
  id: string
  customerId: string
  businessName: string
  taxId: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy: string | null
  reviewedAt: string | null
  note: string | null
  createdAt: string
}

export interface Address {
  id: string
  label: string
  recipientName: string
  phone: string
  line1: string
  line2: string | null
  province: { code: string; name: string }
  regency: { code: string; name: string }
  district: { code: string; name: string }
  village: { code: string; name: string }
  postalCode: string
  isDefault: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
}
