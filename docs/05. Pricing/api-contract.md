# 05. Pricing — API Contract

Base URL `/api`. Nominal dalam **rupiah bulat (integer)**, `currency = IDR`.

## GET /pricing/resolve

Harga efektif untuk item. Jika user login sebagai `wholesale`, harga menyesuaikan tier.
**Auth:** opsional (login → bisa dapat harga wholesale)
**Query:** `?variantId=uuid` atau `?productId=uuid`, opsional `&quantity=10`
**Response `200`**

```json
{
  "price": 85000,
  "currency": "IDR",
  "priceType": "retail",
  "appliedTier": null
}
```

`priceType`: `retail` | `wholesale`. `appliedTier`: `{ "id", "name", "discountPercent" }` atau `null`.

## POST /pricing/promo/validate

**Auth:** login
**Body:** `{ "code": "HEMAT10", "subtotal": 200000 }`
**Response `200`**

```json
{ "valid": true, "type": "percent", "value": 10, "discount": 20000 }
```

**Response `200` (invalid)**

```json
{ "valid": false, "reason": "expired" }
```

`reason`: `not_found` | `inactive` | `expired` | `not_started` | `min_order` | `usage_limit`

---

## GET /pricing/prices  _(staff/admin)_

> Ditambahkan 2026-07-13 saat integrasi CMS step 06 — halaman Harga butuh list semua harga (retail), endpoint aslinya cuma create/update per item.

**Response `200`:** `{ "data": [ { "id", "variantId", "productId", "price", "currency", "updatedAt", "itemSku"?, "itemName"? } ] }` — diurut `updatedAt` terbaru dulu. `itemSku`/`itemName` hasil join manual ke varian biji atau produk (tergantung mana yang diisi), bisa `undefined` kalau item sumbernya sudah terhapus.

## POST /pricing/prices  _(staff/admin)_

**Body:** `{ "variantId"?: "uuid", "productId"?: "uuid", "price": 85000 }` (isi salah satu)
**Response `201`:** `{ "price": { "id", "price", "currency" } }`

## PATCH /pricing/prices/:id  _(staff/admin)_

**Body:** `{ "price": 90000 }`. **Response `200`:** `{ "price": ... }`.

## GET /pricing/wholesale-tiers  _(staff/admin)_

> Ditambahkan 2026-07-13 saat integrasi CMS step 06 — halaman Tier Grosir butuh list semua tier.

**Response `200`:** `{ "data": [ { "id", "name", "minQuantity", "discountPercent", "isActive" } ] }` — diurut `minQuantity` ascending.

## POST /pricing/wholesale-tiers  _(staff/admin)_

**Body:** `{ "name": "Grosir A", "minQuantity": 10, "discountPercent": 15 }`
**Response `201`:** `{ "tier": { "id", ... } }`

## DELETE /pricing/wholesale-tiers/:id  _(staff/admin)_

> Ditambahkan 2026-07-13 saat integrasi CMS step 06.

**Response `204`.** **Error:** `404` tier tidak ditemukan.

## POST /pricing/promo-codes  _(staff/admin)_

**Body**

```json
{
  "code": "HEMAT10",
  "type": "percent",
  "value": 10,
  "minOrder": 100000,
  "maxDiscount": 50000,
  "startsAt": "2026-07-01T00:00:00Z",
  "endsAt": "2026-07-31T23:59:59Z",
  "usageLimit": 100
}
```

**Response `201`:** `{ "promo": { "id", "code", ... } }`. **Error:** `409` code duplikat.

## GET /pricing/promo-codes  _(staff/admin)_

**Response `200`:** `{ "data": [ { "id", "code", "type", "value", "usedCount", "isActive" } ] }`
