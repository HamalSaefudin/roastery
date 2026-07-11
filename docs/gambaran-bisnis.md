# Gambaran Bisnis — Roastery

> Dokumen "big picture" — baca ini dulu sebelum dokumen teknis. Menjelaskan **bisnisnya jalan seperti apa**: siapa aktornya, tiap aplikasi bisa apa, dan bagaimana satu aksi mengalir dari CMS → Storefront → Driver App. Detail teknis per modul ada di folder `NN. <Modul>/`.

---

## 1. Bisnisnya apa?

Sebuah **roastery kopi** (usaha sangrai kopi) yang menjual:

| Barang             | Sifat                                                                                                                          | Contoh                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| **Biji kopi**      | Consumable, dibeli berulang. Dijual per varian **berat** (250g/500g/1kg) × **pilihan giling** (whole bean, espresso, V60, dst) | Ethiopia Yirgacheffe 250g whole bean |
| **Mesin espresso** | Barang mahal, ber-**nomor seri**, bergaransi                                                                                   | Rocket Appartamento                  |
| **Grinder**        | Ber-nomor seri, bergaransi                                                                                                     | Fellow Ode Gen 2                     |

Pembelinya dua jenis:

- **Retail** — konsumen rumahan, beli lewat toko online, bayar langsung.
- **Wholesale** — kafe/kantor/reseller, beli grosir dengan **harga tier** (lebih murah kalau qty besar), bisa bayar **invoice/tempo**. Harus **di-approve dulu** oleh staff sebelum dapat harga grosir.

Yang bikin beda dari toko online biasa: **pengiriman dikelola sendiri** (punya driver + kendaraan sendiri untuk area dalam kota) dan ada **after-sales** (garansi + servis mesin/grinder).

### Keputusan bisnis kunci (hasil diskusi, sudah final)

| Topik          | Keputusan                                                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Model roasting | **Campuran** — sebagian produk ready stock (roast batch rutin), sebagian **roast-to-order** (disangrai setelah order masuk, fresh, jeda 1–2 hari). Tiap produk biji punya flag-nya.  |
| Area kirim     | Dalam zona → **driver sendiri**. Luar zona → **tetap boleh checkout**, staff kirim manual via kurir eksternal (JNE dll), resi diinput manual di CMS. Tanpa integrasi API kurir dulu. |
| Pembayaran     | **Online (VA/QRIS/e-wallet via gateway)** dan **COD** (bayar tunai ke driver saat barang sampai — hanya untuk pengiriman driver sendiri). Wholesale bisa **invoice/tempo**.          |
| Pengambilan    | **Delivery ATAU pickup** — customer bisa pilih ambil sendiri di roastery (gratis ongkir).                                                                                            |
| Langganan      | Tidak ada (transaksional saja).                                                                                                                                                      |

---

## 2. Aktor & aplikasinya

```
                        ┌──────────────────────┐
                        │     SERVICE API      │
                        │  (NestJS + Postgres) │
                        └──────────┬───────────┘
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
  ┌────────┴────────┐   ┌─────────┴──────────┐   ┌────────┴────────┐
  │   STOREFRONT    │   │     CMS / ADMIN     │   │   DRIVER APP    │
  │  (web publik)   │   │   (web internal)    │   │  (PWA di HP)    │
  ├─────────────────┤   ├─────────────────────┤   ├─────────────────┤
  │ Customer retail │   │ Owner / Admin       │   │ Driver          │
  │ Customer        │   │ Staff toko/roaster  │   │                 │
  │ wholesale       │   │ Teknisi (Fase 4)    │   │                 │
  └─────────────────┘   └─────────────────────┘   └─────────────────┘
```

| Aktor                  | Pakai apa                | Perannya                                                            |
| ---------------------- | ------------------------ | ------------------------------------------------------------------- |
| **Customer retail**    | Storefront               | Belanja, bayar, lacak kiriman, klaim garansi                        |
| **Customer wholesale** | Storefront (mode grosir) | Sama + harga tier, order besar, invoice                             |
| **Admin (owner)**      | CMS                      | Semua akses: produk, harga, laporan, approve wholesale, kelola user |
| **Staff**              | CMS                      | Operasional harian: proses order, stok, dispatch, servis            |
| **Driver**             | Driver App               | Terima tugas antar, update status, terima uang COD                  |

---

## 3. Apa saja yang bisa dilakukan di CMS?

CMS adalah "dapur"-nya bisnis. Menu-menunya:

### 📊 Dashboard

Ringkasan hari ini: order baru, order yang harus diproses (roasting/packing), pengiriman aktif, stok menipis, setoran COD yang belum diterima.

### 📦 Katalog (modul 03)

- Kelola **master data**: brand (Rocket, Fellow…), origin biji (Ethiopia — Yirgacheffe…), kategori.
- Buat/edit **produk**: biji (origin, proses, roast level, tasting notes, **flag ready-stock vs roast-to-order**) + varian berat×giling; mesin & grinder (spesifikasi, brand, masa garansi).
- Aktif/nonaktifkan produk → yang nonaktif hilang dari storefront.
- **Begitu produk dibuat & aktif (+ ada harga + stok), otomatis muncul di Storefront.** Tidak ada langkah "publish" terpisah.

### 🏷️ Harga & Promo (modul 05)

- Set **harga retail** per varian/produk.
- Set **tier grosir** (mis. beli ≥10 → diskon 15%).
- Buat **kode promo** (persen/potongan, masa berlaku, kuota, min. belanja).

### 📥 Stok / Inventory (modul 04)

- Stok biji per varian + ambang batas alert stok menipis.
- Daftar **unit mesin/grinder per nomor seri** (masuk barang → input serial; kejual → status berubah).
- Riwayat pergerakan stok (audit).

### 🛒 Order (modul 06)

- Papan semua order + filternya. Detail order: item, pembayaran, alamat, riwayat status.
- Gerakkan status: `dibayar → diproses (roasting/packing) → siap kirim / siap pickup`.
- Order **luar zona**: staff kirim via kurir eksternal, **input nama kurir + nomor resi manual** — resi tampil di storefront customer.
- Order **pickup**: tandai "siap diambil" → customer datang → tandai selesai.
- Batalkan order (stok balik otomatis).

### 🚚 Dispatch / Pengiriman (modul 08)

- **Papan penugasan**: daftar paket siap kirim (dalam zona) → pilih driver yang available → assign. **Tugas langsung muncul di HP driver.**
- Kelola **zona ongkir** (per kecamatan, tarif per zona), **driver**, dan **kendaraan** (plat, jenis).
- Pantau pengiriman live: posisi driver, status tiap paket.
- **Rekonsiliasi COD**: lihat uang tunai yang dibawa tiap driver, terima setoran, tandai lunas.

### 👥 Customer (modul 02)

- Daftar customer + riwayat ordernya.
- **Approve/tolak pengajuan wholesale** (lihat data usaha, NPWP) → begitu di-approve, akun itu otomatis melihat harga grosir di storefront.

### 🔧 Service Desk (modul 09, Fase 4)

- Daftar garansi teregistrasi (per nomor seri).
- Tiket servis: terima keluhan → assign teknisi → update progres (diagnosa, tunggu part, selesai) → biaya (gratis kalau garansi).

### 📝 Konten (modul 10, Fase 4)

- Tulis panduan seduh, cerita origin, blog → tampil di storefront (SEO).

---

## 4. Apa yang dilihat & dilakukan customer di Storefront?

1. **Browse** katalog: filter biji per origin/proses/roast level, mesin & grinder per brand. Produk roast-to-order diberi label _"disangrai setelah dipesan — kirim +1-2 hari"_.
2. **Detail produk**: foto, deskripsi, tasting notes, roast date (untuk ready stock), pilih varian berat & giling → masuk keranjang.
3. **Daftar/login** (cukup email+password; sesi via cookie aman).
4. **Checkout**:
   - Pilih **alamat** (form dropdown wilayah: provinsi → kota → kecamatan → kelurahan, kode pos otomatis) — atau pilih **pickup di roastery**.
   - Sistem cek zona: dalam zona → ongkir zona + pilih slot waktu; luar zona → tampil "dikirim via kurir eksternal, ongkir dikonfirmasi staff" _(atau tarif flat — lihat pertanyaan terbuka §7)_.
   - Pilih bayar: **online sekarang** (VA/QRIS/e-wallet) atau **COD** (hanya delivery dalam zona).
   - Masukkan kode promo (opsional).
5. **Setelah bayar**: halaman status order — timeline `dibayar → diroasting/dikemas → dikirim → sampai` (atau `siap diambil` untuk pickup). Untuk kiriman driver: **lacak posisi driver live**. Untuk kurir eksternal: nomor resi.
6. **Akun**: riwayat order, alamat tersimpan, pengajuan wholesale, garansi terdaftar, tiket servis.
7. **Wholesale**: setelah di-approve, harga otomatis berubah jadi harga tier + opsi bayar invoice.

---

## 5. Apa yang dilihat & dilakukan Driver di Driver App?

1. Login → set diri **available**.
2. **Tugas baru muncul** (hasil assign staff di CMS): daftar paket, alamat, slot waktu, catatan, dan **tanda COD + jumlah yang harus ditagih** kalau COD.
3. Alur per tugas: `ambil paket → berangkat (OTW) → sampai`:
   - Tiap ganti status, customer & CMS lihat perubahan real-time; posisi GPS terkirim berkala.
   - Sampai di tujuan: **foto bukti serah terima**; kalau COD → **konfirmasi terima uang tunai** (jumlah tercatat sebagai "uang di tangan driver").
   - Gagal antar (rumah kosong dll) → tandai gagal + alasan → balik ke papan dispatch untuk dijadwalkan ulang.
4. Selesai shift: **setor uang COD** ke kasir → staff konfirmasi di CMS → saldo driver kembali nol.

---

## 6. Alur end-to-end (cerita lengkap)

### Alur A — Setup awal toko (CMS)

```
Admin bikin brand/origin/kategori → bikin produk + varian + foto
→ set harga retail (+ tier grosir) → input stok (biji) / serial unit (mesin)
→ produk AKTIF ⇒ detik itu juga tampil di Storefront
```

### Alur B — Order retail dalam zona, bayar online (alur utama)

```
Customer: browse → keranjang → checkout (alamat dalam zona, slot, bayar QRIS)
   ↓ webhook gateway
Order status: DIBAYAR — muncul di CMS
   ↓ staff (kalau ada item roast-to-order: roasting dulu 1-2 hari)
Status: DIPROSES → staf packing → SIAP KIRIM → muncul di papan dispatch
   ↓ staff assign ke driver Budi
📱 HP Budi bunyi: tugas baru → ambil paket → OTW → sampai + foto bukti
   ↓
Status: TERKIRIM — customer dapat notif, bisa kasih ulasan
```

### Alur C — COD

```
Sama seperti B, tapi saat checkout pilih COD (tanpa bayar dulu)
→ order langsung DIPROSES (tanpa nunggu webhook)
→ driver antar sambil menagih Rp185.000
→ driver konfirmasi "uang diterima" di app → order LUNAS + TERKIRIM
→ akhir hari: driver setor tunai → staff konfirmasi setoran di CMS
```

### Alur D — Pickup di roastery

```
Checkout pilih "ambil sendiri" (ongkir Rp0) → bayar online
→ staff proses → status SIAP DIAMBIL → customer dapat notif berisi kode pickup
→ customer datang, sebut kode → staff serahkan + tandai SELESAI
```

### Alur E — Luar zona (kurir eksternal, manual)

```
Checkout alamat luar zona → sistem kasih tahu "via kurir eksternal"
→ bayar online (COD tidak tersedia) → staff packing
→ staff kirim lewat JNE/SiCepat, input "JNE + resi JX123..." di CMS
→ resi tampil di halaman order customer → customer lacak di situs kurir
```

### Alur F — Wholesale

```
Kafe daftar akun → ajukan wholesale (nama usaha, NPWP)
→ staff review di CMS → APPROVE
→ akun kafe otomatis lihat harga tier → order 20kg biji
→ pilih bayar INVOICE → staff terbitkan invoice (jatuh tempo 30 hari)
→ barang dikirim → kafe transfer → staff tandai invoice LUNAS
```

### Alur G — After-sales mesin (Fase 4)

```
Customer beli mesin espresso → dapat unit serial #SN-2026-0001
→ registrasi garansi di storefront (input serial) → garansi aktif 24 bulan
→ 6 bulan kemudian mesin rusak → buat tiket servis (klaim garansi)
→ staff assign teknisi → diagnosa → ganti part → SELESAI (gratis, in-warranty)
→ customer lihat progres tiket di akunnya sepanjang proses
```

---

## 7. Dampak ke desain (delta yang belum ada di docs modul)

Keputusan baru (campuran roasting, COD, pickup, luar-zona manual) — delta berikut **sudah dipropagate** (2026-07-09) ke docs modul terkait:

| Modul       | Perubahan                                                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 03 Catalog  | + kolom `fulfillment_type` (`ready_stock` \| `roast_to_order`) di `bean_details`; label & estimasi tampil di storefront                                                                                 |
| 06 Orders   | + `fulfillment_method` (`delivery` \| `pickup`); + status `ready_for_pickup`; + jalur luar zona: `shipping_method` (`internal` \| `external`), kolom kurir & resi manual; checkout: luar zona ≠ ditolak |
| 07 Payments | + metode `cod`: order COD langsung diproses tanpa menunggu webhook; status bayar di-set saat driver konfirmasi terima uang; + entitas **setoran COD driver** (rekonsiliasi)                             |
| 08 Delivery | + info COD di job driver (jumlah tagihan, konfirmasi terima uang); + `cod_settlements` (saldo driver, setor, konfirmasi staff); foto bukti serah terima                                                 |

### Pertanyaan terbuka — TERJAWAB (2026-07-09)

1. **Ongkir luar zona**: tarif **flat**, disamakan dengan tarif dalam kota untuk sekarang (belum ada SOP) — dimodelkan sebagai **zona fallback** di modul 08 yang fee-nya diset staff.
2. **Batas nominal COD**: **tidak ada batas** untuk sekarang.
3. **Ulasan produk (review)**: penting, tapi **ditunda** — masuk backlog setelah MVP (belum ada di docs modul mana pun).

> Delta tabel di atas + jawaban ini **sudah dipropagate** ke docs modul terkait (02/03/05/06/07/08/09) sebagai section "Update Desain — 2026-07-09" di tiap plan.md & "Update Kontrak" di api-contract.md. Keputusan ID: **uuid internal + kode publik ber-sequence** (BEN-/ORD-/dst) — spesifikasi lengkap di [_conventions.md §16](_conventions.md).

---

## 8. Urutan pembangunan (sudah berjalan)

Wave rilis tetap seperti [rencana-fase.md](rencana-fase.md): **W1 MVP** (jualan + kirim, dispatch-only) → **W2** Driver App → **W3** Wholesale → **W4** Service Desk & Konten. Progress per modul dilacak di [CLAUDE.md](../CLAUDE.md) root.
