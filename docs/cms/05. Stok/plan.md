# CMS 05. Stok — Bean Stock, Unit Equipment, Riwayat Pergerakan

> Kontrak: [docs/04. Inventory/api-contract.md](../../04.%20Inventory/api-contract.md). Pola CRUD & feedback mengikuti step 04 / [konvensi §5](../_conventions.md).

## Halaman

1. **Stok biji** (`/stok/biji`): tabel per varian — SKU (mono), produk, qty, reserved, **available** (qty−reserved, dihitung FE utk display), ambang alert, badge "menipis" merah bila ≤ ambang. Filter `lowStock`. Aksi per baris: **sesuaikan stok** (dialog: qty baru/penyesuaian + alasan wajib `purchase/adjustment/return`) — sukses: toast + angka baris berubah.
2. **Unit equipment** (`/stok/unit`): tabel unit ber-serial — serial (mono), produk, status (`in_stock/reserved/sold/defective` via StatusBadge). Aksi: input unit baru (pilih produk mesin/grinder + serial; 409 duplikat serial kebaca), tandai `defective` (ConfirmDialog).
3. **Riwayat pergerakan** (`/stok/riwayat`): tabel `stock_movements` read-only — waktu, item, perubahan (+/− berwarna), alasan, ref order (link ke detail order bila ada). Filter per varian/unit/alasan. Ini halaman audit — TIDAK ada aksi.

## Keputusan UX spesifik

- Penyesuaian stok menampilkan preview: "Stok: 50 → **65** (+15)" sebelum submit — angka salah ketik itu mahal di inventory.
- `reserved` TIDAK bisa diedit manual dari CMS (hanya sistem order) — tampil read-only, beri tooltip penjelasan.
- Riwayat = sumber kebenaran kalau staff bingung "kok stok segini" → dari baris stok ada link "lihat riwayat varian ini" (filter terpasang).

## Verifikasi kunci

Sesuaikan stok → toast + baris berubah + muncul di riwayat; input unit duplikat serial → 409 kebaca; buat order di storefront-simulasi (curl) → reserved naik terlihat setelah refetch; filter lowStock benar; semua state loading/sukses/error/empty terbukti.
