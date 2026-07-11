# 08. Delivery — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).
Modul ini menjangkau 2 fase proyek: **Fase 1 (zones + dispatch)** & **Fase 2 (driver app)**.

---

## Fase 0 — Setup

- [ ] Pastikan `orders` selesai
- [ ] Pastikan role `driver` ada di `auth`

## Fase 1 — Schema & migration

- [ ] `vehicles` (master) + enum `vehicle_type`
- [ ] `delivery_zones` (referensi `district_code` dari modul `regions`)
- [ ] `deliveries` + enum `delivery_status`
- [ ] `drivers` (`vehicle_id` FK → vehicles)
- [ ] `delivery_events`
- [ ] Re-export di `src/database/schema.ts`
- [ ] `pnpm db:generate` → `pnpm db:migrate`

## Fase 2 — Scaffold file (Nest CLI)

- [ ] Service + controller `delivery` (base)
- [ ] Service + controller `delivery/zones`
- [ ] Service + controller `delivery/dispatch`
- [ ] Service + controller `delivery/drivers`
- [ ] Sub-modul master `delivery/vehicles` (module + service + controller)
- [ ] DTO zone, assign, status, location, vehicle

## Fase 3 — Master kendaraan & zona (Fase 1 proyek)

- [ ] CRUD `vehicles` (`GET/POST/PATCH /delivery/vehicles`)
- [ ] `POST /delivery/zones` + `GET /delivery/zones`
- [ ] `GET /delivery/fee` (dari kode pos / `district_code` → zona → ongkir)
- [ ] Dipakai `orders` saat checkout

## Fase 4 — Dispatch-only (Fase 1 proyek)

- [ ] Buat `deliveries` otomatis saat order dibuat (status `pending`)
- [ ] `GET /delivery/dispatch` (papan CMS)
- [ ] `POST /delivery/:id/assign` (pilih driver → status `assigned`, notify via SMS/WA)
- [ ] `GET /delivery/track/:orderId` (status dasar utk customer)

## Fase 5 — Driver App & live tracking (Fase 2 proyek)

- [ ] `POST /delivery/drivers` (kelola driver)
- [ ] `GET /delivery/driver/jobs` (job milik driver login)
- [ ] `PATCH /delivery/:id/status` (`picked_up`/`en_route`/`delivered`/`failed` + event)
- [ ] `POST /delivery/driver/location` (update `current_lat/lng`)
- [ ] Update status `delivered` → order jadi `delivered`
- [ ] COD di job driver: tampilkan `codAmount` + `POST /delivery/:id/cod-collect` (panggil `markCodPaid`)
- [ ] Tabel & alur `cod_settlements`: saldo driver, buat setoran, konfirmasi staff
- [ ] Zona fallback (`is_fallback`) + fee resolve luar zona (bukan 404) + `delivery_number` sequence

## Fase 6 — Verifikasi

- [ ] Fase 1: ongkir benar, assign driver, customer lihat status
- [ ] Fase 2: driver update status → tracking customer berubah
- [ ] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar
- [ ] Tulis `test/delivery.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md (lihat konvensi §18)
- [ ] `pnpm test:e2e` hijau
- [ ] `pnpm build` hijau & boot OK
- [ ] Tandai selesai → lanjut `09. Service Desk`
