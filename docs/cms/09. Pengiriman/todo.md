# CMS 09. Pengiriman — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md).

## Fase 0 — Queries

- [x] `features/delivery/queries.ts` (board, assign, zones, drivers, vehicles, cod)
- [x] Picker kecamatan reusable (`components/shared/district-picker.tsx` — search async `GET /regions/search?level=district` → multi-select chip removable)

## Fase 1 — Master pengiriman

- [x] Kendaraan: CRUD + plat uppercase otomatis + 409 duplikat kebaca (endpoint sudah ada dari modul backend 08)
- [x] Driver: list + registrasi (user role driver + kendaraan) + toggle available; catat backlog "UI admin buat akun user" (tertulis eksplisit di deskripsi dialog registrasi)
- [x] Zona: list (badge fallback) + create/edit dgn picker kecamatan + tarif InputRupiah; fallback tidak bisa dihapus (tidak ada endpoint delete zona sama sekali di backend — hanya create/update, jadi tidak relevan)

## Fase 2 — Papan dispatch

- [x] Board default `pending` (`Belum di-assign`) + filter status lain, tanda COD mencolok (badge kuning + nominal), auto-refetch 30 dtk
- [x] Dialog assign: driver available saja bisa diklik (yang off `disabled` + label "Sedang off"), tampil kendaraan & beban aktif (`activeJobs`)
- [x] Sukses assign → toast + badge; 409 (driver tidak available) kebaca — diverifikasi backend e2e (`delivery.e2e-spec.ts`)

## Fase 3 — Setoran COD

- [x] Halaman per driver (pilih driver dulu): saldo + rincian delivery penyusun saldo
- [x] Terima setoran: `ConfirmDialog` (bukan input nominal manual — backend `createCodSettlement` HITUNG nominal sendiri dari delivery collected-belum-settled, client tidak kirim amount) → `POST cod-settlements` → toast; confirm terpisah (`PATCH .../confirm`) → toast + saldo 0
- [x] Riwayat settlement (STL- mono, status via StatusBadge `settlement`, waktu)

## Fase 4 — Verifikasi

- [x] Assign dari UI → diverifikasi live (order COD asli dibuat via curl, driver+kendaraan+zona dibuat via UI, assign via dialog → toast + badge `Ditugaskan` + delivery hilang dari filter "Belum di-assign")
- [x] Alur driver (accept→picked_up→cod-collect→delivered) & settlement→confirm→saldo 0 — dicakup backend e2e (`delivery.e2e-spec.ts`, 31 test, jalur ini sudah diuji end-to-end lewat curl saat modul backend 08 dibangun)
- [x] Zona dari UI → dicek langsung di DB (`delivery_zones.district_codes`) cocok dgn kecamatan yg dipilih picker; fee resolve sudah dicakup backend e2e
- [x] Loading/sukses/error/empty semua halaman terbukti (EmptyState tiap halaman diverifikasi live dgn dev DB kosong)
- [x] `pnpm build` + `pnpm lint` + `pnpm check` hijau
- [x] Update CLAUDE.md + commit

### Fix ditemukan integrasi step 09 (2026-07-15/16)

- [x] **3 endpoint driver belum ada** (blocking halaman Driver & Setoran COD) — lihat modul backend 08 Delivery: `GET /delivery/drivers` (list), `PATCH /delivery/drivers/:id` (toggle availability), `GET /delivery/drivers/:driverId/cod-balance` (versi staff).
- [x] **`GET /delivery/cod-settlements` belum ada** (list riwayat) — ditambah sekalian, lihat modul backend 08.
- [x] **Bug nyata modul Orders**: `order.paymentType` enum-nya cuma `prepaid`/`invoice`, checkout COD TIDAK PERNAH mengubahnya jadi `'cod'` — kode CMS (step 08, dibangun sebelum step 09) salah asumsi `paymentType === 'cod'` utk nampilin ikon tunai, kondisi itu selalu `false`. Ditemukan pas testing Papan Dispatch (checkout order COD asli via curl, cek response). Fix: `assembleOrder()` join ke `deliveries`, tambah field `codAmount` — lihat modul backend 06 Orders. CMS `/pesanan` (list + detail) diupdate pakai `codAmount` bukan `paymentType`.
- [x] **Bug UX nyata step 08**: panel aksi detail order tampilkan DUA tombol ("Siap Kirim" DAN "Siap Diambil") tanpa syarat `fulfillmentMethod` — backend `ORDER_TRANSITIONS` sendiri tidak membedakan, tapi plan.md eksplisit minta cuma satu sesuai jenis fulfillment. Fix: `transisiValid()` di `pesanan/$id.tsx` filter berdasarkan `order.fulfillmentMethod`.
- [x] **Bug nyata cross-cutting (bukan spesifik step 09)**: komponen `Tooltip` (dipakai step 05 Stok, halaman Biji) dirender tanpa `TooltipProvider` — `console.error` "Tooltip must be used within TooltipProvider" tiap halaman dimuat, ketahuan lewat e2e (`kumpulkanErrorConsole`) yang gagal. Fix: bungkus `AppLayout` dengan `TooltipProvider` sekali di root (bukan per-usage).
- [x] 6 e2e baru (`e2e/pengiriman.spec.ts`): sidebar+Papan Dispatch, tabel/empty state, Zona+picker, Driver+dialog, Kendaraan+dialog, Setoran COD+pilih driver. Suite CMS penuh 50/50 hijau.
