# Roastery — Rencana Fase & Deskripsi Modul

> **Untuk implementasi, WAJIB baca [\_conventions.md](_conventions.md) dulu** — berisi konvensi kode, pola Drizzle/NestJS, bentuk response/error, dan aturan kerja per fase. Tiap modul juga punya section "Aturan Implementasi" di plan.md-nya.

Dokumen ini menjelaskan **arsitektur modul** service API (NestJS) dan **timeline pengembangan** dibagi per fase. Tujuannya: setiap orang paham tiap modul buat apa, dan apa yang dibangun duluan.

Bisnis: roastery kopi yang jual **biji kopi, mesin espresso, dan grinder**, serta **mengelola pengiriman sendiri** (punya driver). Melayani **pembeli retail (konsumen)** dan **wholesale (kafe/kantor beli grosir)**. Ada juga **after-sales** (garansi + servis) untuk alat.

Sistem terdiri dari: **1 Service API (NestJS)** + **3 client (TanStack Start)**: Storefront, CMS/Admin, dan Driver App.

---

## Arsitektur Modul (Service API)

Pola: **modular monolith** — dibagi per _bounded context_. Modul infra di root, modul fitur di `src/modules/`.

```
src/
├── config/                  # konfigurasi environment
├── database/                # koneksi database / ORM
├── health/                  # health check (liveness/readiness)
└── modules/
    ├── regions/                # master wilayah Indonesia (provinsi→kelurahan)
    ├── auth/
    ├── customers/
    ├── catalog/
    │   ├── beans/
    │   ├── machines/
    │   ├── grinders/
    │   ├── brands/             # master brand
    │   ├── origins/            # master asal biji
    │   └── categories/         # master kategori
    ├── inventory/
    ├── pricing/
    ├── orders/
    ├── payments/
    ├── delivery/
    │   ├── zones/
    │   ├── dispatch/
    │   ├── drivers/
    │   └── vehicles/           # master kendaraan
    ├── service-desk/
    └── content/
```

> **Tabel master (dinormalisasi dari field text):** `regions` (wilayah, modul sendiri), `brands`/`origins`/`categories` (di catalog), `vehicles` (di delivery). Detail per modul di folder docs masing-masing. Master yang sudah ada sejak awal: `users`, `products`, `equipment_units`, `delivery_zones`.

---

## Deskripsi Tiap Modul

### Modul Infrastruktur

| Modul        | Fungsi                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **config**   | Load & validasi environment variable (DB URL, secret, dsb). Jadi sumber konfigurasi terpusat untuk seluruh app.                                                    |
| **database** | Setup koneksi **PostgreSQL** via **Drizzle ORM** (pool `pg`). Menyediakan client Drizzle (token `DRIZZLE`) ke modul lain + barrel schema `src/database/schema.ts`. |
| **health**   | Endpoint cek kesehatan service (buat monitoring/deploy) — memastikan API & DB hidup.                                                                               |

### Modul Fitur

| Modul            | Fungsi (untuk apa)                                                                                                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **auth**         | Bikin **login/logout & sesi user**. Pakai **httpOnly cookies** (token disimpan di cookie httpOnly, bukan localStorage — lebih aman dari XSS). Mengatur peran/role: retail, wholesale, staff/admin, driver. Jadi pintu masuk semua client. |
| **customers**    | Kelola **akun user yang login di client** — profil, alamat pengiriman, riwayat pesanan. Termasuk tipe customer (retail vs wholesale) dan **alur approval wholesale** (bisnis harus di-approve staff sebelum dapat harga grosir).          |
| **catalog**      | Induk dari **barang yang dijual** (kategori + hal umum produk). Membawahi 3 jenis produk yang bentuknya beda:                                                                                                                             |
| ├─ **beans**     | Biji kopi: origin/asal, proses (washed/natural/honey), roast level, tanggal roasting, tasting notes. Punya **varian SKU** = berat (250g/500g/1kg) × pilihan giling (whole bean/espresso/V60/dll).                                         |
| ├─ **machines**  | Mesin espresso: brand, spesifikasi, garansi. Barang **serialized** (tiap unit punya nomor seri) & bernilai tinggi.                                                                                                                        |
| └─ **grinders**  | Grinder: tipe burr, spesifikasi, garansi. Juga **serialized** & bergaransi (mirip machines).                                                                                                                                              |
| **inventory**    | **Atur stok barang yang muncul/tersedia** — jumlah stok per SKU (biji) & per unit serial (alat), alert stok menipis, tandai barang habis/aktif. Yang nentuin apakah produk bisa dibeli.                                                   |
| **pricing**      | Atur **harga & promo**: harga retail, **tier harga wholesale** (grosir per volume / grup customer), kode promo/diskon. Memisahkan logika harga dari katalog.                                                                              |
| **orders**       | **Keranjang → checkout → siklus pesanan.** Status pesanan: `dibuat → dibayar → roasting/packing → dikirim → selesai`. Inti transaksi.                                                                                                     |
| **payments**     | Proses **pembayaran**: integrasi payment gateway, refund/refund sebagian (penting buat alat mahal), dan **jalur invoice/tempo untuk wholesale**.                                                                                          |
| **delivery**     | Induk **logistik pengiriman in-house**. Membawahi:                                                                                                                                                                                        |
| ├─ **zones**     | Area/zona pengiriman + ongkir per zona & slot waktu.                                                                                                                                                                                      |
| ├─ **dispatch**  | **Papan penugasan** di CMS: staff assign pesanan ke driver.                                                                                                                                                                               |
| └─ **drivers**   | Profil driver, antrian job, update status kirim (`ambil → otw → sampai`), lokasi live. Dipakai Driver App.                                                                                                                                |
| **service-desk** | **After-sales** alat: registrasi **garansi** per nomor seri + **tiket servis/reparasi** (buat, assign teknisi, status, biaya, in-warranty vs berbayar), jadwal servis.                                                                    |
| **content**      | Konten marketing/edukasi: panduan seduh, cerita asal biji, blog (buat SEO & jualan). Opsional.                                                                                                                                            |

> **Keputusan teknologi:** database **PostgreSQL** + **Drizzle ORM** (driver `pg`). Migrasi via drizzle-kit (`pnpm db:generate`, `db:migrate`, `db:push`, `db:studio`). Env `DATABASE_URL` di `.env`.

---

## Timeline / Fase Pengembangan

Prinsip: **schema DB dirancang untuk mendukung semua fitur dari awal**, tapi **rilis bertahap** biar bisa jualan duluan sebelum semua selesai.

### 🟢 Fase 1 — MVP (bisa jualan & kirim)

Target: konsumen bisa **beli** dan roastery bisa **kirim**.

- **auth** — login/register (httpOnly cookies), role dasar.
- **customers** — akun retail, alamat, riwayat.
- **catalog** (beans, machines, grinders) — tampilkan barang.
- **inventory** — stok & ketersediaan.
- **orders** — keranjang, checkout, siklus pesanan.
- **payments** — bayar retail (upfront) via gateway.
- **delivery** (mode **dispatch-only**) — staff assign pesanan ke driver dari CMS, driver dikabari (SMS/WA), customer lihat status dasar. _Belum pakai driver app._
- Client: **Storefront** + **CMS/Admin**.

### 🟡 Fase 2 — Driver App & Live Tracking

Upgrade pengiriman dari dispatch-only jadi operasi driver sungguhan.

- **delivery/drivers** lengkap — driver terima job, update status, lokasi live.
- Customer-facing tracking real-time.
- Client baru: **Driver App** (mobile-first PWA).

### 🟠 Fase 3 — Wholesale (B2B)

Buka penjualan grosir ke kafe/kantor.

- **customers** — tipe wholesale + alur approval bisnis.
- **pricing** — tier harga grosir / per volume.
- **payments** — jalur invoice / tempo (net-30).
- Storefront dapat mode wholesale (harga & katalog beda setelah login bisnis).

### 🔵 Fase 4 — Service Desk & Content

Lengkapi after-sales dan konten.

- **service-desk** — registrasi garansi per nomor seri + tiket reparasi & jadwal servis.
- **content** — panduan seduh, blog, cerita origin.

---

## Ringkasan Cepat

- **Sekarang:** semua modul skeleton dibuat via Nest CLI & ter-wiring di `app.module.ts`. Database **PostgreSQL + Drizzle** sudah terpasang (config, koneksi, drizzle-kit, scripts). App boot OK.
- **Langkah berikut:** susun **data model / schema Drizzle** untuk modul Fase 1 (mulai dari auth & customers), lalu generate migrasi pertama.
