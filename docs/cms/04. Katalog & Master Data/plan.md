# CMS 04. Katalog & Master Data — Produk, Brand, Origin, Kategori

> Halaman CRUD pertama — **pola yang dibangun di sini jadi cetakan semua step berikutnya**. Kontrak: [docs/03. Catalog/api-contract.md](../../03.%20Catalog/api-contract.md).

## Pola halaman CRUD (berlaku juga utk step 05+)

- **List**: TanStack Table + toolbar (search, filter, tombol "+ Tambah") + pagination server-side (`?page&limit`, `keepPreviousData`). Feedback per [konvensi §5](../_conventions.md): TableSkeleton → EmptyState dengan CTA → ErrorState; refetch = data lama + indikator mini.
- **Form create/edit**: halaman sendiri (bukan modal — form produk panjang), TanStack Form + Zod yang me-mirror aturan DTO backend. Submit per matriks §5 (LoadingButton, 400→per-field, 409→toast pesan backend, sukses→toast+redirect).
- **Master data sederhana** (brand/origin/kategori): boleh dialog/sheet karena formnya pendek — tapi feedback tetap lengkap.
- **Hapus**: selalu `ConfirmDialog`; khusus master data, error 409 "Masih dipakai produk" tampilkan apa adanya.

## Halaman

1. **Produk** (`/katalog/produk`): list semua tipe (filter type/brand/kategori/status aktif, search nama). Kolom: kode (mono), nama, tipe, brand, status aktif.
2. **Form produk** — bagian dinamis per tipe (keputusan UX): pilih tipe di awal via 3 kartu (Biji/Mesin/Grinder) → field detail sesuai tipe muncul. Tipe TIDAK bisa diganti saat edit (backend juga tidak mengizinkan).
   - Biji: origin, proses, roast level, tasting notes, flag `ready_stock`/`roast_to_order`.
   - Mesin/Grinder: brand wajib, spesifikasi, `warrantyMonths`; grinder + `burrType`.
3. **Detail produk biji — varian**: tabel varian (berat×giling, SKU auto tampil read-only) + tambah/hapus varian. 409 duplikat kombinasi → toast pesan backend.
4. **Aktif/nonaktif produk**: switch di list & detail + ConfirmDialog ringan ("Produk hilang dari storefront") — sukses: toast + badge berubah.
5. **Brand / Origin / Kategori** (`/katalog/brand` dst.): list + dialog create/edit + hapus. Kategori: tampilkan hirarki parent (indentasi).

## Keputusan UX spesifik

- Slug & kode publik (BEN-…) **tidak diinput manual** — tampilkan setelah tersimpan (auto backend). Di form create tidak ada field slug.
- `coverImage`/foto produk: **belum ada upload** (belum ada infra file di backend) → field URL string dulu + preview; catat backlog upload.
- Harga & stok TIDAK di step ini (step 05/06) — di detail produk kasih link "Atur harga" / "Atur stok" yang mengarah ke halaman step terkait (placeholder "Segera" sampai step-nya jadi).

## Verifikasi kunci

CRUD penuh produk 3 tipe dari browser; varian: create + duplikat 409 kebaca; nonaktif → cek `GET /catalog/products` publik tidak memuatnya; master data: hapus yang dipakai produk → 409 tampil; semua loading/sukses/error state terbukti per matriks §5.
