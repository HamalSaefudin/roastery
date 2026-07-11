# 00. Regions (Master Wilayah) — Plan

Modul: `src/modules/regions`
Fase proyek: **Fase 1 (fondasi)** — dibuat lebih awal karena dipakai `customers` (alamat) & `delivery` (zona).

## Tujuan

**Master wilayah Indonesia lengkap** 4 level:
**Provinsi → Kabupaten/Kota → Kecamatan → Kelurahan/Desa.**

Dipakai untuk:

- Dropdown alamat bertingkat di client (pilih provinsi → kota → kecamatan → kelurahan).
- Mapping **zona ongkir** delivery ke kecamatan/kelurahan (lebih akurat dari sekadar kode pos).
- Sumber **kode pos** (ada di level kelurahan).

Data bersifat **referensi (di-seed)**, bukan CRUD manual.

## Ketergantungan

- `database` — Drizzle.
- `auth` (retroaktif, sejak modul 01 dibuat) — `RegionsController` ditandai `@Public()` (semua endpoint publik) karena guard global aktif; lihat [konvensi §10](../_conventions.md).
- Dipakai oleh: `customers` (`addresses`), `delivery` (`delivery_zones`).

## Sumber data (seed)

Dataset **[cahyadsn/wilayah](https://github.com/cahyadsn/wilayah)** (kode wilayah sesuai **Kepmendagri No 300.2.2-2138 Tahun 2025**, MIT license) — satu tabel flat `wilayah(kode, nama)`, level ditentukan dari jumlah titik pada `kode`: `XX` = provinsi, `XX.XX` = kab/kota, `XX.XX.XX` = kecamatan, `XX.XX.XX.XXXX` = kelurahan/desa. Kode resmi dipakai sebagai **primary key natural** (mis. `32` = Jawa Barat, `32.73` = Kota Bandung, `32.73.01` = Sukasari — sudah diverifikasi cocok).

Kode pos dari **[cahyadsn/wilayah_kodepos](https://github.com/cahyadsn/wilayah_kodepos)** (dataset sinkron, sumber sama), tabel `wilayah_kodepos(kode, kodepos)` join langsung by `kode` level kelurahan. Sudah diverifikasi: **83.762 desa/kelurahan, 100% match, 0 gap** dengan `wilayah.sql`.

File sumber di-vendor (bukan fetch runtime) di `scripts/data/wilayah.sql` + `scripts/data/wilayah_kodepos.sql` — diunduh sekali, dibaca oleh skrip seed. Verifikasi jumlah baris riil (bukan asumsi): **38 provinsi, 514 kab/kota, 7.285 kecamatan, 83.762 desa/kelurahan**.

Regency `type` (`kota`/`kabupaten`) diturunkan dari prefix `nama`: dimulai `"Kota "` → `kota`, selain itu → `kabupaten`.

## Sudah di-generate lewat Nest CLI

```bash
# sudah dijalankan:
nest g module modules/regions
nest g service modules/regions
nest g controller modules/regions
```

File manual: `regions.schema.ts`, skrip seed `src/modules/regions/seed/` (atau `scripts/seed-regions.ts`).

## Schema DB (Drizzle → Postgres)

> PK pakai **kode resmi** (text), bukan uuid — memudahkan seeding & lookup.

### tabel `provinces`

| kolom  | tipe        | keterangan            |
| ------ | ----------- | --------------------- |
| `code` | text PK     | mis. `32`             |
| `name` | text        | mis. `JAWA BARAT`     |

### enum `regency_type`: `kota` | `kabupaten`

### tabel `regencies` (kabupaten/kota)

| kolom           | tipe            | keterangan            |
| --------------- | --------------- | --------------------- |
| `code`          | text PK         | mis. `32.73`          |
| `province_code` | text FK         | → provinces           |
| `name`          | text            | mis. `KOTA BANDUNG`   |
| `type`          | `regency_type`  |                       |

### tabel `districts` (kecamatan)

| kolom          | tipe      | keterangan       |
| -------------- | --------- | ---------------- |
| `code`         | text PK   | mis. `32.73.01`  |
| `regency_code` | text FK   | → regencies      |
| `name`         | text      |                  |

### tabel `villages` (kelurahan/desa)

| kolom           | tipe       | keterangan            |
| --------------- | ---------- | --------------------- |
| `code`          | text PK    | mis. `32.73.01.1001`  |
| `district_code` | text FK    | → districts           |
| `name`          | text       |                       |
| `postal_code`   | text null  | kode pos              |

> Index pada `province_code`, `regency_code`, `district_code` untuk query dropdown cepat.

## Router & Controller (read-only, publik)

| Method | Route                  | Auth   | Fungsi                                   |
| ------ | ---------------------- | ------ | ---------------------------------------- |
| GET    | `/regions/provinces`   | Public | Semua provinsi                           |
| GET    | `/regions/regencies`   | Public | Kab/kota by `?provinceCode=`             |
| GET    | `/regions/districts`   | Public | Kecamatan by `?regencyCode=`             |
| GET    | `/regions/villages`    | Public | Kelurahan by `?districtCode=` (+ pos)    |
| GET    | `/regions/search`      | Public | Cari wilayah by nama (opsional)          |

## Definition of Done

- 4 tabel wilayah ter-seed penuh dari dataset resmi.
- Endpoint dropdown bertingkat jalan & cepat.
- `customers.addresses` & `delivery.zones` bisa referensi kode wilayah.
- Migration + seed ter-apply.

## Aturan Implementasi (WAJIB)

> Ikuti konvensi global di [_conventions.md](../_conventions.md).

1. **PK pakai kode resmi bertipe `text`** (bukan uuid) — pengecualian yang disengaja dari konvensi.
2. Modul ini **read-only**: JANGAN bikin endpoint POST/PATCH/DELETE. Data masuk hanya lewat skrip seed.
3. Skrip seed: `scripts/seed-regions.ts`, dijalankan dengan `pnpm tsx scripts/seed-regions.ts` (tambah script `db:seed:regions` di package.json).
4. Seed harus **idempotent**: pakai `.onConflictDoNothing()` di setiap insert — aman di-run ulang.
5. Insert **batch per 1000 baris** (total ±83rb desa; insert satu-satu bakal lama sekali).
6. Urutan seed wajib: provinces → regencies → districts → villages (karena FK).
7. Query dropdown wajib pakai `where` kolom FK level (mis. `eq(regencies.provinceCode, code)`) — index sudah disiapkan di schema.
8. Response array TIDAK pakai pagination (dropdown butuh semua data level itu sekaligus).

## Update — 2026-07-11 (Testing)

Retrofit bareng modul 01: `test/regions.e2e-spec.ts` (e2e). Data wilayah juga di-seed ke DB test (`roastery_test`) via `scripts/setup-test-db.sh` — lihat [konvensi §18](../_conventions.md).
