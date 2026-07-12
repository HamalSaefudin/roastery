# CMS 09. Pengiriman — Dispatch Board, Zona, Driver, Kendaraan, Setoran COD

> Kontrak: [docs/08. Delivery/api-contract.md](../../08.%20Delivery/api-contract.md). Feedback per [konvensi §5](../_conventions.md).

## Halaman

1. **Papan dispatch** (`/pengiriman`): daftar delivery aktif — DLV- (mono), order, alamat ringkas, StatusBadge (`pending_assignment/assigned/picked_up/out_for_delivery/delivered/failed`), driver, **tanda COD + nominal tagih**. Filter status; default `pending_assignment` + aktif.
   - **Assign driver**: dari baris → dialog pilih driver available (tampilkan beban aktif tiap driver) → sukses: toast "Tugas terkirim ke driver X" + badge `assigned`. Driver tidak available tidak bisa dipilih (disabled + alasan).
   - Auto-refetch 30 detik (status berubah dari HP driver).
2. **Zona ongkir** (`/pengiriman/zona`): list zona (nama, tarif Rupiah, jumlah kecamatan, badge zona fallback) + form create/edit: nama, tarif (InputRupiah), **picker kecamatan** (search async regions per kab/kota → pilih multi kecamatan, chip removable). Zona fallback ditandai jelas & tarifnya bisa diedit tapi zona-nya tidak bisa dihapus.
3. **Driver** (`/pengiriman/driver`): list (nama, telepon, kendaraan, badge available/off) + registrasi driver baru (pilih user role driver + kendaraan) + toggle availability. Catatan: pembuatan USER akun driver = via register backend (belum ada UI admin buat user — backlog); CMS meregistrasi profil driver dari user yang sudah ada.
4. **Kendaraan** (`/pengiriman/kendaraan`): CRUD sederhana (plat — uppercase otomatis, jenis). 409 plat duplikat kebaca.
5. **Setoran COD** (`/pengiriman/cod`): per driver — saldo COD di tangan (dari cod-balance), tombol "Terima setoran" → dialog jumlah (default = saldo) → buat settlement STL- → **konfirmasi** (dua langkah sesuai backend: create → confirm) → toast + saldo jadi 0. Riwayat settlement tampil.

## Keputusan UX spesifik

- Papan dispatch = layar yang dipelototin staff — informasi COD harus mencolok (badge kuning + nominal), bukan teks kecil.
- Assign dialog menampilkan info yang mencegah salah pilih: kendaraan driver & jumlah tugas aktifnya.
- Live tracking posisi GPS = **belum** (butuh infra websocket/polling posisi — backlog bareng Driver App); yang ada: status per paket real-time-ish via refetch.
- Setoran COD: tampilkan rincian delivery mana saja yang menyusun saldo (transparansi rekonsiliasi).

## Verifikasi kunci

Assign → status berubah + muncul di driver jobs (curl sebagai driver); alur driver via curl (picked_up→delivered dgn cod-collect) → papan ter-update saat refetch; COD: saldo benar → settlement → confirm → saldo 0 (cross-check psql); zona: buat zona dgn kecamatan → cek fee resolve (curl) dapat tarif itu; plat duplikat 409 kebaca; fallback zone tidak bisa dihapus; loading/sukses/error/empty terbukti.
