# 05. Pricing — Plan

Modul: `src/modules/pricing`
Fase proyek: **Fase 1** (harga retail) & **Fase 3** (tier wholesale) & promo.

## Tujuan

Atur **harga & promo**, terpisah dari katalog:

- Harga **retail** per varian biji / per produk equipment.
- **Tier harga wholesale** (diskon per grup/volume) — Fase 3.
- **Kode promo** (persen / potongan tetap).

Semua nominal disimpan dalam **satuan terkecil (cents/rupiah bulat)** bertipe `integer` untuk hindari error floating point.

## Ketergantungan

- `catalog` — `bean_variants`, `products`.
- `customers` — `customer_type` untuk resolusi harga wholesale.
- Dipakai oleh `orders` (hitung total).

## Yang di-generate lewat Nest CLI

```bash
pnpm exec nest g service modules/pricing --no-spec
pnpm exec nest g controller modules/pricing --no-spec
```

## Schema DB (Drizzle → Postgres)

### tabel `prices` (harga retail dasar)

| kolom        | tipe         | keterangan                   |
| ------------ | ------------ | ---------------------------- |
| `id`         | uuid PK      |                              |
| `variant_id` | uuid FK null | untuk biji (→ bean_variants) |
| `product_id` | uuid FK null | untuk equipment (→ products) |
| `price`      | integer      | harga retail (rupiah bulat)  |
| `currency`   | text         | default `IDR`                |
| `updated_at` | timestamptz  | default now                  |

> Isi salah satu: `variant_id` (biji) **atau** `product_id` (equipment).

### tabel `wholesale_tiers` (Fase 3)

| kolom              | tipe    | keterangan                    |
| ------------------ | ------- | ----------------------------- |
| `id`               | uuid PK |                               |
| `name`             | text    | mis. "Grosir A"               |
| `min_quantity`     | integer | qty minimum agar tier berlaku |
| `discount_percent` | integer | diskon % dari harga retail    |
| `is_active`        | boolean | default true                  |

### enum `promo_type`: `percent` | `fixed`

### tabel `promo_codes`

| kolom          | tipe             | keterangan                   |
| -------------- | ---------------- | ---------------------------- |
| `id`           | uuid PK          |                              |
| `code`         | text unique      | dimasukkan customer          |
| `type`         | `promo_type`     |                              |
| `value`        | integer          | persen (0-100) / nominal     |
| `min_order`    | integer null     | minimal subtotal             |
| `max_discount` | integer null     | batas potongan (utk percent) |
| `starts_at`    | timestamptz null |                              |
| `ends_at`      | timestamptz null |                              |
| `usage_limit`  | integer null     | total kuota pemakaian        |
| `used_count`   | integer          | default 0                    |
| `is_active`    | boolean          | default true                 |

## Router & Controller

| Method | Route                      | Auth         | Fungsi                                            |
| ------ | -------------------------- | ------------ | ------------------------------------------------- |
| GET    | `/pricing/resolve`         | Public/login | Harga efektif utk varian/produk (+ tipe customer) |
| POST   | `/pricing/promo/validate`  | login        | Validasi kode promo terhadap subtotal             |
| POST   | `/pricing/prices`          | staff/admin  | Set harga retail                                  |
| PATCH  | `/pricing/prices/:id`      | staff/admin  | Ubah harga                                        |
| POST   | `/pricing/wholesale-tiers` | staff/admin  | Buat tier wholesale                               |
| POST   | `/pricing/promo-codes`     | staff/admin  | Buat kode promo                                   |
| GET    | `/pricing/promo-codes`     | staff/admin  | List kode promo                                   |

## Definition of Done

- Harga retail bisa di-set & di-resolve untuk storefront.
- Wholesale customer dapat harga sesuai tier.
- Promo code tervalidasi (kuota, tanggal, minimal order).
- Migration ter-apply.

## Aturan Implementasi (WAJIB)

> Ikuti konvensi global di [_conventions.md](../_conventions.md).

1. **Algoritma resolve harga** (`resolvePrice(item, quantity, customerType)`):
   1. Ambil row `prices` by `variant_id` ATAU `product_id`. Tidak ada → `NotFoundException('Harga belum diset')`.
   2. Kalau `customerType !== 'wholesale'` → return harga retail, `priceType: 'retail'`, `appliedTier: null`.
   3. Kalau wholesale: ambil semua `wholesale_tiers` aktif dengan `min_quantity <= quantity`, pilih yang `min_quantity` **paling besar**. Tidak ada yang cocok → harga retail.
   4. `harga = floor(retail * (100 - discount_percent) / 100)`.
2. **Urutan validasi promo** (return `reason` pertama yang gagal): `not_found` → `inactive` → `not_started` (`starts_at > now`) → `expired` (`ends_at < now`) → `usage_limit` (`used_count >= usage_limit`) → `min_order` (`subtotal < min_order`).
3. **Hitung diskon promo**: `percent` → `discount = floor(subtotal * value / 100)`, lalu `min(discount, max_discount)` kalau `max_discount` ada. `fixed` → `discount = min(value, subtotal)`.
4. `used_count` di-increment HANYA saat checkout sukses (oleh modul orders, dalam transaksi checkout) — BUKAN saat validate.
5. `resolvePrice()` & `validatePromo()` diekspor dari `PricingService` untuk dipakai `OrdersModule` langsung (bukan lewat HTTP).
6. Semua pembagian dibulatkan **ke bawah** (`Math.floor`) — konsisten, tidak ada rupiah desimal.

## Update Desain — 2026-07-09

1. Tabel `prices`: tambahkan **CHECK constraint** XOR — tepat satu dari `variant_id`/`product_id` terisi: `CHECK ((variant_id IS NULL) <> (product_id IS NULL))`. Jangan andalkan validasi aplikasi saja.
