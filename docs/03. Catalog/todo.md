# 03. Catalog — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup

- [x] Sepakati daftar enum (process, roast, grind) — dipakai persis seperti di plan.md
- [x] Siapkan folder `dto/` per sub-modul

## Fase 1 — Schema & migration

- [x] Master: `brands`, `origins`, `categories` (dibuat dulu karena `products` FK ke sini) — `categories.parentId` self-reference pakai pola `AnyPgColumn`
- [x] `products` + enum `product_type` (`brand_id`, `category_id`)
- [x] Kolom `code` produk (BEN-/MCH-/GRD-XXXXXX, konvensi §16) — counter global per tipe (schema siap, generate di service Fase 5)
- [x] Enum `bean_fulfillment` + kolom `fulfillment_type` di `bean_details` (ready_stock default)
- [x] Section beans: `bean_details` (`origin_id`), `bean_variants` + enum `bean_process`, `roast_level`, `grind_type`
- [x] Section machines: `machine_details`
- [x] Section grinders: `grinder_details`
- [x] Re-export semua di `src/database/schema.ts`
- [x] `pnpm db:generate` (`0004_bitter_bloodstrike.sql`) → `pnpm db:migrate`
- [x] Verifikasi tabel (psql: 18 tabel total, 8 baru untuk catalog)
- [x] Bonus: bikin `src/common/slug.util.ts` (konvensi §11) sekalian di fase ini karena dibutuhkan skema penamaan produk/brand/category

## Fase 2 — Scaffold file (Nest CLI)

- [x] Service + controller `catalog` (base)
- [x] Sub-modul `catalog/beans`, `catalog/machines`, `catalog/grinders` (service + controller)
- [x] Sub-modul master `catalog/brands`, `catalog/origins`, `catalog/categories` (module + service + controller)
- [x] DTO create/update per tipe & per master

## Fase 3 — Master data (brands/origins/categories)

- [x] CRUD `brands` (+ cek tidak bisa dihapus jika dipakai produk)
- [x] CRUD `origins`
- [x] CRUD `categories` (dukung `parentId` / tree)
- [x] Endpoint `GET` publik untuk ketiganya

## Fase 4 — Read publik produk

- [x] `GET /catalog/products` (filter type/brandId/categoryId + search + pagination)
- [x] `GET /catalog/products/:slug` (gabung detail tipe + master + varian)
- [x] `GET /catalog/beans` (filter originId) `/machines` `/grinders` (filter brandId)
- [x] Hanya tampilkan `is_active = true` untuk publik

## Fase 5 — Admin CRUD produk (staff/admin)

- [x] `POST /catalog/products` (produk + detail tipe, pakai `brandId`/`categoryId`/`originId`)
- [x] `PATCH /catalog/products/:id`
- [x] `DELETE /catalog/products/:id` (soft delete via `is_active`)
- [x] `POST /catalog/beans/:id/variants` (varian SKU)
- [x] SKU varian auto-generate `<kodeProduk>-<berat>-<GILING>` (body tanpa `sku`)
- [x] Guard `@Roles('staff','admin')`

## Fase 6 — Verifikasi

- [x] Seed beberapa brand/origin/category (manual curl, lalu dibersihkan) — **update 2026-07-13**: seed data referensi persisten ditambah via `pnpm db:seed:catalog` (`scripts/seed-catalog-master.ts`, idempotent) — 8 brand mesin/grinder, 12 origin biji (7 lokal Indonesia + 5 internasional), 4 kategori induk + 6 anak; dibutuhkan supaya dropdown form produk di CMS tidak kosong
- [x] Buat 1 produk tiap tipe (pakai master id) → cek tampil publik dengan detail benar
- [x] Biji punya minimal 2 varian SKU (dicek via e2e: sku auto-generate + 409 duplikat)
- [x] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar (`catalog`)
- [x] Tulis `test/catalog.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md (34 test)
- [x] `pnpm test:e2e` hijau (5 suite, 70 test)
- [x] `pnpm build` hijau & boot OK
- [x] Tandai selesai → lanjut `04. Inventory`
- [x] Fix ditemukan saat testing: `api-contract.md` menyebut brand duplikat → `409`, padahal implementasi pakai `uniqueSlug()` (auto-suffix `-2`/`-3`) konsisten dengan products/categories — dokumen diperbaiki, bukan kode
