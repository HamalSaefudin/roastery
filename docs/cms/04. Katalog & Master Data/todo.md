# CMS 04. Katalog & Master Data — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md).

## Fase 0 — Fondasi pola CRUD

- [x] `DataTable` wrapper reusable (TanStack Table + toolbar + pagination server-side + integrasi TableSkeleton/EmptyState/ErrorState + indikator refetch) — dipakai semua step berikutnya
- [x] `features/katalog/queries.ts` (products, brands, origins, categories) + `features/katalog/types.ts`

## Fase 1 — Master data

- [x] List + dialog create/edit + hapus: Brand, Origin, Kategori (kategori tampil hirarki parent via indentasi Chevron)
- [x] Hapus master yang dipakai produk → 409 backend tampil di toast (ConfirmDialog + getErrorMessage)
- [x] Feedback lengkap per matriks §5 di ketiganya (skeleton → empty → error; LoadingButton; toast sukses/gagal)

## Fase 2 — Produk list & form

- [x] `/katalog` — list semua tipe, filter (type, brand, kategori), search, pagination server-side
- [x] Form create: pilih tipe via 3 kartu → field dinamis (biji: origin/proses/roast/notes/flag roast-to-order; mesin: brand+spek+garansi; grinder: +burrType)
- [x] Form edit (tipe terkunci) di `/katalog/:slug/edit`; 400/409 → toast getErrorMessage
- [x] Field foto = URL + preview (upload = backlog); tanpa field slug/kode (auto backend)

## Fase 3 — Detail, varian & status

- [x] Halaman detail produk di `/katalog/:slug` (info + kode + detail spesifik tipe)
- [x] Tabel varian biji: tambah (berat×giling, SKU tampil setelah simpan) via dialog + 409 duplikat kebaca
- [x] Switch aktif/nonaktif di detail via ConfirmDialog ringan + toast + badge berubah instan

## Fase 4 — Verifikasi

- [ ] CRUD penuh 3 tipe produk dari browser (create→edit→detail) — butuh backend running
- [ ] Nonaktifkan produk → cek endpoint publik tidak memuatnya (curl)
- [ ] Loading: TableSkeleton (first load), indikator refetch (ganti filter), LoadingButton semua form — butuh backend
- [ ] EmptyState tampil di DB kosong (filter yang tidak match) dengan CTA benar
- [x] `pnpm build` + `pnpm lint` + `pnpm check` hijau — ✅ semua pass
- [ ] Update CLAUDE.md + commit
