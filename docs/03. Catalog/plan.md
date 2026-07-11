# 03. Catalog — Plan

Modul: `src/modules/catalog` (+ sub-modul `beans`, `machines`, `grinders`, `brands`, `origins`, `categories`)
Fase proyek: **Fase 1**.

## Tujuan

Sumber **barang yang dijual**. Satu entitas dasar `products` + detail per tipe:
biji kopi (varian SKU per berat×giling), mesin espresso, grinder.
Plus **tabel master**: `brands`, `origins`, `categories` (dinormalisasi dari field text).
Catatan: **harga** ada di modul `pricing`, **stok** di `inventory`. Katalog = definisi produk.

## Ketergantungan

- `database` — Drizzle.
- Dipakai oleh: `pricing`, `inventory`, `orders`.

## Yang di-generate lewat Nest CLI

```bash
# base catalog
pnpm exec nest g service modules/catalog --no-spec
pnpm exec nest g controller modules/catalog --no-spec
# per tipe (sub-modul sudah ada)
pnpm exec nest g service modules/catalog/beans --no-spec
pnpm exec nest g controller modules/catalog/beans --no-spec
pnpm exec nest g service modules/catalog/machines --no-spec
pnpm exec nest g controller modules/catalog/machines --no-spec
pnpm exec nest g service modules/catalog/grinders --no-spec
pnpm exec nest g controller modules/catalog/grinders --no-spec
# master data (sub-modul baru)
pnpm exec nest g module modules/catalog/brands
pnpm exec nest g service modules/catalog/brands --no-spec
pnpm exec nest g controller modules/catalog/brands --no-spec
pnpm exec nest g module modules/catalog/origins
pnpm exec nest g service modules/catalog/origins --no-spec
pnpm exec nest g controller modules/catalog/origins --no-spec
pnpm exec nest g module modules/catalog/categories
pnpm exec nest g service modules/catalog/categories --no-spec
pnpm exec nest g controller modules/catalog/categories --no-spec
```

File manual: `catalog.schema.ts` (atau schema per sub-modul), DTO tiap tipe.

## Schema DB (Drizzle → Postgres)

### Master: `brands`

| kolom         | tipe        | keterangan               |
| ------------- | ----------- | ------------------------ |
| `id`          | uuid PK     |                          |
| `name`        | text        | mis. `Rocket`, `Fellow`  |
| `slug`        | text unique |                          |
| `logo_url`    | text null   |                          |
| `description` | text null   |                          |
| `is_active`   | boolean     | default true             |

### Master: `origins` (asal biji)

| kolom         | tipe        | keterangan                     |
| ------------- | ----------- | ------------------------------ |
| `id`          | uuid PK     |                                |
| `name`        | text        | mis. `Ethiopia — Yirgacheffe`  |
| `country`     | text        | mis. `Ethiopia`                |
| `region`      | text null   | mis. `Yirgacheffe`             |
| `description` | text null   | untuk konten origin story      |
| `is_active`   | boolean     | default true                   |

### Master: `categories`

| kolom         | tipe         | keterangan                  |
| ------------- | ------------ | --------------------------- |
| `id`          | uuid PK      |                             |
| `name`        | text         | mis. `Manual Brew`, `Beans` |
| `slug`        | text unique  |                             |
| `parent_id`   | uuid FK null | → categories (nested)       |
| `is_active`   | boolean      | default true                |

### enum `product_type`: `bean` | `machine` | `grinder`

### tabel `products` (dasar)

| kolom         | tipe            | keterangan                        |
| ------------- | --------------- | --------------------------------- |
| `id`          | uuid PK         |                                   |
| `type`        | `product_type`  |                                   |
| `name`        | text            |                                   |
| `slug`        | text unique     | untuk URL frontend                |
| `description` | text null       |                                   |
| `brand_id`    | uuid FK null    | → **brands** (machine/grinder)    |
| `category_id` | uuid FK null    | → **categories**                  |
| `image_url`   | text null       |                                   |
| `is_active`   | boolean         | default true (muncul di toko)     |
| `created_at`  | timestamptz     | default now                       |
| `updated_at`  | timestamptz     | default now                       |

### Section: BEANS

**enum** `bean_process`: `washed` | `natural` | `honey` | `other`
**enum** `roast_level`: `light` | `medium` | `dark`

**tabel `bean_details`** (1-1 dgn products)

| kolom          | tipe             | keterangan                   |
| -------------- | ---------------- | ---------------------------- |
| `product_id`   | uuid PK/FK       | → products                   |
| `origin_id`    | uuid FK null     | → **origins**                |
| `process`      | `bean_process`   |                              |
| `roast_level`  | `roast_level`    |                              |
| `altitude`     | text null        |                              |
| `variety`      | text null        |                              |
| `tasting_notes`| text null        |                              |
| `roasted_at`   | date null        | tanggal roasting             |

**enum** `grind_type`: `whole` | `espresso` | `v60` | `french_press` | `moka_pot` | `drip`

**tabel `bean_variants`** (SKU biji = berat × giling)

| kolom          | tipe          | keterangan               |
| -------------- | ------------- | ------------------------ |
| `id`           | uuid PK       |                          |
| `product_id`   | uuid FK       | → products               |
| `weight_grams` | integer       | 250 / 500 / 1000         |
| `grind`        | `grind_type`  | default `whole`          |
| `sku`          | text unique   | kode SKU                 |
| `is_active`    | boolean       | default true             |

### Section: MACHINES

**tabel `machine_details`** (1-1)

| kolom            | tipe        | keterangan            |
| ---------------- | ----------- | --------------------- |
| `product_id`     | uuid PK/FK  | → products            |
| `specs`          | jsonb       | spesifikasi bebas     |
| `voltage`        | text null   |                       |
| `warranty_months`| integer     | masa garansi          |

### Section: GRINDERS

**tabel `grinder_details`** (1-1)

| kolom            | tipe        | keterangan            |
| ---------------- | ----------- | --------------------- |
| `product_id`     | uuid PK/FK  | → products            |
| `burr_type`      | text        | conical/flat          |
| `specs`          | jsonb       |                       |
| `warranty_months`| integer     |                       |

> Unit fisik ber-nomor seri (machine/grinder) di-track di `inventory` (`equipment_units`), bukan di sini.
> `brand` (dulu text) → **`brand_id`**; `origin` (dulu text) → **`origin_id`**; tambah **`category_id`**.

## Router & Controller

| Method | Route                        | Auth        | Fungsi                                  |
| ------ | ---------------------------- | ----------- | --------------------------------------- |
| GET    | `/catalog/products`          | Public      | List produk (filter `type`, `brandId`, `categoryId`, search) |
| GET    | `/catalog/products/:slug`    | Public      | Detail produk (+ detail tipe + varian)  |
| GET    | `/catalog/beans`             | Public      | List biji (filter `originId`/process/roast) |
| GET    | `/catalog/machines`          | Public      | List mesin (filter `brandId`)           |
| GET    | `/catalog/grinders`          | Public      | List grinder (filter `brandId`)         |
| POST   | `/catalog/products`          | staff/admin | Buat produk (+ detail tipe)             |
| PATCH  | `/catalog/products/:id`      | staff/admin | Ubah produk                             |
| DELETE | `/catalog/products/:id`      | staff/admin | Nonaktifkan/hapus                       |
| POST   | `/catalog/beans/:id/variants`| staff/admin | Tambah varian SKU biji                  |
| GET    | `/catalog/brands`            | Public      | List brand                              |
| POST   | `/catalog/brands`            | staff/admin | CRUD brand (+ PATCH/DELETE)             |
| GET    | `/catalog/origins`           | Public      | List origin                             |
| POST   | `/catalog/origins`           | staff/admin | CRUD origin                             |
| GET    | `/catalog/categories`        | Public      | List kategori (tree)                    |
| POST   | `/catalog/categories`        | staff/admin | CRUD kategori                           |

## Definition of Done

- Master `brands`, `origins`, `categories` bisa dikelola & difilter.
- Produk 3 tipe dibuat dengan `brand_id`/`category_id`/`origin_id` (bukan text lagi) & tampil publik.
- Biji punya varian SKU (berat × giling).
- Migration ter-apply.

## Aturan Implementasi (WAJIB)

> Ikuti konvensi global di [_conventions.md](../_conventions.md).

1. **Urutan bikin schema**: master (`brands`, `origins`, `categories`) dulu, baru `products`, baru detail & varian (karena FK).
2. **Create produk = satu transaksi**: insert `products` + insert `bean_details`/`machine_details`/`grinder_details` sesuai `type`. Body `detail` wajib divalidasi sesuai `type` (bean tanpa `brandId` boleh; machine/grinder wajib `brandId`).
3. **Slug**: pakai util `src/common/slug.util.ts` (buat di modul ini, lihat konvensi §11). Berlaku untuk products, brands, categories.
4. **Endpoint publik** (`GET`) hanya menampilkan `is_active = true`. Endpoint admin menampilkan semua.
5. **DELETE**: products → soft delete (`is_active = false`). Master (brand/origin/category) → kalau masih direferensikan produk, tolak 409 (`Masih dipakai produk`); kalau tidak, soft delete juga.
6. **Detail produk by slug**: join detail sesuai type + master (brand/category/origin sebagai objek `{ id, name }`) + `variants` (khusus bean). Bentuk persis lihat api-contract.
7. **SKU varian**: unik global; duplikat → 409. `weight_grams` hanya menerima nilai dari daftar: 200, 250, 500, 1000 (validasi `@IsIn`).
8. **Kategori tree**: `GET /catalog/categories` return flat array dengan `parentId` — frontend yang menyusun tree. Jangan bikin rekursi di SQL.
9. Search (`?search=`) pakai `ilike('%term%')` pada kolom `name`.

## Update Desain — 2026-07-09 (gambaran bisnis final + kode ID)

> Bila beda dengan tabel schema/aturan di atas, bagian ini yang menang. Referensi: [gambaran-bisnis.md](../gambaran-bisnis.md) + [konvensi §16](../_conventions.md).

1. `products` **TAMBAH kolom** `code text unique not null` — prefix per tipe: `BEN-`/`MCH-`/`GRD-` + pad 6 (counter global terpisah per tipe: `product_bean`, `product_machine`, `product_grinder`). Generate dalam transaksi create produk. Tampilkan di semua response produk & tabel CMS.
2. **enum baru** `bean_fulfillment`: `ready_stock` | `roast_to_order`. `bean_details` **TAMBAH kolom** `fulfillment_type bean_fulfillment not null default 'ready_stock'` — keputusan bisnis: model roasting campuran. Storefront menampilkan label "disangrai setelah dipesan — kirim +1-2 hari" untuk `roast_to_order`.
3. `bean_variants.sku` **TIDAK diinput manual lagi** — auto-generate: `<kodeProduk>-<berat>-<GILING>` (grind uppercase, `whole` → `WB`). Contoh: `BEN-000042-250-V60`. Body `POST /catalog/beans/:id/variants` tidak lagi menerima field `sku`.
4. Endpoint publik tetap pakai `:slug` untuk detail; `code` adalah identitas administratif (CMS, label, stok), bukan pengganti slug di URL storefront.
