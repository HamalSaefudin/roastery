# CMS 11. Konten — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md).

## Fase 0 — Cek gap backend

- [ ] Cek api-contract modul 10: ada endpoint list admin (termasuk draft)? Kalau tidak → tambah `GET /content/admin` di backend (staff/admin, semua status, + e2e test) sebelum lanjut

## Fase 1 — List & editor

- [ ] `features/content/queries.ts`
- [ ] List artikel (badge tipe & status, filter, search)
- [ ] Editor: judul/tipe/excerpt/body markdown + preview side-by-side/cover URL preview/tags chip
- [ ] Dua tombol jelas: "Simpan draft" & "Publish" (LoadingButton masing-masing)
- [ ] Guard unsaved changes (router block + beforeunload)

## Fase 2 — Publish & hapus

- [ ] Publish/unpublish dari list & editor; publishedAt tampil + tooltip "tidak berubah saat republish"
- [ ] Hapus artikel (ConfirmDialog menyebut dampak storefront)

## Fase 3 — Verifikasi

- [ ] Draft tidak tampil publik (curl) → publish → tampil; republish → publishedAt tetap
- [ ] Duplikat judul → slug -2 tampil (bukan error)
- [ ] Guard unsaved changes terbukti
- [ ] Loading/sukses/error/empty semua halaman terbukti
- [ ] `pnpm build` + `pnpm lint` + `pnpm check` hijau
- [ ] Update CLAUDE.md (CMS MVP lengkap) + commit
