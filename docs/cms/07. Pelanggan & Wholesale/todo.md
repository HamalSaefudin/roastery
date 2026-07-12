# CMS 07. Pelanggan & Wholesale — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md).

## Fase 0 — Queries

- [ ] `features/customers/queries.ts` (list, detail, wholesale applications, review)

## Fase 1 — List & detail pelanggan

- [ ] List customer (kode mono, tipe badge, search)
- [ ] Detail: profil + alamat read-only + riwayat order ringkas (link detail order) + riwayat pengajuan wholesale

## Fase 2 — Approval wholesale

- [ ] List pengajuan (default filter `pending`) + data usaha/NPWP
- [ ] Approve: ConfirmDialog menyebut nama usaha → toast + badge + tipe berubah
- [ ] Reject: dialog alasan wajib → toast + badge
- [ ] Sudah direview: aksi hilang, tampil reviewer+waktu; review ulang → 409 kebaca
- [ ] Badge count pending di item sidebar Pelanggan

## Fase 3 — Verifikasi

- [ ] Approve dari UI → customer terkait dapat harga wholesale (cek via curl resolve)
- [ ] Race dua tab review → 409 tampil di tab kedua
- [ ] Loading/sukses/error/empty semua halaman terbukti
- [ ] `pnpm build` + `pnpm lint` + `pnpm check` hijau
- [ ] Update CLAUDE.md + commit
