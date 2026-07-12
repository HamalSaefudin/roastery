# CMS 09. Pengiriman — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md).

## Fase 0 — Queries

- [ ] `features/delivery/queries.ts` (board, assign, zones, drivers, vehicles, cod)
- [ ] Picker kecamatan reusable (search async regions → multi-select chip)

## Fase 1 — Master pengiriman

- [ ] Kendaraan: CRUD + plat uppercase otomatis + 409 duplikat kebaca
- [ ] Driver: list + registrasi (user role driver + kendaraan) + toggle available; catat backlog "UI admin buat akun user"
- [ ] Zona: list (badge fallback) + create/edit dgn picker kecamatan + tarif InputRupiah; fallback tidak bisa dihapus

## Fase 2 — Papan dispatch

- [ ] Board default `pending_assignment`+aktif, tanda COD mencolok (badge + nominal), auto-refetch 30 dtk
- [ ] Dialog assign: driver available saja (yang off disabled + alasan), tampil kendaraan & beban aktif
- [ ] Sukses assign → toast + badge; 409 (sudah di-assign orang lain / status tidak valid) kebaca

## Fase 3 — Setoran COD

- [ ] Halaman per driver: saldo + rincian delivery penyusun saldo
- [ ] Terima setoran: dialog jumlah (default saldo) → create STL- → confirm → toast + saldo 0
- [ ] Riwayat settlement (STL- mono, status, waktu)

## Fase 4 — Verifikasi

- [ ] Assign dari UI → tugas muncul di `GET /delivery/driver/jobs` (curl sbg driver)
- [ ] Simulasi driver via curl (accept→picked_up→cod-collect→delivered) → papan & saldo COD ter-update
- [ ] Settlement penuh → saldo 0 cross-check psql
- [ ] Zona dari UI → `GET /delivery/fee` (curl) dapat tarif benar; luar zona dapat fallback
- [ ] Loading/sukses/error/empty semua halaman terbukti
- [ ] `pnpm build` + `pnpm lint` + `pnpm check` hijau
- [ ] Update CLAUDE.md + commit
