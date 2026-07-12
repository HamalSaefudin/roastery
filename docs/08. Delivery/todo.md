# 08. Delivery — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).
Modul ini menjangkau 2 fase proyek: **Fase 1 (zones + dispatch)** & **Fase 2 (driver app)**.

---

## Fase 0 — Setup

- [x] Pastikan `orders` selesai — dibangun bareng (Orders↔Delivery saling FK & saling panggil, lihat konvensi §12)
- [x] Pastikan role `driver` ada di `auth`

## Fase 1 — Schema & migration

- [x] `vehicles` (master) + enum `vehicle_type`
- [x] `delivery_zones` (referensi `district_code` dari modul `regions`) + kolom `is_fallback` (Update Desain 2026-07-09)
- [x] `deliveries` + enum `delivery_status` (+ `delivery_number`, `cod_amount`, `cod_collected_at`, `cod_settlement_id` sekaligus)
- [x] `drivers` (`vehicle_id` FK → vehicles)
- [x] `delivery_events`
- [x] Tabel baru `cod_settlements` + enum `settlement_status`
- [x] Re-export di `src/database/schema.ts` — **digabung 1 migrasi bareng modul 06+07** (`0007_next_starhawk.sql`, 14 tabel, FK topological-sort otomatis via drizzle-kit)
- [x] `pnpm db:generate` → `pnpm db:migrate`

## Fase 2 — Scaffold file (Nest CLI)

- [x] Service + controller `delivery` (base) — hanya `GET /delivery/track/:orderId`, sisanya di sub-modul
- [x] Service + controller `delivery/zones`
- [x] Service + controller `delivery/dispatch`
- [x] Service + controller `delivery/drivers`
- [x] Sub-modul master `delivery/vehicles` (module + service + controller)
- [x] DTO zone, assign, status, location, vehicle, cod-settlement
- [x] `DispatchModule` exports `DispatchService`; `forwardRef()` ke `OrdersModule`, import biasa `PaymentsModule` (satu arah, lihat konvensi §12)

## Fase 3 — Master kendaraan & zona (Fase 1 proyek)

- [x] CRUD `vehicles` (`GET/POST/PATCH /delivery/vehicles`) — cek plat duplikat → 409 (bukan 500 mentah dari DB constraint)
- [x] `POST /delivery/zones` + `GET /delivery/zones` (+ `PATCH /delivery/zones/:id`, bonus konsisten dgn pola master data modul lain)
- [x] `GET /delivery/fee` (dari `district_code` → zona → ongkir) — **tidak pernah 404** (Update Kontrak): ketemu zona → `shippingMethod: internal`; tidak ketemu → zona fallback, `shippingMethod: external`, `outOfZone: true`
- [x] Dipakai `orders` saat checkout (`ZonesService.resolveByDistrictCode()` via DI)

## Fase 4 — Dispatch-only (Fase 1 proyek)

- [x] Buat `deliveries` otomatis saat order dibuat (`DispatchService.createForOrder()`, status `pending`) — hanya utk delivery + zona internal; pickup & external TIDAK punya row `deliveries`
- [x] `GET /delivery/dispatch` (papan CMS, filter `?status=`)
- [x] `POST /delivery/:id/assign` (pilih driver → status `assigned`) — notifikasi SMS/WA **ditunda**, belum ada infrastruktur notifikasi di proyek ini
- [x] `GET /delivery/track/:orderId` (status + histori event, utk customer & staff)

## Fase 5 — Driver App & live tracking (Fase 2 proyek)

- [x] `POST /delivery/drivers` (kelola driver — validasi user target sudah role `driver`, cegah driver ganda)
- [x] `GET /delivery/driver/jobs` (job milik driver login)
- [x] `PATCH /delivery/:id/status` (`picked_up`/`en_route`/`delivered`/`failed` + event, transisi tervalidasi tabel, kepemilikan job dicek 403)
- [x] `POST /delivery/driver/location` (update `current_lat/lng`)
- [x] Update status `delivered` → order jadi `delivered` (via `OrdersService.changeStatus()`, transaksi sama — konvensi §12 poin 3)
- [x] COD di job driver: tampilkan `codAmount` + `POST /delivery/:id/cod-collect` (panggil `markCodPaid`); `delivered` ditolak 409 sebelum `cod_collected_at` terisi
- [x] Tabel & alur `cod_settlements`: `GET driver/cod-balance`, `POST cod-settlements` (kumpulkan semua delivery collected-belum-settled), `PATCH cod-settlements/:id/confirm`
- [x] Zona fallback (`is_fallback`) + fee resolve luar zona (bukan 404) + `delivery_number` sequence

## Fase 6 — Verifikasi

- [x] Fase 1: ongkir benar (internal & fallback), assign driver, customer lihat status — diuji manual curl + e2e
- [x] Fase 2: driver update status → tracking customer berubah, COD collect→settlement→confirm end-to-end
- [x] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar (`delivery`)
- [x] Tulis `test/delivery.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md (26 test)
- [x] `pnpm test:e2e` hijau
- [x] `pnpm build` hijau & boot OK
- [x] Tandai selesai → lanjut `09. Service Desk`

### Fix ditemukan saat testing

- [x] `POST /delivery/:id/assign` & `POST /delivery/:id/cod-collect` default Nest 201, kontrak minta 200 → tambah `@HttpCode(200)` (lihat konvensi §8)
- [x] `VehiclesService.create()` tidak cek duplikat `plateNumber` sebelum insert → DB constraint error mentah (500) bukan `ConflictException` (409) — ditambah pre-check
- [x] `DispatchService.assign()`/`updateStatus()`/`codCollect()` awalnya update `deliveries` lalu (utk `updateStatus`/`codCollect`) panggil `OrdersService.changeStatus()`/`PaymentsService.markCodPaid()` di TRANSAKSI TERPISAH — state korup kalau panggilan kedua gagal. Fix: wrap `this.db.transaction()` (lihat konvensi §12 poin 3)
