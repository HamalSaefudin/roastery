# 00. Regions (Master Wilayah) — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup & data

- [x] Pilih & unduh dataset wilayah resmi — dipakai `cahyadsn/wilayah` (Kepmendagri 300.2.2-2138/2025) + `cahyadsn/wilayah_kodepos`, di-vendor ke `scripts/data/wilayah.sql` + `scripts/data/wilayah_kodepos.sql`
- [x] Siapkan format seed — SQL flat table `wilayah(kode, nama)`, level dari jumlah titik di `kode`; kode pos join by `kode` level desa (verifikasi: 38 provinsi, 514 kab/kota, 7.285 kecamatan, 83.762 desa — 100% match kode pos)

## Fase 1 — Schema & migration

- [x] Buat `src/modules/regions/regions.schema.ts` (`provinces`, `regencies`, `districts`, `villages` + enum `regency_type`)
- [x] Tambah index pada kolom FK level
- [x] Re-export di `src/database/schema.ts`
- [x] `pnpm db:generate` → `pnpm db:migrate` (migration `0000_slow_black_panther.sql`, 4 tabel ter-apply)

## Fase 2 — Seeding

- [x] Tulis skrip seed `scripts/seed-regions.ts` (parse SQL lokal, split per level via jumlah titik kode, batch 1000, `onConflictDoNothing`)
- [x] Jalankan seed & verifikasi jumlah baris — **38 provinsi, 514 kab/kota, 7.285 kecamatan, 83.762 desa** (100% ada kode pos)
- [x] Idempotent — di-run 2x, jumlah baris tetap sama, tidak error

## Fase 3 — Read endpoints (modul sudah di-scaffold CLI)

- [x] `GET /regions/provinces` — teruji, 38 baris
- [x] `GET /regions/regencies?provinceCode=` — teruji (32 → 27 kab/kota Jabar), 400 saat param kosong
- [x] `GET /regions/districts?regencyCode=` — teruji (32.73 → 30 kecamatan)
- [x] `GET /regions/villages?districtCode=` — teruji (32.73.01 → 4 kelurahan + postalCode)
- [x] `GET /regions/search?q=` (opsional) — teruji (q=bandung&level=regency)
- [x] Caching ringan (data statis) — **diskip**: data referensi jarang berubah & query sudah cepat lewat index; tidak perlu cache layer tambahan untuk skala ini

## Fase 4 — Integrasi

> Item di fase ini **baru bisa dicentang saat modul 02/08 dibangun** (belum ada saat ini — modul 00 dikerjakan lebih dulu sebagai fondasi). Skema kolomnya sudah didesain di docs modul terkait; ini cuma pengingat verifikasi silang nanti, **bukan blocker** untuk lanjut ke modul 01.

- [x] `customers.addresses` referensi `province_code/regency_code/district_code/village_code` — dicek saat modul `02. Customers` dibangun (`customers.schema.ts`), FK ke `provinces/regencies/districts/villages` terpasang & teruji e2e
- [x] `delivery.delivery_zones` referensi daftar `district_code` (jsonb `districtCodes`, ganti rencana awal `postal_codes`) — dicek saat modul `08. Delivery` dibangun (`zones.schema.ts`), teruji e2e

## Fase 5 — Verifikasi

- [x] Dropdown bertingkat jalan (provinsi → kelurahan) & kode pos muncul — diuji end-to-end via curl, contoh: Jawa Barat → Kota Bandung → Sukasari → Sukarasa (40152)
- [x] Query cepat (index kepakai) — index ada di `province_code`/`regency_code`/`district_code`, query filter langsung pakai kolom itu
- [x] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar — `@nestjs/swagger` terpasang saat modul `01. Authentication` Fase 0, `@ApiTags('regions')` sudah ditambahkan ke `regions.controller.ts`
- [x] Tulis `test/regions.e2e-spec.ts` — golden path (list provinsi, cascade 4 level, search) + error case (`400` param wajib kosong) (retrofit bareng modul 01, lihat konvensi §18)
- [x] `pnpm test:e2e` hijau (4 test regions + 10 test auth + 1 default)
- [x] `pnpm build` hijau & boot OK — semua 20 modul + `RegionsModule` ter-init, 5 route `/regions/*` ter-mapping
- [x] **Modul 00 Regions selesai 100%** — 2 item Fase 4 (integrasi lintas-modul) sudah dicentang balik setelah modul 02/08 selesai & terverifikasi
