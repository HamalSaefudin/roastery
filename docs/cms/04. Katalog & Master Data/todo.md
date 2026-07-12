# CMS 04. Katalog & Master Data — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md).

## Fase 0 — Fondasi pola CRUD

- [ ] `DataTable` wrapper reusable (TanStack Table + toolbar + pagination server-side + integrasi TableSkeleton/EmptyState/ErrorState + indikator refetch) — dipakai semua step berikutnya
- [ ] `features/catalog/queries.ts` (products, brands, origins, categories)

## Fase 1 — Master data

- [ ] List + dialog create/edit + hapus: Brand, Origin, Kategori (kategori tampil hirarki parent)
- [ ] Hapus master yang dipakai produk → 409 backend tampil di toast
- [ ] Feedback lengkap per matriks §5 di ketiganya

## Fase 2 — Produk list & form

- [ ] `/katalog/produk` — list semua tipe, filter (type, brand, kategori, aktif), search, pagination
- [ ] Form create: pilih tipe via 3 kartu → field dinamis (biji: origin/proses/roast/notes/flag roast-to-order; mesin: brand+spek+garansi; grinder: +burrType); Zod mirror DTO backend
- [ ] Form edit (tipe terkunci); 400 validasi → error per-field; 409 → toast
- [ ] Field foto = URL + preview (upload = backlog); tanpa field slug/kode (auto backend, tampil setelah simpan)

## Fase 3 — Detail, varian & status

- [ ] Halaman detail produk (info + kode/slug + link "Atur harga"/"Atur stok" → placeholder)
- [ ] Tabel varian biji: tambah (berat×giling, SKU tampil setelah simpan) + hapus + 409 duplikat kebaca
- [ ] Switch aktif/nonaktif (list & detail) + ConfirmDialog ringan + toast + badge berubah

## Fase 4 — Verifikasi

- [ ] CRUD penuh 3 tipe produk dari browser (create→edit→detail)
- [ ] Nonaktifkan produk → cek endpoint publik tidak memuatnya (curl)
- [ ] Loading: TableSkeleton (first load), indikator refetch (ganti filter), LoadingButton semua form — dibuktikan dengan throttling
- [ ] EmptyState tampil di DB kosong (filter yang tidak match) dengan CTA benar
- [ ] `pnpm build` + `pnpm lint` + `pnpm check` hijau
- [ ] Update CLAUDE.md + commit
