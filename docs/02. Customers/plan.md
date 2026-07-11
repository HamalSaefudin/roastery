# 02. Customers — Plan

Modul: `src/modules/customers`
Fase proyek: **Fase 1** (profil retail + alamat) & **Fase 3** (approval wholesale).

## Tujuan

Kelola **akun user yang login di client** — profil, alamat pengiriman, riwayat.
Menyimpan **tipe customer** (retail/wholesale) dan **alur approval wholesale** (bisnis di-approve staff dulu sebelum dapat harga grosir).

## Ketergantungan

- `auth` — tiap profil terikat ke `users.id`; guard & `@CurrentUser()`.
- `regions` — alamat referensi kode wilayah (provinsi/kota/kecamatan/kelurahan).
- `database` — Drizzle.

## Yang di-generate lewat Nest CLI

```bash
pnpm exec nest g service modules/customers --no-spec
pnpm exec nest g controller modules/customers --no-spec
```

File manual: `customers.schema.ts`, `dto/update-profile.dto.ts`, `dto/address.dto.ts`, `dto/wholesale-application.dto.ts`.

## Schema DB (Drizzle → Postgres)

### enum `customer_type`: `retail` | `wholesale`

### enum `wholesale_status`: `pending` | `approved` | `rejected`

### tabel `customer_profiles`

| kolom           | tipe                   | keterangan        |
| --------------- | ---------------------- | ----------------- |
| `id`            | uuid PK                |                   |
| `user_id`       | uuid FK → users unique | 1 user = 1 profil |
| `full_name`     | text                   |                   |
| `phone`         | text null              |                   |
| `customer_type` | `customer_type`        | default `retail`  |
| `created_at`    | timestamptz            | default now       |
| `updated_at`    | timestamptz            | default now       |

### tabel `addresses`

| kolom            | tipe                    | keterangan                             |
| ---------------- | ----------------------- | -------------------------------------- |
| `id`             | uuid PK                 |                                        |
| `customer_id`    | uuid FK → profiles      | on delete cascade                      |
| `label`          | text                    | mis. "Rumah", "Kantor"                 |
| `recipient_name` | text                    |                                        |
| `phone`          | text                    |                                        |
| `line1`          | text                    | alamat detail (jalan, no, RT/RW)       |
| `line2`          | text null               |                                        |
| `province_code`  | text FK → provinces     | dari modul `regions`                   |
| `regency_code`   | text FK → regencies     | kabupaten/kota                         |
| `district_code`  | text FK → districts     | kecamatan                              |
| `village_code`   | text FK → villages null | kelurahan/desa                         |
| `postal_code`    | text                    | dari kelurahan; dipakai delivery/zones |
| `is_default`     | boolean                 | default false                          |
| `created_at`     | timestamptz             | default now                            |

### tabel `wholesale_applications`

| kolom           | tipe                 | keterangan        |
| --------------- | -------------------- | ----------------- |
| `id`            | uuid PK              |                   |
| `customer_id`   | uuid FK → profiles   |                   |
| `business_name` | text                 |                   |
| `tax_id`        | text null            | NPWP/NIB          |
| `status`        | `wholesale_status`   | default `pending` |
| `note`          | text null            | catatan reviewer  |
| `reviewed_by`   | uuid FK → users null | staff yang review |
| `reviewed_at`   | timestamptz null     |                   |
| `created_at`    | timestamptz          | default now       |

> Saat aplikasi di-approve → set `customer_profiles.customer_type = wholesale`.

## Router & Controller

| Method | Route                                   | Auth        | Fungsi                              |
| ------ | --------------------------------------- | ----------- | ----------------------------------- |
| GET    | `/customers/me`                         | login       | Profil sendiri                      |
| PATCH  | `/customers/me`                         | login       | Update profil                       |
| GET    | `/customers/me/addresses`               | login       | List alamat                         |
| POST   | `/customers/me/addresses`               | login       | Tambah alamat                       |
| PATCH  | `/customers/me/addresses/:id`           | login       | Ubah alamat                         |
| DELETE | `/customers/me/addresses/:id`           | login       | Hapus alamat                        |
| POST   | `/customers/me/wholesale-application`   | login       | Ajukan jadi wholesale               |
| GET    | `/customers/me/wholesale-application`   | login       | Status pengajuan                    |
| GET    | `/customers`                            | staff/admin | List customer (search, filter tipe) |
| GET    | `/customers/wholesale-applications`     | staff/admin | List pengajuan (filter status)      |
| PATCH  | `/customers/wholesale-applications/:id` | staff/admin | Approve / reject                    |

## Definition of Done

- User bisa lihat & update profil, CRUD alamat, set alamat default.
- User bisa ajukan wholesale; staff bisa approve/reject → tipe berubah.
- Migration ter-apply (3 tabel).

## Aturan Implementasi (WAJIB)

> Ikuti konvensi global di [\_conventions.md](../_conventions.md).

1. **Auto-create profil**: `GET /customers/me` — kalau profil belum ada untuk `user_id` login, buat dulu row kosong (`customer_type: 'retail'`, `full_name: ''`), lalu return. Jangan error 404. `users` (modul auth) tidak menyimpan nama — customer isi `full_name` sendiri lewat `PATCH /customers/me`.
2. **Alamat default**: saat create/update alamat dengan `isDefault: true`, dalam **satu transaksi**: set `is_default = false` untuk semua alamat customer itu, lalu set `true` pada alamat target. Alamat pertama customer otomatis `is_default = true`.
3. **Validasi kode wilayah**: saat create/update alamat, cek `province_code`/`regency_code`/`district_code`/`village_code` benar-benar ada di tabel regions DAN berjenjang konsisten (regency milik province tsb, dst). Salah → 400.
4. `postal_code` diambil dari `villages.postal_code` milik `village_code` — jangan terima dari client.
5. **Wholesale application**: user hanya boleh punya SATU aplikasi ber-status `pending` (cek dulu, kalau ada → 409). Kalau sudah `approved` juga 409 (`Sudah wholesale`).
6. **Approve** (dalam satu transaksi): update aplikasi (`status`, `reviewed_by` = user staff login, `reviewed_at = now()`) + set `customer_profiles.customer_type = 'wholesale'` + set `users.role = 'wholesale'`. **Reject**: hanya update aplikasi, `note` wajib diisi.
7. Endpoint `/customers/me/*` HARUS pakai profil milik user login (`@CurrentUser()`); jangan pernah terima `customerId` dari client.
8. Hapus alamat yang `is_default = true` dan masih ada alamat lain → jadikan alamat terlama berikutnya default (dalam transaksi).

## Update Desain — 2026-07-09 (kode ID)

> Hasil keputusan ID & sequence (lihat [konvensi §16](../_conventions.md)). Bila beda dengan tabel schema di atas, bagian ini yang menang.

1. `customer_profiles` **TAMBAH kolom** `code text unique not null` — format `CUS-XXXXXX` (global, pad 6). Digenerate via `nextCode(tx, { prefix: 'CUS', scope: 'global', width: 6, counter: 'customer' })` **dalam transaksi yang sama** saat profil dibuat (termasuk auto-create di `GET /customers/me`).
2. Modul ini adalah **pembuat infra sequence** (konsumen pertama): buat `src/database/sequences.schema.ts` (tabel `sequence_counters`) + helper `src/common/sequence.util.ts` persis seperti konvensi §16, ikutkan di migration modul ini.
3. `code` ditampilkan di response profil & list customer CMS (buat staff menyebut customer di telepon/chat).
