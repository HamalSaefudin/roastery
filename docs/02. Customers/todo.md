# 02. Customers — TODO

Aturan: **kerjakan per fase, urut**. Satu fase kelar semua ✅ baru lanjut. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup

- [x] Pastikan modul `auth` sudah selesai (butuh `users` + guard)
- [x] Pastikan modul `regions` sudah selesai & ter-seed (alamat FK ke wilayah)
- [x] Siapkan folder `dto/`

## Fase 1 — Schema & migration

- [x] Buat `src/modules/customers/customers.schema.ts` (enum `customer_type`, `wholesale_status`, tabel `customer_profiles`, `addresses` dgn FK wilayah, `wholesale_applications`)
- [x] Infra sequence (konsumen pertama): `src/database/sequences.schema.ts` (tabel `sequence_counters`) + helper `src/common/sequence.util.ts` (konvensi §16) — tipe `DrizzleDbOrTx` ditambah ke `drizzle.constants.ts` biar tidak `any`
- [x] Kolom `code` (CUS-XXXXXX) di `customer_profiles` — schema siap, generate dilakukan di service (Fase 3)
- [x] Re-export di `src/database/schema.ts`
- [x] `pnpm db:generate` (`0002_powerful_marten_broadcloak.sql`)
- [x] `pnpm db:migrate`
- [x] Verifikasi tabel (psql: 10 tabel termasuk `sequence_counters`, `customer_profiles`, `addresses`, `wholesale_applications`)
- [x] **Fix ditemukan pas e2e test**: `wholesale_applications.reviewed_by` awalnya tanpa `onDelete`, bikin staff yang pernah approve/reject tidak bisa dihapus (FK block). Diperbaiki jadi `{ onDelete: 'set null' }` (migration `0003_uneven_sugar_man.sql`) — lihat [konvensi §5](../_conventions.md) pola FK reviewer/assignee

## Fase 2 — Scaffold file (Nest CLI)

- [x] `nest g service modules/customers --no-spec`
- [x] `nest g controller modules/customers --no-spec`
- [x] Buat DTO: `update-profile.dto.ts`, `address.dto.ts` (`CreateAddressDto` + `UpdateAddressDto` via `PartialType`), `wholesale-application.dto.ts` (`CreateWholesaleApplicationDto` + `DecideWholesaleApplicationDto` dgn `@ValidateIf` — `note` wajib hanya kalau `decision=reject`)

## Fase 3 — Profil & alamat (Fase 1 proyek)

- [x] `GET /customers/me` + auto-create profil saat pertama login (idempotent lewat `onConflictDoNothing` + refetch, aman dari race condition)
- [x] `PATCH /customers/me`
- [x] CRUD alamat (`GET/POST/PATCH/DELETE /customers/me/addresses`) — response menyertakan nama wilayah (join provinces/regencies/districts/villages), `postalCode` diturunkan otomatis dari `villageCode`, validasi berjenjang konsisten (400 kalau tidak nyambung)
- [x] Logika `is_default` (hanya satu default per customer; alamat pertama otomatis default; hapus alamat default → alamat lain jadi default)
- [x] Ownership check: address/wholesale endpoint pakai `customerId` dari profil user login, bukan dari client — customer lain akses alamat orang lain → 404 (bukan 403, tidak bocor keberadaan resource)

## Fase 4 — Wholesale application (Fase 3 proyek)

- [x] `POST /customers/me/wholesale-application`
- [x] `GET /customers/me/wholesale-application` (status)
- [x] `GET /customers` (staff, search + filter tipe, pagination page/limit dgn default & clamp)
- [x] `GET /customers/wholesale-applications` (staff, filter status)
- [x] `PATCH /customers/wholesale-applications/:id` (approve/reject → update `customer_type` + `users.role`)
- [x] Proteksi endpoint staff dengan `@Roles('staff','admin')`

## Fase 5 — Verifikasi

- [x] Uji manual end-to-end via curl: profil auto-create (kode `CUS-000001`), update profil, 2 alamat (default logic benar), validasi wilayah salah (400 ×2), update alamat, ownership check (404), hapus alamat default → alamat lain jadi default
- [x] Uji: ajukan wholesale → duplikat pending (409) → staff approve → `customerType` & `users.role` jadi `wholesale` (dicek dari 2 sisi: profil customer & tabel `users`)
- [x] Uji: reject tanpa note (400 dari DTO validation) vs reject dengan note (200, status `rejected`, customerType TETAP retail)
- [x] Uji: approve/reject ulang aplikasi yang sudah diproses (409), aplikasi tidak ada (404)
- [x] Uji role: retail akses endpoint staff-only → 403; staff → 200
- [x] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag `customers` yang benar
- [x] Tulis `test/customers.e2e-spec.ts` — 20 test, mengkodekan ulang semua skenario manual di atas
- [x] `pnpm test:e2e` hijau (36 test: 1 app + 10 auth + 4 regions + 20 customers + 1 default)
- [x] **Fix ditemukan pas setup e2e**: `pnpm` TIDAK auto-run `pretest:e2e` (beda dari npm) — script `test:e2e` diubah jadi rantai eksplisit `test:e2e:setup && jest ...`, lihat [konvensi §1](../_conventions.md)
- [x] `pnpm build` hijau & boot OK
- [x] Tandai selesai → lanjut `03. Catalog`
