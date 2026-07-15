# 06. Orders — API Contract

Base URL `/api`. Auth via cookie. Nominal integer (IDR).

## Objek

### `CartItem`

```json
{
  "id": "uuid",
  "productId": "uuid",
  "variantId": "uuid",
  "name": "Ethiopia Yirgacheffe 250g Whole",
  "quantity": 2,
  "unitPrice": 85000,
  "lineTotal": 170000
}
```

### `Order`

```json
{
  "id": "uuid",
  "orderNumber": "ORD-20260708-0001",
  "status": "created",
  "paymentType": "prepaid",
  "subtotal": 170000,
  "discount": 0,
  "deliveryFee": 15000,
  "total": 185000,
  "items": [
    /* order items */
  ],
  "deliveryAddress": { "recipientName": "...", "line1": "...", "city": "..." },
  "createdAt": "2026-07-08T00:00:00Z"
}
```

`status`: `created` | `paid` | `processing` | `out_for_delivery` | `delivered` | `cancelled`

---

## GET /orders/cart

**Auth:** login. **Response `200`:** `{ "cart": { "id", "items": CartItem[], "subtotal": 170000 } }`

## POST /orders/cart/items

**Body:** `{ "variantId"?: "uuid", "productId"?: "uuid", "quantity": 2 }`
**Response `201`:** `{ "cart": { ... } }`. **Error:** `409` stok kurang, `404` produk.

## PATCH /orders/cart/items/:id

**Body:** `{ "quantity": 3 }`. **Response `200`:** `{ "cart": ... }`.

## DELETE /orders/cart/items/:id

**Response `200`:** `{ "cart": ... }`.

---

## POST /orders/checkout

Buat order dari cart.
**Body**

```json
{
  "addressId": "uuid",
  "promoCode": "HEMAT10",
  "notes": "titip satpam"
}
```

Zona & ongkir ditentukan otomatis dari `district_code` alamat (`addressId`) — client TIDAK mengirim zoneId.
**Response `201`:** `{ "order": Order }`.
**Error:** `409` stok berubah / cart kosong, `400` alamat/zona invalid, `422` promo invalid.

## GET /orders

**Query:** `?status=&page=1` (`status` boleh multi-nilai dipisah koma, sama seperti `/orders/admin`)
**Response `200`:** `{ "data": Order[], "total", "page" }` (milik sendiri).

## GET /orders/:id

**Response `200`:** `{ "order": Order }`. **Error:** `404` / `403` (bukan miliknya).

---

## GET /orders/admin _(staff/admin)_

**Query:** `?status=&search=&page=1`
- `status` boleh satu nilai (`?status=paid`) ATAU beberapa dipisah koma (`?status=created,paid`, dipakai dashboard CMS utk filter "butuh perhatian"). Nilai tidak valid → `400`.

**Response `200`:** `{ "data": Order[], "total" }`

## PATCH /orders/:id/status _(staff/admin)_

**Body:** `{ "status": "processing", "note"?: "mulai roasting" }`
**Response `200`:** `{ "order": Order }`.
**Error:** `409` transisi status tidak valid.

---

## Update Kontrak — 2026-07-09

**Mengubah kontrak di atas.** `status` order kini termasuk `ready_for_pickup`.

### Objek `Order` — field tambahan

```json
{
  "fulfillmentMethod": "delivery",
  "shippingMethod": "internal",
  "courierName": null,
  "trackingNumber": null,
  "pickupCode": null
}
```

`fulfillmentMethod`: `delivery` | `pickup`. `shippingMethod`: `internal` | `external` | `null` (pickup). `pickupCode` hanya terisi (dan hanya dikirim ke pemilik order) saat status `ready_for_pickup`.

### POST /orders/checkout — body baru (PENGGANTI)

```json
{
  "fulfillmentMethod": "delivery",
  "paymentMethod": "online",
  "addressId": "uuid",
  "promoCode": "HEMAT10",
  "notes": "titip satpam"
}
```

- `paymentMethod`: `online` | `cod`. COD hanya valid untuk delivery dalam zona (driver sendiri) — selain itu `400`.
- `addressId` wajib untuk `delivery`, diabaikan untuk `pickup` (ongkir 0).
- Alamat **luar zona TIDAK ditolak** — order dibuat dengan `shippingMethod: "external"`, ongkir flat (tarif fallback). Kurir & resi diinput staff belakangan.
- Response COD: `201 { "order": Order }` dengan `order.status = "processing"` langsung (tanpa instruksi bayar — bayar tunai ke driver).
- **Penting:** `order.paymentType` enum-nya cuma `prepaid` | `invoice` — checkout COD **tidak** mengubah `paymentType` jadi `"cod"` (nilai itu tidak pernah ada). Sinyal COD ada di field `codAmount` (lihat di bawah).

### Objek `Order` — field tambahan (2026-07-15)

```json
{ "codAmount": 40000 }
```

`codAmount`: jumlah yang harus ditagih tunai ke pelanggan, di-join dari `deliveries.cod_amount` — `null` kalau bukan order COD (termasuk semua order `pickup`/`prepaid`/`invoice`). Ditambahkan saat integrasi CMS step 09 (Papan Dispatch) — sebelumnya tidak ada cara sama sekali bagi CMS utk tahu status COD sebuah order dari `GET /orders`/`GET /orders/:id` (staff sempat salah asumsi `paymentType === 'cod'`, padahal nilai itu mustahil muncul).

### PATCH /orders/:id/shipping _(staff/admin — baru)_

**Body:** `{ "courierName": "JNE", "trackingNumber": "JX1234567890" }`
**Response `200`:** `{ "order": Order }` (status → `out_for_delivery`).
**Error:** `409` bukan order external / status bukan `processing`.
