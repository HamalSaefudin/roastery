# 03. Catalog — API Contract

Base URL `/api`. Endpoint publik tidak butuh cookie; endpoint admin butuh role `staff`/`admin`.

## Objek

### `Brand` / `Origin` / `Category`

```json
// Brand
{ "id": "uuid", "name": "Rocket", "slug": "rocket", "logoUrl": null, "isActive": true }

// Origin
{ "id": "uuid", "name": "Ethiopia — Yirgacheffe", "country": "Ethiopia", "region": "Yirgacheffe" }

// Category (bisa nested via parentId)
{ "id": "uuid", "name": "Manual Brew", "slug": "manual-brew", "parentId": null }
```

### `ProductListItem`

```json
{
  "id": "uuid",
  "type": "bean",
  "name": "Ethiopia Yirgacheffe",
  "slug": "ethiopia-yirgacheffe",
  "brand": { "id": "uuid", "name": "Rocket" },
  "category": { "id": "uuid", "name": "Beans" },
  "imageUrl": "https://...",
  "isActive": true
}
```

`type`: `bean` | `machine` | `grinder`. `brand`/`category` bisa `null`.

### `BeanDetail` (di dalam detail produk tipe bean)

```json
{
  "origin": { "id": "uuid", "name": "Ethiopia — Yirgacheffe", "country": "Ethiopia" },
  "process": "washed",
  "roastLevel": "light",
  "altitude": "1900-2100 mdpl",
  "variety": "Heirloom",
  "tastingNotes": "floral, lemon, tea-like",
  "roastedAt": "2026-07-01",
  "variants": [
    { "id": "uuid", "weightGrams": 250, "grind": "whole", "sku": "ETH-YIRG-250-WB", "isActive": true }
  ]
}
```

---

## GET /catalog/products

**Query:** `?type=bean|machine|grinder&brandId=&categoryId=&search=&page=1&limit=20`
**Response `200`**

```json
{ "data": [ /* ProductListItem */ ], "total": 42, "page": 1, "limit": 20 }
```

## GET /catalog/products/:slug

Detail lengkap; field `detail` menyesuaikan `type`.
**Response `200`**

```json
{
  "product": {
    "id": "uuid",
    "type": "bean",
    "name": "Ethiopia Yirgacheffe",
    "slug": "ethiopia-yirgacheffe",
    "description": "...",
    "brand": null,
    "category": { "id": "uuid", "name": "Beans" },
    "imageUrl": "https://...",
    "detail": { /* BeanDetail | MachineDetail | GrinderDetail */ }
  }
}
```

**Error:** `404` slug tidak ada / produk nonaktif.

## GET /catalog/beans

**Query:** `?originId=&process=washed&roastLevel=light&search=&page=1`
**Response `200`:** `{ "data": ProductListItem[], "total", "page" }`

## GET /catalog/machines / GET /catalog/grinders

**Query:** `?brandId=&search=&page=1`
**Response `200`:** `{ "data": ProductListItem[], "total", "page" }`

---

## POST /catalog/products  _(staff/admin)_

Buat produk + detail tipe sekaligus. Referensi master pakai **id**.
**Body (contoh bean)**

```json
{
  "type": "bean",
  "name": "Ethiopia Yirgacheffe",
  "description": "...",
  "categoryId": "uuid",
  "imageUrl": "https://...",
  "isActive": true,
  "detail": {
    "originId": "uuid",
    "process": "washed",
    "roastLevel": "light",
    "altitude": "1900-2100 mdpl",
    "variety": "Heirloom",
    "tastingNotes": "floral, lemon"
  }
}
```

Untuk `machine`/`grinder`, sertakan `brandId` + `detail` (`specs`, `warrantyMonths`, dll).
**Response `201`:** `{ "product": { "id", "slug", ... } }` (slug di-generate dari name).
**Error:** `400` validasi, `403` bukan staff.

## PATCH /catalog/products/:id  _(staff/admin)_

**Body:** subset field produk / detail. **Response `200`:** `{ "product": ... }`.

## DELETE /catalog/products/:id  _(staff/admin)_

Soft delete (`isActive=false`). **Response `204`**.

## POST /catalog/beans/:id/variants  _(staff/admin)_

**Body:** `{ "weightGrams": 250, "grind": "whole", "sku": "ETH-YIRG-250-WB" }`
**Response `201`:** `{ "variant": { "id", "sku", ... } }`. **Error:** `409` SKU duplikat.

---

## Master data

### Brands

- `GET /catalog/brands` _(public)_ → `{ "data": Brand[] }`
- `POST /catalog/brands` _(staff/admin)_ → body `{ "name", "logoUrl"?, "description"? }` → `201 { "brand": Brand }` (slug auto, nama duplikat dapat suffix `-2`/`-3`/dst — bukan `409`, konsisten dengan `products`/`categories`).
- `PATCH /catalog/brands/:id` _(staff/admin)_ → `200 { "brand": Brand }`
- `DELETE /catalog/brands/:id` _(staff/admin)_ → `204` (tolak `409` jika masih dipakai produk)

### Origins

- `GET /catalog/origins` _(public)_ → `{ "data": Origin[] }`
- `POST /catalog/origins` _(staff/admin)_ → body `{ "name", "country", "region"?, "description"? }` → `201 { "origin": Origin }`
- `PATCH /catalog/origins/:id` · `DELETE /catalog/origins/:id` _(staff/admin)_

### Categories

- `GET /catalog/categories` _(public)_ → `{ "data": Category[] }` (tree via `parentId`)
- `POST /catalog/categories` _(staff/admin)_ → body `{ "name", "parentId"? }` → `201 { "category": Category }` (slug auto)
- `PATCH /catalog/categories/:id` · `DELETE /catalog/categories/:id` _(staff/admin)_

---

## Update Kontrak — 2026-07-09

1. Semua objek produk (**ProductListItem** & detail) **TAMBAH field** `"code": "BEN-000042"` (kode produk per tipe: BEN-/MCH-/GRD-).
2. `BeanDetail` **TAMBAH field** `"fulfillmentType": "ready_stock" | "roast_to_order"` — storefront wajib menampilkan estimasi "+1-2 hari" untuk `roast_to_order`.
3. `POST /catalog/beans/:id/variants` — body **tanpa `sku`** (digenerate server): `{ "weightGrams": 250, "grind": "v60" }` → response `{ "variant": { "id", "sku": "BEN-000042-250-V60", ... } }`.
