export interface Brand {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  description?: string | null
  isActive: boolean
}

export interface Origin {
  id: string
  name: string
  country: string
  region: string | null
  description?: string | null
}

export interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
}

export type TipeProduk = 'bean' | 'machine' | 'grinder'

export interface ProdukListItem {
  id: string
  code: string
  type: TipeProduk
  name: string
  slug: string
  brand: { id: string; name: string } | null
  category: { id: string; name: string } | null
  imageUrl: string | null
  isActive: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface Varian {
  id: string
  weightGrams: number
  grind: string
  sku: string
  isActive: boolean
}

export interface BeanDetail {
  origin: { id: string; name: string; country: string } | null
  process: string | null
  roastLevel: string | null
  fulfillmentType: 'ready_stock' | 'roast_to_order' | null
  altitude: string | null
  variety: string | null
  tastingNotes: string | null
  roastedAt: string | null
  variants: Varian[]
}

export interface MachineDetail {
  brand: { id: string; name: string } | null
  specs: string | null
  voltage: string | null
  warrantyMonths: number | null
}

export interface GrinderDetail {
  brand: { id: string; name: string } | null
  specs: string | null
  burrType: string | null
  warrantyMonths: number | null
}

export interface ProdukDetail {
  product: {
    id: string
    code: string
    type: TipeProduk
    name: string
    slug: string
    description: string | null
    brand: { id: string; name: string } | null
    category: { id: string; name: string } | null
    imageUrl: string | null
    isActive: boolean
    detail: BeanDetail | MachineDetail | GrinderDetail
  }
}

export interface CreateProductDto {
  type: TipeProduk
  name: string
  description?: string
  brandId?: string
  categoryId?: string
  imageUrl?: string
  isActive?: boolean
  detail: Record<string, unknown>
}

export interface UpdateProductDto {
  name?: string
  description?: string
  brandId?: string
  categoryId?: string
  imageUrl?: string
  isActive?: boolean
  detail?: Record<string, unknown>
}

export interface CreateVariantDto {
  weightGrams: number
  grind: string
}

export interface ProductFilterParams {
  type?: string
  brandId?: string
  categoryId?: string
  search?: string
  page?: string
  limit?: string
}
