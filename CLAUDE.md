# Roastery — Panduan Proyek

Platform e-commerce + operasional untuk **roastery kopi**: jual biji kopi, mesin espresso, grinder; pengiriman dikelola sendiri (driver in-house); melayani retail & wholesale.

**Arsitektur:** 1 Service API (**NestJS 11 + PostgreSQL + Drizzle**, di `roastery-service/`) + 3 client TanStack Start (Storefront, CMS/Admin, Driver App — belum dibuat).

## Aturan kerja (WAJIB)

1. **Bahasa Indonesia** untuk komunikasi & dokumen.
2. Sebelum ngoding, baca **[docs/\_conventions.md](docs/_conventions.md)** — konvensi kode, pola Drizzle/NestJS, bentuk response/error.
3. Kerjakan modul **sesuai urutan folder docs** (00 → 10). Tiap modul: ikuti `todo.md` **per fase, urut** — satu fase ✅ semua dulu baru lanjut.
4. Module/controller/service/guard/decorator **wajib dibuat via Nest CLI** (`pnpm exec nest g ...`), jangan manual.
5. Tiap modul punya 3 file di `docs/NN. <Modul>/`: `plan.md` (apa & bagaimana + Aturan Implementasi), `todo.md` (checklist), `api-contract.md` (kontrak untuk frontend — sumber kebenaran).
6. **Setiap selesai item**: centang di `todo.md`. **Setiap selesai fase/modul**: update tabel progress di bawah.

## Progress

> Update tabel ini setiap ada perubahan checkbox di todo.md. Regenerate angka:
> `cd docs && for d in [0-9]*/; do echo "${d%/}: $(grep -c '^- \[x\]' "$d/todo.md")/$(grep -c '^- \[' "$d/todo.md") item, fase $(grep -c '^## Fase' "$d/todo.md")"; done`

**Modul selesai: 5/11** · Item: 204/345

| #   | Modul                    | Fase | Item  | Status         |
| --- | ------------------------ | ---- | ----- | -------------- |
| 00  | Regions (master wilayah) | 5/6  | 22/24 | 🔄 fungsional selesai — 2 item nunggu modul 02/08 (integrasi) |
| 01  | Authentication           | 8/8  | 53/53 | ✅ selesai — diverifikasi end-to-end (register/login/refresh/logout/me, role guard, status suspended, Swagger, logging, e2e+unit test) |
| 02  | Customers                | 6/6  | 36/36 | ✅ selesai — profil+alamat+wholesale diverifikasi e2e (20 test), fix FK `reviewed_by` SET NULL, fix `pnpm test:e2e` chaining |
| 03  | Catalog                  | 7/7  | 40/40 | ✅ selesai — produk polimorfik (bean/machine/grinder) + master data (brand/origin/category) diverifikasi e2e (34 test), kode BEN-/MCH-/GRD-, SKU varian auto-generate, fix dok slug brand (409→auto-suffix) |
| 04  | Inventory                | 7/7  | 27/27 | ✅ selesai — stok biji (quantity/reserved) + unit equipment ber-serial + audit stock_movements, diverifikasi e2e (24 test, termasuk reserve/release/commit lewat DI), `refOrderId` tanpa FK dulu (tabel orders belum ada) |
| 05  | Pricing                  | 7/7  | 26/26 | ✅ selesai — harga retail+wholesale tier+promo code diverifikasi e2e (30 test), `JwtAuthGuard` diperluas dgn soft-auth utk `GET /pricing/resolve` publik, fix `@HttpCode(200)` promo/validate |
| 06  | Orders                   | 0/7  | 0/30 | ⬜ belum mulai |
| 07  | Payments                 | 0/7  | 0/30 | ⬜ belum mulai |
| 08  | Delivery                 | 0/7  | 0/38 | ⬜ belum mulai |
| 09  | Service Desk             | 0/7  | 0/24 | ⬜ belum mulai |
| 10  | Content                  | 0/6  | 0/19 | ⬜ belum mulai |

Status: ⬜ belum mulai · 🔄 dikerjakan (sebut fase-nya) · ✅ selesai

### Infrastruktur (sudah beres)

- [x] Scaffold NestJS + semua module skeleton (via Nest CLI)
- [x] PostgreSQL + Drizzle terpasang (`DRIZZLE` token, barrel `src/database/schema.ts`, drizzle-kit)
- [x] Docs lengkap 11 modul (plan / todo / api-contract) + `_conventions.md`
- [x] Postgres lokal via Docker Compose (`docker-compose.yml`, `pnpm db:up`/`db:down`)
- [x] Master wilayah Indonesia ter-seed penuh (38 provinsi, 514 kab/kota, 7.285 kecamatan, 83.762 desa + kode pos) — sumber `cahyadsn/wilayah` + `wilayah_kodepos`, skrip `pnpm db:seed:regions`
- [x] Auth siap dipakai modul lain: `JwtAuthGuard` + `RolesGuard` **global** (semua endpoint butuh login kecuali `@Public()`), `@CurrentUser()`, `@Roles('staff','admin')`. **Penting untuk modul berikutnya**: endpoint publik WAJIB `@Public()` eksplisit, kalau lupa → 401.
- [x] Logging structured (Pino) terpasang global — modul lain tinggal pakai `new Logger(ClassName.name)` biasa, otomatis terstruktur + redacted (lihat [konvensi §17](docs/_conventions.md))
- [x] Infra e2e test siap pakai: `pnpm test:e2e` (DB terpisah `roastery_test`, auto-provision/migrate/seed via `test:e2e:setup`). Tiap modul **wajib** bikin `test/<modul>.e2e-spec.ts` (lihat [konvensi §18](docs/_conventions.md))

### Keputusan pending

- [ ] Pilih payment gateway (Midtrans / Xendit) — dibutuhkan modul 07 Fase 0
- [ ] **Backlog penting (setelah MVP):** ulasan/review produk — belum ada di docs modul mana pun

> Keputusan 2026-07-09 (final, sudah dipropagate ke docs): ID = uuid internal + **kode publik ber-sequence** (BEN-/CUS-/ORD-/DLV- dst — registry & helper di [_conventions.md §16](docs/_conventions.md)); ongkir luar zona = flat (zona fallback, tarif disamakan dalam kota); COD tanpa batas nominal; pickup + COD + resi manual masuk scope (lihat section "Update Desain — 2026-07-09" di plan modul 02/03/05/06/07/08/09).

## Perintah penting

```bash
cd roastery-service
pnpm db:up             # nyalakan Postgres (docker compose, image postgres:16-alpine)
pnpm db:down           # matikan Postgres
pnpm start:dev          # jalankan API (port 3000, prefix /api)
pnpm build              # cek kompilasi
pnpm db:generate        # generate migration dari schema
pnpm db:migrate         # apply migration
pnpm db:studio          # GUI database
pnpm test                # unit test (guard/logic murni, cepat, tanpa DB)
pnpm test:e2e            # e2e test — auto provision+migrate+seed DB roastery_test, lalu jalan
```

Postgres lokal jalan via **Docker Compose** (`roastery-service/docker-compose.yml`), kredensial sama dengan `.env` (`postgres:postgres@localhost:5432/roastery`). Jalankan `pnpm db:up` sebelum `start:dev` atau `db:migrate`.

Database test (`roastery_test`) terpisah dari dev (`roastery`) — `pnpm test:e2e` otomatis siapkan sendiri lewat `test:e2e:setup` (script `scripts/setup-test-db.sh`). Tiap modul wajib punya `test/<modul>.e2e-spec.ts`.

## Peta repo

- `roastery-service/` — API NestJS (modul di `src/modules/`, DB di `src/database/`)
- `docs/gambaran-bisnis.md` — **big picture bisnis**: aktor, kemampuan tiap aplikasi (CMS/Storefront/Driver), alur end-to-end A–G — baca ini paling awal
- `docs/rencana-fase.md` — overview arsitektur & fase rilis (Wave 1 MVP → 4)
- `docs/_conventions.md` — konvensi implementasi global
- `docs/NN. <Modul>/` — plan + todo + api-contract per modul
