# 03. Catalog — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup

- [ ] Sepakati daftar enum (process, roast, grind)
- [ ] Siapkan folder `dto/` per sub-modul

## Fase 1 — Schema & migration

- [ ] Master: `brands`, `origins`, `categories` (dibuat dulu karena `products` FK ke sini)
- [ ] `products` + enum `product_type` (`brand_id`, `category_id`)
- [ ] Kolom `code` produk (BEN-/MCH-/GRD-XXXXXX, konvensi §16) — counter global per tipe
- [ ] Enum `bean_fulfillment` + kolom `fulfillment_type` di `bean_details` (ready_stock default)
- [ ] Section beans: `bean_details` (`origin_id`), `bean_variants` + enum `bean_process`, `roast_level`, `grind_type`
- [ ] Section machines: `machine_details`
- [ ] Section grinders: `grinder_details`
- [ ] Re-export semua di `src/database/schema.ts`
- [ ] `pnpm db:generate` → `pnpm db:migrate`
- [ ] Verifikasi tabel

## Fase 2 — Scaffold file (Nest CLI)

- [ ] Service + controller `catalog` (base)
- [ ] Sub-modul `catalog/beans`, `catalog/machines`, `catalog/grinders` (service + controller)
- [ ] Sub-modul master `catalog/brands`, `catalog/origins`, `catalog/categories` (module + service + controller)
- [ ] DTO create/update per tipe & per master

## Fase 3 — Master data (brands/origins/categories)

- [ ] CRUD `brands` (+ cek tidak bisa dihapus jika dipakai produk)
- [ ] CRUD `origins`
- [ ] CRUD `categories` (dukung `parentId` / tree)
- [ ] Endpoint `GET` publik untuk ketiganya

## Fase 4 — Read publik produk

- [ ] `GET /catalog/products` (filter type/brandId/categoryId + search + pagination)
- [ ] `GET /catalog/products/:slug` (gabung detail tipe + master + varian)
- [ ] `GET /catalog/beans` (filter originId) `/machines` `/grinders` (filter brandId)
- [ ] Hanya tampilkan `is_active = true` untuk publik

## Fase 5 — Admin CRUD produk (staff/admin)

- [ ] `POST /catalog/products` (produk + detail tipe, pakai `brandId`/`categoryId`/`originId`)
- [ ] `PATCH /catalog/products/:id`
- [ ] `DELETE /catalog/products/:id` (soft delete via `is_active`)
- [ ] `POST /catalog/beans/:id/variants` (varian SKU)
- [ ] SKU varian auto-generate `<kodeProduk>-<berat>-<GILING>` (body tanpa `sku`)
- [ ] Guard `@Roles('staff','admin')`

## Fase 6 — Verifikasi

- [ ] Seed beberapa brand/origin/category
- [ ] Buat 1 produk tiap tipe (pakai master id) → cek tampil publik dengan detail benar
- [ ] Biji punya minimal 2 varian SKU
- [ ] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar
- [ ] Tulis `test/catalog.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md (lihat konvensi §18)
- [ ] `pnpm test:e2e` hijau
- [ ] `pnpm build` hijau & boot OK
- [ ] Tandai selesai → lanjut `04. Inventory`
