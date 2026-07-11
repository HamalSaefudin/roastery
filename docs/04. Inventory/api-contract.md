# 04. Inventory — API Contract

Base URL `/api`. Sebagian besar endpoint **staff/admin** (cookie + role). `availability` publik.

## Objek

### `BeanStock`

```json
{
  "variantId": "uuid",
  "sku": "ETH-YIRG-250-WB",
  "quantity": 40,
  "reserved": 3,
  "available": 37,
  "lowStockThreshold": 5
}
```

`available = quantity - reserved`

### `EquipmentUnit`

```json
{
  "id": "uuid",
  "productId": "uuid",
  "serialNumber": "SN-2026-0001",
  "status": "in_stock"
}
```

`status`: `in_stock` | `reserved` | `sold` | `defective`

---

## GET /inventory/overview  _(staff/admin)_

**Response `200`:** `{ "beans": BeanStock[], "equipmentCounts": { "in_stock": 12, "sold": 3 } }`

## GET /inventory/low-stock  _(staff/admin)_

**Response `200`:** `{ "data": BeanStock[] }` (yang `available <= lowStockThreshold`).

## PATCH /inventory/bean-stock/:variantId  _(staff/admin)_

**Body**

```json
{ "quantity": 50, "lowStockThreshold": 5, "reason": "purchase" }
```

`reason`: `purchase` | `adjustment` | `return`
**Response `200`:** `{ "stock": BeanStock }`. Movement tercatat otomatis.

## POST /inventory/equipment-units  _(staff/admin)_

**Body:** `{ "productId": "uuid", "serialNumber": "SN-2026-0001" }`
**Response `201`:** `{ "unit": EquipmentUnit }`. **Error:** `409` serial duplikat.

## GET /inventory/equipment-units  _(staff/admin)_

**Query:** `?productId=&status=in_stock&page=1`
**Response `200`:** `{ "data": EquipmentUnit[], "total" }`

## PATCH /inventory/equipment-units/:id  _(staff/admin)_

**Body:** `{ "status": "defective" }`
**Response `200`:** `{ "unit": EquipmentUnit }`

---

## GET /inventory/availability  _(public)_

Dipakai storefront untuk cek stok sebelum add-to-cart.
**Query:** `?variantId=uuid` (biji) atau `?productId=uuid` (equipment)
**Response `200`**

```json
{ "available": true, "quantity": 37 }
```

Untuk equipment: `quantity` = jumlah unit berstatus `in_stock`.
