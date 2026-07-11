# 09. Service Desk — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup

- [ ] Pastikan `inventory` (equipment_units) & `catalog` selesai
- [ ] Sepakati format `ticket_number` (mis. `RPR-20260708-001`)

## Fase 1 — Schema & migration

- [ ] `warranties`
- [ ] Kolom `warranty_number` (WRT-XXXXXX) via sequence util
- [ ] `repair_tickets` + enum `repair_status`
- [ ] `repair_updates`
- [ ] Re-export di `src/database/schema.ts`
- [ ] `pnpm db:generate` → `pnpm db:migrate`

## Fase 2 — Scaffold sub-modul (Nest CLI)

- [ ] `nest g module modules/service-desk/warranty` (+ service + controller)
- [ ] `nest g module modules/service-desk/repairs` (+ service + controller)
- [ ] DTO warranty & repair

## Fase 3 — Warranty

- [ ] `POST /service-desk/warranties` (validasi nomor seri di `equipment_units`, hitung `ends_at` dari `warranty_months`)
- [ ] `GET /service-desk/warranties` (milik sendiri)

## Fase 4 — Repairs (customer)

- [ ] `POST /service-desk/repairs` (opsional link ke warranty → `is_warranty`)
- [ ] `GET /service-desk/repairs` (milik sendiri)

## Fase 5 — Repairs (staff)

- [ ] `GET /service-desk/repairs/admin` (filter status)
- [ ] `PATCH /service-desk/repairs/:id` (status, assign teknisi, biaya, jadwal → catat `repair_updates`)

## Fase 6 — Verifikasi

- [ ] Registrasi garansi valid & masa berlaku benar
- [ ] Tiket dibuat → assign → update status → selesai
- [ ] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar
- [ ] Tulis `test/service-desk.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md (lihat konvensi §18)
- [ ] `pnpm test:e2e` hijau
- [ ] `pnpm build` hijau & boot OK
- [ ] Tandai selesai → lanjut `10. Content`
