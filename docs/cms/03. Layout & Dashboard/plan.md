# CMS 03. Layout & Dashboard — Kerangka Navigasi + Halaman Ringkasan

> Kerangka yang menaungi semua halaman fitur (step 04+). Menu mengikuti [gambaran-bisnis §3](../../gambaran-bisnis.md).

## Tujuan

1. **Layout shell**: sidebar (collapsible) + topbar (breadcrumb, toggle tema, menu user) + area konten.
2. **Dashboard** (`/`): ringkasan operasional hari ini.
3. Halaman 403 / 404 / error boundary route-level.

## Sidebar (urutan menu)

Dashboard · Pesanan · Katalog (Produk, Brand, Origin, Kategori) · Stok · Harga & Promo · Pelanggan · Pengiriman (Papan Dispatch, Zona, Driver, Kendaraan, Setoran COD) · Service Desk (Garansi, Tiket Servis) · Konten — item dengan sub-menu pakai collapsible group; item aktif ter-highlight (termasuk saat di halaman detail turunannya).

## Dashboard — kartu ringkasan

Backend **belum punya endpoint agregat statistik** — jangan bikin-bikin. Sumber data yang jujur tersedia sekarang (field `total` dari list endpoint dengan filter):

| Kartu | Sumber |
| --- | --- |
| Order baru (status `created`/`paid`) | `GET /orders/admin?status=…` → `total` |
| Perlu diproses (`processing`) | idem |
| Pengiriman aktif | `GET /delivery/board` (hitung status aktif) |
| Pengajuan wholesale pending | `GET /customers/wholesale-applications?status=pending` → `total` |
| Stok menipis | `GET /inventory/bean-stock?lowStock=true` → `total` |

> Cek param persis di api-contract modul terkait saat implementasi; kalau ada filter yang ternyata tidak tersedia, kartunya di-drop dulu + catat sebagai backlog endpoint statistik backend — JANGAN menghitung dengan mengambil semua row.

Tiap kartu klik → ke halaman list terkait dengan filter terpasang.

## Feedback (per konvensi §5)

- **Loading dashboard**: tiap kartu skeleton mandiri (angka muncul begitu query-nya selesai — jangan tunggu semua).
- **Error per kartu**: kartu itu menampilkan "—" + ikon retry kecil; kartu lain tetap jalan. TIDAK menjatuhkan seluruh dashboard.
- **Navigasi antar halaman**: `defaultPendingComponent` router = `PageSkeleton`.
- **Error boundary**: route error → `ErrorState` di area konten (sidebar tetap hidup, user tidak terjebak).

## Aturan Implementasi (WAJIB)

1. Layout = route layout `_auth` (semua halaman ber-guard menumpang di sini); `/login` di luar layout.
2. Sidebar collapsed state persist di localStorage.
3. Breadcrumb dari route hierarchy (otomatis, bukan hardcode per halaman).
4. Menu user di topbar: email + role badge + logout (perilaku logout sudah dari step 02).
5. Semua item sidebar sudah tampil sejak sekarang; yang halamannya belum dibangun → arahkan ke placeholder "Segera" (bukan 404) supaya navigasi terasa lengkap dan step berikutnya tinggal isi.

## Di luar scope

- Isi halaman fitur (step 04+), notifikasi real-time, grafik/chart (backlog — butuh endpoint agregat).

## Verifikasi kunci

Sidebar aktif-state benar di list & detail; collapse persist; breadcrumb benar 2 level; dashboard: kartu loading mandiri → angka benar (cross-check DB), satu kartu dibikin error (matikan backend sesaat) → kartu lain tetap hidup; klik kartu → list terfilter; 404 & error boundary tampil wajar.
