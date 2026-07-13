# 05. Pricing — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup

- [x] Pastikan `catalog` selesai
- [x] Sepakati konvensi nominal (integer, rupiah bulat, `IDR`)

## Fase 1 — Schema & migration

- [x] `prices` (CHECK XOR `variant_id`/`product_id` + partial unique index masing-masing, biar `resolvePrice()` tidak ambigu)
- [x] `wholesale_tiers`
- [x] `promo_codes` + enum `promo_type`
- [x] Re-export di `src/database/schema.ts`
- [x] `pnpm db:generate` (`0006_tricky_madrox.sql`) → `pnpm db:migrate`

## Fase 2 — Scaffold file (Nest CLI)

- [x] `nest g service modules/pricing --no-spec`
- [x] `nest g controller modules/pricing --no-spec`
- [x] DTO price, tier, promo
- [x] `PricingModule` exports `PricingService` (dipakai modul Orders nanti lewat DI)

## Fase 3 — Harga retail (Fase 1 proyek)

- [x] `POST /pricing/prices` (validasi XOR app-level + DB CHECK, 404 kalau variant/produk tidak ada, 409 kalau sudah ada harga) + `PATCH /pricing/prices/:id`
- [x] `GET /pricing/resolve` (harga efektif per varian/produk) — **soft-auth**: publik tapi baca cookie kalau ada (lihat catatan `JwtAuthGuard` di bawah)
- [x] Fungsi `resolvePrice()` diekspor dari `PricingService` untuk dipakai `orders` nanti

## Fase 4 — Promo code (Fase 1 proyek)

- [x] `POST /pricing/promo-codes` + `GET /pricing/promo-codes`
- [x] `POST /pricing/promo/validate` (cek aktif, tanggal, kuota, min order — urutan sesuai plan.md) — **fix ditemukan saat testing**: default Nest POST=201, kontrak minta 200 → tambah `@HttpCode(200)` (pola sama dgn bug login/refresh di modul 01)

## Fase 5 — Wholesale tier (Fase 3 proyek)

- [x] `POST /pricing/wholesale-tiers`
- [x] Resolusi harga hormati role user (`wholesale`) + qty → pilih tier `min_quantity` terbesar yang cocok
- [x] Uji harga berbeda retail vs wholesale (termasuk qty di bawah tier manapun → tetap retail)

## Fase 6 — Verifikasi

- [x] Resolusi harga benar (retail & wholesale, tier tertinggi menang)
- [x] Promo valid/invalid sesuai aturan (semua 6 reason diuji: not_found/inactive/not_started/expired/usage_limit/min_order)
- [x] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar (`pricing`)
- [x] Tulis `test/pricing.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md (30 test)
- [x] `pnpm test:e2e` hijau (7 suite, 124 test)
- [x] `pnpm build` hijau & boot OK
- [x] Tandai selesai → lanjut `06. Orders`

### Fix ditemukan integrasi CMS (2026-07-13)

- [x] **Endpoint list yang belum ada**: modul ini awalnya cuma scope create/update per item (`POST/PATCH /pricing/prices`, `POST /pricing/wholesale-tiers`) — CMS step 06 (halaman Harga/Tier Grosir) butuh browsing semua data sekaligus, dan `GET /pricing/prices` yang dipanggil FE balikin `404` (route belum ada), bukan cuma test yang salah.
- [x] Tambah `GET /pricing/prices` (join manual ke nama/SKU varian atau produk, pola sama `describeItem` di Orders), `GET /pricing/wholesale-tiers`, `DELETE /pricing/wholesale-tiers/:id` (404 kalau tidak ada).
- [x] Fix sekalian: `listPromoCodes()` cuma select kolom parsial, FE butuh full row (`minOrder`/`maxDiscount`/`startsAt`/`endsAt`/`usageLimit`) — diubah ke full-row select.
- [x] 6 e2e baru ditambahkan (`test/pricing.e2e-spec.ts`): list prices + join, 401, list tiers ordering, delete-then-verify, delete-404, delete-403-retail. Total 36 test, `pnpm test:e2e` 232/232 hijau.
- [x] `api-contract.md` diupdate dengan 3 endpoint baru.

**Perubahan cross-module (modul 01 Auth):** `GET /pricing/resolve` butuh "opsional login" (publik, tapi kalau login sbg wholesale dapat harga wholesale). `JwtAuthGuard` diperluas: endpoint `@Public()` sekarang tetap MENCOBA verify cookie (soft-auth) — nempelin `request.user` kalau valid, tapi tidak pernah throw 401 di endpoint publik (cookie kosong/basi tetap lolos). 4 unit test lama tetap hijau (perilaku lama tidak berubah), + 2 unit test baru utk soft-auth. Didokumentasikan di konvensi §10.
