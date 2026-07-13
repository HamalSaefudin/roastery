# CMS 07. Pelanggan & Wholesale — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md).

## Fase 0 — Queries

- [x] `features/customers/queries.ts` (list, detail, wholesale applications, review)

## Fase 1 — List & detail pelanggan

- [x] List customer (kode mono, tipe badge, search)
- [x] Detail: profil + ringkasan (data order + wholesale — segera tersedia)

## Fase 2 — Approval wholesale

- [x] List pengajuan (default filter `pending`) + data usaha/NPWP
- [x] Approve: ConfirmDialog menyebut nama usaha → toast + badge + tipe berubah
- [x] Reject: dialog alasan wajib (textarea, min 10 karakter) → toast + badge
- [x] Sudah direview: aksi hilang, tampil reviewer
- [ ] Review ulang → 409 kebaca — butuh backend
- [ ] Badge count pending di item sidebar Pelanggan — butuh dashboard query

## Fase 3 — Verifikasi

- [ ] Approve dari UI → customer terkait dapat harga wholesale (cek via curl resolve)
- [ ] Race dua tab review → 409 tampil di tab kedua
- [ ] Loading/sukses/error/empty semua halaman terbukti
- [x] `pnpm build` + `pnpm lint` + `pnpm check` hijau — ✅
- [x] E2E Playwright: daftar pelanggan (search, tabel) + pengajuan wholesale (filter, tabel)
- [ ] Update CLAUDE.md + commit
