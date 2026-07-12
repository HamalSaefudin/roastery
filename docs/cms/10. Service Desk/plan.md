# CMS 10. Service Desk — Garansi & Tiket Servis

> Kontrak: [docs/09. Service Desk/api-contract.md](../../09.%20Service%20Desk/api-contract.md). Feedback per [konvensi §5](../_conventions.md).

## Halaman

1. **Garansi** (`/service-desk/garansi`): list registrasi — WRT- (mono), serial, produk, customer, periode, badge aktif/expired (hitung dari endsAt). Aksi: **registrasi garansi manual** (staff bantu customer offline): input serial → lookup unit (harus `sold`) → tampilkan produk & masa garansi otomatis → simpan. Error jelas: serial tidak ketemu (404), unit belum sold (400), sudah teregistrasi (409) — semua pesan backend tampil.
2. **Tiket servis** (`/service-desk/tiket`): list — RPR- (mono), customer, produk/serial, StatusBadge (`open/diagnosing/in_progress/waiting_parts/completed/cancelled`), klaim garansi (badge), teknisi. Filter status (default aktif).
3. **Detail tiket** (`/service-desk/tiket/$id`): keluhan, info garansi (valid/tidak + kenapa), **timeline update** (repair_updates), panel aksi:
   - Transisi status (hanya yang valid dari status sekarang, sama seperti pola order step 08).
   - Assign teknisi (pilih user staff) — teknisi tidak valid → 404 backend kebaca.
   - Set biaya — **disabled + tooltip "Gratis — klaim garansi valid"** kalau isWarranty (mirror aturan backend 400), InputRupiah kalau berbayar.
   - Tambah catatan progres (masuk timeline).

## Keputusan UX spesifik

- Registrasi garansi: preview sebelum submit ("Serial SN-123 → Espresso Machine X — garansi 12 bulan s.d. 12 Jul 2027") — kesalahan serial mahal.
- Tiket klaim garansi tidak valid tetap bisa dibuat (aturan backend) — UI menampilkan alasan tidak valid dengan jelas saat pembuatan, bukan diam-diam jadi berbayar.
- Buat tiket dari CMS: untuk customer walk-in — pilih customer + serial/garansi opsional + keluhan.

## Verifikasi kunci

Registrasi garansi happy + 3 error case (404/400/409) tampil benar; tiket alur penuh open→…→completed dari UI; set biaya di tiket garansi → tertolak dengan pesan jelas (bukan crash); assign teknisi invalid → 404 kebaca; transisi tidak valid tidak tampil sebagai tombol; loading/sukses/error/empty terbukti.
