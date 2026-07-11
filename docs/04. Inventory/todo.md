# 04. Inventory — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup

- [ ] Pastikan `catalog` selesai (butuh `bean_variants` & `products`)

## Fase 1 — Schema & migration

- [ ] `bean_stock`
- [ ] `equipment_units` + enum `unit_status`
- [ ] `stock_movements` + enum `movement_reason`
- [ ] Re-export di `src/database/schema.ts`
- [ ] `pnpm db:generate` → `pnpm db:migrate`

## Fase 2 — Scaffold file (Nest CLI)

- [ ] `nest g service modules/inventory --no-spec`
- [ ] `nest g controller modules/inventory --no-spec`
- [ ] DTO set-stock & equipment-unit

## Fase 3 — Stok biji

- [ ] `PATCH /inventory/bean-stock/:variantId` (set stok + catat movement)
- [ ] `GET /inventory/overview`
- [ ] `GET /inventory/low-stock` (quantity <= threshold)
- [ ] `GET /inventory/availability` (publik)

## Fase 4 — Unit equipment (serial)

- [ ] `POST /inventory/equipment-units` (tambah unit)
- [ ] `GET /inventory/equipment-units` (filter product/status)
- [ ] `PATCH /inventory/equipment-units/:id` (ubah status)

## Fase 5 — Integrasi reservasi (dipakai Orders)

- [ ] Fungsi `reserve()` & `release()` stok (dipanggil modul orders)
- [ ] Catat movement `reserve`/`release`/`sale`

## Fase 6 — Verifikasi

- [ ] Uji: set stok biji, cek low-stock muncul
- [ ] Uji: tambah unit serial, ubah status
- [ ] Movement tercatat benar
- [ ] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar
- [ ] Tulis `test/inventory.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md (lihat konvensi §18)
- [ ] `pnpm test:e2e` hijau
- [ ] `pnpm build` hijau & boot OK
- [ ] Tandai selesai → lanjut `05. Pricing`
