# 05. Pricing — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup

- [ ] Pastikan `catalog` selesai
- [ ] Sepakati konvensi nominal (integer, rupiah bulat, `IDR`)

## Fase 1 — Schema & migration

- [ ] `prices`
- [ ] `wholesale_tiers`
- [ ] `promo_codes` + enum `promo_type`
- [ ] Re-export di `src/database/schema.ts`
- [ ] `pnpm db:generate` → `pnpm db:migrate`

## Fase 2 — Scaffold file (Nest CLI)

- [ ] `nest g service modules/pricing --no-spec`
- [ ] `nest g controller modules/pricing --no-spec`
- [ ] DTO price, tier, promo

## Fase 3 — Harga retail (Fase 1 proyek)

- [ ] `POST /pricing/prices` + `PATCH /pricing/prices/:id`
- [ ] `GET /pricing/resolve` (harga efektif per varian/produk)
- [ ] Fungsi resolusi harga dipakai `orders`

## Fase 4 — Promo code (Fase 1 proyek)

- [ ] `POST /pricing/promo-codes` + `GET /pricing/promo-codes`
- [ ] `POST /pricing/promo/validate` (cek aktif, tanggal, kuota, min order)

## Fase 5 — Wholesale tier (Fase 3 proyek)

- [ ] `POST /pricing/wholesale-tiers`
- [ ] Resolusi harga hormati `customer_type = wholesale` + qty → pilih tier
- [ ] Uji harga berbeda retail vs wholesale

## Fase 6 — Verifikasi

- [ ] Resolusi harga benar (retail & wholesale)
- [ ] Promo valid/invalid sesuai aturan
- [ ] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar
- [ ] Tulis `test/pricing.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md (lihat konvensi §18)
- [ ] `pnpm test:e2e` hijau
- [ ] `pnpm build` hijau & boot OK
- [ ] Tandai selesai → lanjut `06. Orders`
