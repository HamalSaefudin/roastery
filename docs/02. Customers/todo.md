# 02. Customers — TODO

Aturan: **kerjakan per fase, urut**. Satu fase kelar semua ✅ baru lanjut. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup

- [ ] Pastikan modul `auth` sudah selesai (butuh `users` + guard)
- [ ] Pastikan modul `regions` sudah selesai & ter-seed (alamat FK ke wilayah)
- [ ] Siapkan folder `dto/`

## Fase 1 — Schema & migration

- [ ] Buat `src/modules/customers/customers.schema.ts` (enum `customer_type`, `wholesale_status`, tabel `customer_profiles`, `addresses` dgn FK wilayah, `wholesale_applications`)
- [ ] Infra sequence (konsumen pertama): `src/database/sequences.schema.ts` (tabel `sequence_counters`) + helper `src/common/sequence.util.ts` (konvensi §16)
- [ ] Kolom `code` (CUS-XXXXXX) di `customer_profiles` — generate dalam transaksi saat profil dibuat
- [ ] Re-export di `src/database/schema.ts`
- [ ] `pnpm db:generate`
- [ ] `pnpm db:migrate`
- [ ] Verifikasi tabel via `pnpm db:studio`

## Fase 2 — Scaffold file (Nest CLI)

- [ ] `nest g service modules/customers --no-spec`
- [ ] `nest g controller modules/customers --no-spec`
- [ ] Buat DTO: `update-profile.dto.ts`, `address.dto.ts`, `wholesale-application.dto.ts`

## Fase 3 — Profil & alamat (Fase 1 proyek)

- [ ] `GET /customers/me` + auto-create profil saat pertama login (jika belum ada)
- [ ] `PATCH /customers/me`
- [ ] CRUD alamat (`GET/POST/PATCH/DELETE /customers/me/addresses`)
- [ ] Logika `is_default` (hanya satu default per customer)

## Fase 4 — Wholesale application (Fase 3 proyek)

- [ ] `POST /customers/me/wholesale-application`
- [ ] `GET /customers/me/wholesale-application` (status)
- [ ] `GET /customers` (staff, search + filter tipe)
- [ ] `GET /customers/wholesale-applications` (staff, filter status)
- [ ] `PATCH /customers/wholesale-applications/:id` (approve/reject → update `customer_type`)
- [ ] Proteksi endpoint staff dengan `@Roles('staff','admin')`

## Fase 5 — Verifikasi

- [ ] Uji: profil, CRUD alamat, set default
- [ ] Uji: ajukan wholesale → approve → tipe berubah jadi `wholesale`
- [ ] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar
- [ ] Tulis `test/customers.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md (lihat konvensi §18)
- [ ] `pnpm test:e2e` hijau
- [ ] `pnpm build` hijau & boot OK
- [ ] Tandai selesai → lanjut `03. Catalog`
