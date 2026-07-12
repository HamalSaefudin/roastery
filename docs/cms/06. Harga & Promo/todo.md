# CMS 06. Harga & Promo — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md).

## Fase 0 — Fondasi

- [ ] `features/pricing/queries.ts`
- [ ] Komponen `InputRupiah` (format ribuan saat ketik, nilai integer) — reusable
- [ ] Combobox item async (search varian/produk, loading di dropdown, empty "tidak ditemukan")

## Fase 1 — Harga retail

- [ ] Tabel harga + dialog set/edit (pemilih item async + InputRupiah)
- [ ] 409 duplikat item → toast pesan backend; sukses → toast + baris update

## Fase 2 — Tier grosir

- [ ] Tabel tier + create/edit/hapus (min qty, diskon %) + preview kalkulasi harga per pcs
- [ ] Validasi client: persen 1–100, min qty ≥ 2

## Fase 3 — Kode promo

- [ ] List promo (kode mono, badge aktif/expired/kuota ≥80% peringatan, kuota terpakai)
- [ ] Form create/edit: tipe persen/fixed, max diskon, min belanja, date-range (validasi mulai<akhir), kuota
- [ ] Switch aktif/nonaktif + ConfirmDialog ringan

## Fase 4 — Verifikasi

- [ ] `GET /pricing/resolve` (curl) mengembalikan harga/tier yang diset dari UI
- [ ] Promo yang dibuat tervalidasi benar via `promo/validate` (minimal: valid, expired, min belanja kurang)
- [ ] Loading/sukses/error/empty semua halaman terbukti
- [ ] `pnpm build` + `pnpm lint` + `pnpm check` hijau
- [ ] Update CLAUDE.md + commit
