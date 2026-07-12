# CMS 06. Harga & Promo — Harga Retail, Tier Grosir, Kode Promo

> Kontrak: [docs/05. Pricing/api-contract.md](../../05.%20Pricing/api-contract.md). Pola & feedback per step 04 / [konvensi §5](../_conventions.md).

## Halaman

1. **Harga** (`/harga`): tabel harga per item (varian biji ATAU produk equipment — XOR backend). Kolom: item (SKU/nama), harga retail (formatRupiah), status aktif. Aksi: set/edit harga (dialog), 409 duplikat item kebaca.
   - **Pemilih item** di dialog: search async varian/produk (combobox dengan loading indicator di dalam dropdown, hasil kosong = "tidak ditemukan").
2. **Tier grosir** (`/harga/tier`): tabel tier per item — min qty & diskon %. Create/edit/hapus dialog. Tampilkan preview kalkulasi: "≥10 pcs → Rp 85.000/pcs (disc 15%)".
3. **Kode promo** (`/harga/promo`): list (kode mono, tipe persen/fixed, masa berlaku, kuota terpakai/total, badge aktif/expired) + form create/edit (kode, tipe, nilai, max diskon, min belanja, periode, kuota, aktif). Nonaktifkan promo = switch + ConfirmDialog ringan.

## Keputusan UX spesifik

- Input uang pakai komponen `InputRupiah` (format ribuan saat ketik, simpan integer) — dibangun sekali di sini, dipakai step lain.
- Input persen dibatasi 1–100 client-side; periode promo pakai date-range picker; tanggal mulai > akhir → error per-field sebelum ke server.
- Promo expired/kuota habis tetap tampil di list (badge abu) — jangan disembunyikan, staff perlu riwayat.
- Kolom "kuota terpakai" (used_count/limit) — kalau mendekati habis (≥80%) badge peringatan.

## Verifikasi kunci

Set harga varian → cek `GET /pricing/resolve` publik (curl) balikin harga itu; duplikat harga utk item sama → 409 kebaca; tier: qty besar pilih tier benar (cek resolve); promo create → validasi via curl `promo/validate` semua alasan invalid (expired dll diset dari form) menghasilkan pesan yang tampil benar kalau dipakai; loading/sukses/error/empty terbukti.
