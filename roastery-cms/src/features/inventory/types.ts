export interface BeanStock {
  variantId: string
  sku: string
  quantity: number
  reserved: number
  available: number
  lowStockThreshold: number
  productName?: string
}

export interface EquipmentUnit {
  id: string
  productId: string
  serialNumber: string
  status: 'in_stock' | 'reserved' | 'sold' | 'defective'
  productName?: string
}

export interface StockMovement {
  id: string
  variantId?: string
  unitId?: string
  quantity: number
  reason: 'purchase' | 'adjustment' | 'return' | 'order' | 'manual'
  refOrderId?: string
  reference?: string
  createdAt: string
}

export interface OverviewResponse {
  beans: BeanStock[]
  equipmentCounts: {
    in_stock: number
    sold: number
  }
}
