# Roastery — Panduan Proyek

> Ini sumber tunggal status progress proyek. Aturan kerja prosedural (dipakai lintas tool AI — Cursor, OpenCode, dll.) ada di [AGENTS.md](AGENTS.md); isinya merujuk balik ke sini utk progress, jadi update DI SINI saat checklist berubah, jangan di AGENTS.md.

Platform e-commerce + operasional untuk **roastery kopi**: jual biji kopi, mesin espresso, grinder; pengiriman dikelola sendiri (driver in-house); melayani retail & wholesale.

**Arsitektur:** 1 Service API (**NestJS 11 + PostgreSQL + Drizzle**, di `roastery-service/`) + 3 client TanStack Start (CMS/Admin di `roastery-cms/` 🔄 dikerjakan; Storefront & Driver App belum dibuat). Repo = **pnpm workspace** (lockfile tunggal di root).

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

**Backend: modul selesai 11/11** · Item: 370/370 — semua modul backend rencana selesai & terverifikasi

**Frontend CMS (`roastery-cms/`, docs di `docs/cms/`):**

| Step | Nama | Status |
| ---- | ---- | ------ |
| 00 | Setup — workspace, scaffold & fondasi | ✅ selesai — pnpm workspace (backend tetap hijau 224 e2e), scaffold via `npx @tanstack/cli create` (Start+shadcn+Query+Table+Form), port dev 3001, types API ter-generate dari Swagger (`pnpm generate:api`) |
| — | Design system | ✅ dipilih user: **Dark Roast** (dark default + light mode; Space Grotesk/Inter/JetBrains Mono, aksen emas crema) — token & referensi di [docs/cms/design system/](docs/cms/design%20system/README.md) |
| — | Docs & konvensi CMS | ✅ [\_conventions.md](docs/cms/_conventions.md) (WAJIB: matriks feedback loading/sukses/error tiap interaksi) + plan/todo step 01–11 |
| 01 | Fondasi UI (token, toast, komponen feedback) | ✅ selesai — token Dark Roast → shadcn vars (dark default + light), font self-host, toggle tema anti-FOUC, openapi-fetch client + `getErrorMessage`, toast helper, LoadingButton/Skeleton/Empty/Error/ConfirmDialog/StatusBadge(15 enum)/PageHeader, kitchen-sink dev-only diverifikasi visual (fix: sonner tanpa next-themes, `suppressHydrationWarning`) |
| 02 | Auth & Sesi (login, guard, logout) | ✅ selesai — login (TanStack Form+Zod, error inline), guard `_auth.tsx` (role staff/admin only), logout, interceptor 401 refresh-retry, 18 e2e Playwright (backend :3000 wajib nyala). Fix bug nyata: SSR tidak neruskan cookie (pakai `createServerOnlyFn`+`getRequestHeader`), paket nyasar `/Users/macbook/node_modules` bikin bundle client rusak (fix: `@tanstack/router-core` jadi dependency eksplisit) |
| 03 | Layout & Dashboard | ✅ selesai — layout shell (sidebar collapsible + topbar breadcrumb + theme toggle + user menu), 17 route files (termasuk nested katalog/pengiriman/service-desk), dashboard 5 kartu ringkasan (order baru, perlu diproses, pengiriman aktif, wholesale pending, stok menipis) — error per-kartu independen, placeholder "Segera" utk menu non-built, 403/404 pages, PageSkeleton defaultPendingComponent, CatchBoundary error boundary di konten area. e2e Playwright gagal lokal karena browser extensions (Grammarly) flooding console — perlu di CI |
| 04 | Katalog & Master Data | ✅ selesai — DataTable reusable (TanStack Table + toolbar + pagination server-side + Skeleton/Empty/Error), master data Brand/Origin/Kategori (list + dialog CRUD + hapus + 409), produk list (filter type/brand/kategori + search + pagination), form create (pilih tipe 3 kartu → field dinamis per tipe) & edit (tipe terkunci), detail produk + varian biji (tambah dialog) + status toggle (ConfirmDialog) — typecheck/lint/check hijau |
| 05 | Stok | ✅ selesai — sidebar sub-menu (Biji/Unit/Riwayat), stok biji (tabel per varian + reserved tooltip + stok menipis badge + penyesuaian dialog preview), unit equipment (tabel serial + filter status + input unit baru + tandai defective ConfirmDialog), riwayat stok read-only + perubahan berwarna — typecheck/lint/check hijau, e2e diverifikasi 2026-07-13 (lihat catatan step 06) |
| 06 | Harga & Promo | ✅ selesai — sidebar sub-menu (Harga/Tier/Promo), harga retail (tabel DataTable + dialog set price + InputRupiah), tier grosir (tabel + create/hapus + preview kalkulasi), kode promo (tabel + form create + status badge dengan masa berlaku) — typecheck/lint/check/build hijau. Fix 2026-07-13: `GET /pricing/prices` 404 nyata (endpoint belum ada di backend) → 3 endpoint baru ditambah (lihat modul backend 05 Pricing). Playwright seluruh suite CMS (38 test, 6 spec file) diperbaiki & 38/38 hijau — bug test murni: sidebar grup adalah `<button>` bukan `<Link>` (helper `navigasiSidebar`), dialog create/edit cuma punya ikon X close bawaan shadcn (bukan tombol "Batal" — itu cuma di `ConfirmDialog`), locator ambigu (label field = header tabel, atau tombol duplikat PageHeader+EmptyState saat dev DB kosong), asumsi toast logout yang sebenarnya tidak ada di UI. Juga fix `.prettierignore` (baris `yarn.lock`+`schema.d.ts` ke-merge jadi 1 pattern invalid krn kurang newline — `schema.d.ts` generated tidak pernah ke-exclude prettier) |
| 07 | Pelanggan & Wholesale | ⬜ belum mulai |
| 08 | Pesanan | ⬜ belum mulai |
| 09 | Pengiriman | ⬜ belum mulai |
| 10 | Service Desk | ⬜ belum mulai |
| 11 | Konten | ⬜ belum mulai — step CMS terakhir (MVP CMS lengkap) |

| #   | Modul                    | Fase | Item  | Status         |
| --- | ------------------------ | ---- | ----- | -------------- |
| 00  | Regions (master wilayah) | 6/6  | 24/24 | ✅ selesai — 2 item integrasi (customers/delivery pakai kode wilayah) dicentang balik setelah modul 02/08 terverifikasi |
| 01  | Authentication           | 8/8  | 53/53 | ✅ selesai — diverifikasi end-to-end (register/login/refresh/logout/me, role guard, status suspended, Swagger, logging, e2e+unit test) |
| 02  | Customers                | 6/6  | 36/36 | ✅ selesai — profil+alamat+wholesale diverifikasi e2e (20 test), fix FK `reviewed_by` SET NULL, fix `pnpm test:e2e` chaining |
| 03  | Catalog                  | 7/7  | 40/40 | ✅ selesai — produk polimorfik (bean/machine/grinder) + master data (brand/origin/category) diverifikasi e2e (34 test), kode BEN-/MCH-/GRD-, SKU varian auto-generate, fix dok slug brand (409→auto-suffix) |
| 04  | Inventory                | 7/7  | 27/27 | ✅ selesai — stok biji (quantity/reserved) + unit equipment ber-serial + audit stock_movements, diverifikasi e2e (24 test, termasuk reserve/release/commit lewat DI), `refOrderId` tanpa FK dulu (tabel orders belum ada) |
| 05  | Pricing                  | 7/7  | 31/31 | ✅ selesai — harga retail+wholesale tier+promo code diverifikasi e2e (36 test), `JwtAuthGuard` diperluas dgn soft-auth utk `GET /pricing/resolve` publik, fix `@HttpCode(200)` promo/validate. Fix 2026-07-13: tambah `GET /pricing/prices`+`GET /pricing/wholesale-tiers`+`DELETE /pricing/wholesale-tiers/:id` (endpoint list belum ada, ditemukan dari integrasi CMS step 06 — FE 404 nyata bukan bug test), `listPromoCodes()` full-row select |
| 06  | Orders                   | 7/7  | 37/37 | ✅ selesai — cart+checkout (online/COD/pickup/luar-zona/wholesale) diverifikasi e2e (26 test), commit stok saat `delivered` (keputusan implementasi, plan.md tak eksplisit). Fix 2026-07-13: `status` filter `/orders`+`/orders/admin` dukung multi-nilai dipisah koma (bug ditemukan dari integrasi dashboard CMS — 500 mentah jadi 400 bersih) |
| 07  | Payments                 | 7/7  | 34/34 | ✅ selesai — checkout/webhook/refund/invoice diverifikasi e2e (20 test), provider mock di belakang interface `PaymentProvider` (Midtrans target real, belum ada kredensial), job `overdue` invoice via `@nestjs/schedule` cron |
| 08  | Delivery                 | 7/7  | 43/43 | ✅ selesai — zona+dispatch+driver app+COD settlement diverifikasi e2e (26 test), fix bug atomicity lintas-service (transaksi tak lengkap) + fix duplikat plat kendaraan (500→409) |
| 09  | Service Desk             | 7/7  | 26/26 | ✅ selesai — registrasi garansi (nomor seri, masa berlaku dari warrantyMonths) + tiket reparasi (klaim garansi/berbayar) diverifikasi e2e (17 test), fix FK violation mentah (500→404) saat assign teknisi tidak valid |
| 10  | Content                  | 6/6  | 19/19 | ✅ selesai — CMS artikel (brew guide/blog/origin story/page) diverifikasi e2e (13 test), slug auto dari title, publish/unpublish jaga `published_at` tetap (tidak reset saat republish) |

Status: ⬜ belum mulai · 🔄 dikerjakan (sebut fase-nya) · ✅ selesai

### Infrastruktur (sudah beres)

- [x] Scaffold NestJS + semua module skeleton (via Nest CLI)
- [x] PostgreSQL + Drizzle terpasang (`DRIZZLE` token, barrel `src/database/schema.ts`, drizzle-kit)
- [x] Docs lengkap 11 modul (plan / todo / api-contract) + `_conventions.md`
- [x] Postgres lokal via Docker Compose (`docker-compose.yml`, `pnpm db:up`/`db:down`)
- [x] Master wilayah Indonesia ter-seed penuh (38 provinsi, 514 kab/kota, 7.285 kecamatan, 83.762 desa + kode pos) — sumber `cahyadsn/wilayah` + `wilayah_kodepos`, skrip `pnpm db:seed:regions`
- [x] Data referensi katalog ter-seed (brand mesin/grinder, origin biji, kategori) — skrip idempoten `pnpm db:seed:catalog` (`roastery-service/scripts/seed-catalog-master.ts`), dibutuhkan supaya dropdown form produk CMS tidak kosong
- [x] Auth siap dipakai modul lain: `JwtAuthGuard` + `RolesGuard` **global** (semua endpoint butuh login kecuali `@Public()`), `@CurrentUser()`, `@Roles('staff','admin')`. **Penting untuk modul berikutnya**: endpoint publik WAJIB `@Public()` eksplisit, kalau lupa → 401.
- [x] Logging structured (Pino) terpasang global — modul lain tinggal pakai `new Logger(ClassName.name)` biasa, otomatis terstruktur + redacted (lihat [konvensi §17](docs/_conventions.md))
- [x] Infra e2e test siap pakai: `pnpm test:e2e` (DB terpisah `roastery_test`, auto-provision/migrate/seed via `test:e2e:setup`). Tiap modul **wajib** bikin `test/<modul>.e2e-spec.ts` (lihat [konvensi §18](docs/_conventions.md))

### Keputusan pending

- [ ] **Backlog penting (setelah MVP):** ulasan/review produk — belum ada di docs modul mana pun

> Keputusan 2026-07-12: payment gateway = **Midtrans** (target real-world, kandidat paling umum Indonesia) dipilih otonom saat kredensial sandbox belum ada — modul 07 dibangun provider-agnostic (`PaymentProvider` interface + `MockPaymentProvider`), tinggal ganti binding begitu kredensial Midtrans tersedia.

> Keputusan 2026-07-12: infra cron ditambahkan — **`@nestjs/schedule`** (`ScheduleModule.forRoot()` di `app.module.ts`), in-process, tanpa dependency infra eksternal. Konsumen pertama: `PaymentsService.markOverdueInvoices()` (modul 07, `@Cron(CronExpression.EVERY_DAY_AT_1AM)`). Modul lain yang butuh scheduled job cukup pakai `@Cron`/`@Interval` langsung di service-nya, infra sudah siap dipakai bersama.

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

```bash
cd roastery-cms
pnpm dev                 # dev server CMS (port 3001 — CORS backend sudah mengarah ke sini)
pnpm typecheck           # tsc --noEmit (WAJIB — vite build TIDAK type-check)
pnpm build               # build produksi
pnpm lint                # eslint
pnpm check               # prettier --check
pnpm test                # unit test vitest (helper murni)
pnpm test:e2e            # e2e Playwright (auto-start dev server; spec ber-API butuh backend :3000)
pnpm generate:api        # regenerate types dari Swagger backend (backend harus nyala di :3000)
```

> Install dependency dari **root repo** (`pnpm install`) — ini pnpm workspace, lockfile tunggal di root.

Postgres lokal jalan via **Docker Compose** (`roastery-service/docker-compose.yml`), kredensial sama dengan `.env` (`postgres:postgres@localhost:5432/roastery`). Jalankan `pnpm db:up` sebelum `start:dev` atau `db:migrate`.

Database test (`roastery_test`) terpisah dari dev (`roastery`) — `pnpm test:e2e` otomatis siapkan sendiri lewat `test:e2e:setup` (script `scripts/setup-test-db.sh`). Tiap modul wajib punya `test/<modul>.e2e-spec.ts`.

## Peta repo

- `roastery-service/` — API NestJS (modul di `src/modules/`, DB di `src/database/`)
- `roastery-cms/` — CMS/Admin (TanStack Start + shadcn/ui + TanStack Query/Table/Form; types API di-generate ke `src/lib/api/schema.d.ts`)
- `docs/gambaran-bisnis.md` — **big picture bisnis**: aktor, kemampuan tiap aplikasi (CMS/Storefront/Driver), alur end-to-end A–G — baca ini paling awal
- `docs/rencana-fase.md` — overview arsitektur & fase rilis (Wave 1 MVP → 4)
- `docs/_conventions.md` — konvensi implementasi global (backend)
- `docs/NN. <Modul>/` — plan + todo + api-contract per modul backend
- `docs/cms/NN. <Step>/` — plan + todo per step frontend CMS
