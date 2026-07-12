# 04. Inventory — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup

- [x] Pastikan `catalog` selesai (butuh `bean_variants` & `products`)

## Fase 1 — Schema & migration

- [x] `bean_stock`
- [x] `equipment_units` + enum `unit_status`
- [x] `stock_movements` + enum `movement_reason` (FK `variant_id`/`unit_id` → `set null`, histori tetap ada; `ref_order_id` sengaja tanpa FK dulu — tabel `orders` belum ada, ditambah saat modul 06)
- [x] Re-export di `src/database/schema.ts`
- [x] `pnpm db:generate` (`0005_round_beast.sql`) → `pnpm db:migrate`

## Fase 2 — Scaffold file (Nest CLI)

- [x] `nest g service modules/inventory --no-spec`
- [x] `nest g controller modules/inventory --no-spec`
- [x] DTO set-stock & equipment-unit
- [x] `InventoryModule` exports `InventoryService` (dipakai modul Orders nanti lewat DI)

## Fase 3 — Stok biji

- [x] `PATCH /inventory/bean-stock/:variantId` (set stok + catat movement, upsert kalau bean_stock belum ada baris)
- [x] `GET /inventory/overview`
- [x] `GET /inventory/low-stock` (quantity <= threshold)
- [x] `GET /inventory/availability` (publik)

## Fase 4 — Unit equipment (serial)

- [x] `POST /inventory/equipment-units` (tambah unit)
- [x] `GET /inventory/equipment-units` (filter product/status)
- [x] `PATCH /inventory/equipment-units/:id` (ubah status)

## Fase 5 — Integrasi reservasi (dipakai Orders)

- [x] Fungsi `reserveBeanStock()`/`releaseBeanStock()`/`commitBeanStock()` + `reserveEquipmentUnits()`/`releaseEquipmentUnits()`/`commitEquipmentUnits()` (terima `tx` opsional supaya bisa ikut transaksi checkout modul Orders nanti)
- [x] Catat movement `reserve`/`release`/`sale`

## Fase 6 — Verifikasi

- [x] Uji: set stok biji, cek low-stock muncul
- [x] Uji: tambah unit serial, ubah status
- [x] Movement tercatat benar (verifikasi manual via psql: purchase/adjustment/reserve/release/sale)
- [x] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar (`inventory`)
- [x] Tulis `test/inventory.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md + reserve/release/commit langsung lewat `InventoryService` (24 test)
- [x] `pnpm test:e2e` hijau (6 suite, 94 test)
- [x] `pnpm build` hijau & boot OK
- [x] Tandai selesai → lanjut `05. Pricing`
