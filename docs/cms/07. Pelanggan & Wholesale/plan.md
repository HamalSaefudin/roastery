# CMS 07. Pelanggan & Wholesale — Daftar Customer + Approval Grosir

> Kontrak: [docs/02. Customers/api-contract.md](../../02.%20Customers/api-contract.md). Pola & feedback per [konvensi §5](../_conventions.md).

## Halaman

1. **Pelanggan** (`/pelanggan`): list customer — kode CUS- (mono), nama, email, tipe (retail/wholesale via StatusBadge), tanggal daftar. Search nama/email/kode.
2. **Detail pelanggan** (`/pelanggan/$id`): profil + alamat-alamat (read-only — alamat milik customer, CMS tidak mengedit) + **riwayat order** customer itu (tabel ringkas, link ke detail order step 08) + status/riwayat pengajuan wholesale-nya.
3. **Pengajuan wholesale** (`/pelanggan/wholesale`): list pengajuan (filter status, default `pending`) — data usaha, NPWP, tanggal. Aksi review:
   - **Approve**: ConfirmDialog "Akun ini akan langsung melihat harga grosir di storefront" → sukses: toast + badge `approved` + tipe customer berubah.
   - **Reject**: dialog WAJIB isi alasan (dikirim ke backend) → toast + badge `rejected`.
   - Pengajuan sudah direview → tombol aksi hilang, tampil siapa reviewer & kapan; coba review ulang (race dua staff) → 409 backend kebaca di toast.

## Keputusan UX spesifik

- Approval = keputusan bisnis penting → ConfirmDialog menyebut **nama usaha** yang di-approve, bukan generik.
- Badge `pending` di sidebar menu "Pelanggan" (count dari dashboard query) supaya pengajuan tidak kelewat.
- Detail pelanggan menjadi pola halaman "detail + tab/section" — dipakai lagi di step 08 (detail order).

## Verifikasi kunci

Approve dari UI → login sebagai customer itu via curl → `GET /pricing/resolve` balikin harga wholesale; reject dengan alasan tampil di riwayat; dua tab CMS me-review pengajuan sama → yang kedua dapat 409 kebaca; loading/sukses/error/empty terbukti.
