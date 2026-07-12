# 09. Service Desk — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup

- [x] Pastikan `inventory` (equipment_units) & `catalog` selesai
- [x] Sepakati format `ticket_number` (mis. `RPR-20260708-001`)

## Fase 1 — Schema & migration

- [x] `warranties`
- [x] Kolom `warranty_number` (WRT-XXXXXX) via sequence util
- [x] `repair_tickets` + enum `repair_status`
- [x] `repair_updates`
- [x] Re-export di `src/database/schema.ts`
- [x] `pnpm db:generate` (`0009_tired_wallflower.sql`) → `pnpm db:migrate`

## Fase 2 — Scaffold sub-modul (Nest CLI)

- [x] `nest g module modules/service-desk/warranty` (+ service + controller)
- [x] `nest g module modules/service-desk/repairs` (+ service + controller)
- [x] DTO warranty & repair

## Fase 3 — Warranty

- [x] `POST /service-desk/warranties` (validasi nomor seri di `equipment_units` status `sold`, hitung `ends_at` dari `warranty_months` machine/grinder)
- [x] `GET /service-desk/warranties` (milik sendiri, join nama produk)

## Fase 4 — Repairs (customer)

- [x] `POST /service-desk/repairs` (opsional link ke warranty → `is_warranty`; klaim invalid/asing tetap 201 dgn `is_warranty=false`, bukan error)
- [x] `GET /service-desk/repairs` (milik sendiri)

## Fase 5 — Repairs (staff)

- [x] `GET /service-desk/repairs/admin` (filter status)
- [x] `PATCH /service-desk/repairs/:id` (status, assign teknisi, biaya, jadwal → catat `repair_updates`)

## Fase 6 — Verifikasi

- [x] Registrasi garansi valid & masa berlaku benar (diuji 12 bulan dari `warrantyMonths` machine)
- [x] Tiket dibuat → assign → update status → selesai (diuji full transition open→diagnosing→in_progress→completed)
- [x] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar (`service-desk`)
- [x] Tulis `test/service-desk.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md (17 test)
- [x] `pnpm test:e2e` hijau
- [x] `pnpm build` hijau & boot OK
- [x] Tandai selesai → lanjut `10. Content`

### Fix ditemukan saat testing

- [x] `PATCH /service-desk/repairs/:id` dgn `assignedTo` user tidak ada → FK violation mentah (500), bukan error jelas. Fix: pre-check user ada sebelum update, 404 kalau tidak (pola sama dgn validasi referensi di modul lain)
- [x] `warranties.equipment_unit_id` sengaja tanpa `onDelete` rule (master-data reference, konvensi §5 — sama pola dgn `deliveries.driver_id`/`zone_id`) — e2e test `afterAll` harus hapus `warranties` dulu sebelum `products` (cascade ke `equipment_units`)
