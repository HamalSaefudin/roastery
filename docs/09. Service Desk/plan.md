# 09. Service Desk — Plan

Modul: `src/modules/service-desk` (+ sub-modul `warranty`, `repairs` — **dibuat di modul ini**)
Fase proyek: **Fase 4**.

## Tujuan

**After-sales** untuk mesin & grinder:

- **warranty** — registrasi garansi per **nomor seri** (unit fisik).
- **repairs** — tiket servis/reparasi: buat, assign teknisi, status, biaya, in-warranty vs berbayar, jadwal.

## Ketergantungan

- `inventory` — `equipment_units` (nomor seri).
- `catalog` — `machine_details`/`grinder_details` (`warranty_months`).
- `customers` — pemilik garansi/tiket.
- `orders` — kaitkan garansi ke order pembelian.

## Yang di-generate lewat Nest CLI

> Sub-modul `warranty` & `repairs` belum ada — dibuat di sini.

```bash
pnpm exec nest g module modules/service-desk/warranty
pnpm exec nest g service modules/service-desk/warranty --no-spec
pnpm exec nest g controller modules/service-desk/warranty --no-spec
pnpm exec nest g module modules/service-desk/repairs
pnpm exec nest g service modules/service-desk/repairs --no-spec
pnpm exec nest g controller modules/service-desk/repairs --no-spec
```

## Schema DB (Drizzle → Postgres)

### Section: WARRANTY

**tabel `warranties`**

| kolom             | tipe              | keterangan                     |
| ----------------- | ----------------- | ------------------------------ |
| `id`              | uuid PK           |                                |
| `equipment_unit_id`| uuid FK          | → equipment_units              |
| `customer_id`     | uuid FK           |                                |
| `order_id`        | uuid FK null      | order pembelian                |
| `serial_number`   | text              | snapshot                       |
| `starts_at`       | date              | tanggal mulai garansi          |
| `ends_at`         | date              | berdasar `warranty_months`     |
| `created_at`      | timestamptz       | default now                    |

### Section: REPAIRS

**enum** `repair_status`: `open` | `diagnosing` | `in_progress` | `waiting_parts` | `completed` | `cancelled`

**tabel `repair_tickets`**

| kolom              | tipe              | keterangan                       |
| ------------------ | ----------------- | -------------------------------- |
| `id`               | uuid PK           |                                  |
| `ticket_number`    | text unique       |                                  |
| `customer_id`      | uuid FK           |                                  |
| `equipment_unit_id`| uuid FK null      |                                  |
| `warranty_id`      | uuid FK null      | jika klaim garansi               |
| `is_warranty`      | boolean           | default false                    |
| `issue`            | text              | keluhan                          |
| `status`           | `repair_status`   | default `open`                   |
| `assigned_to`      | uuid FK null      | → users (teknisi/staff)          |
| `cost`             | integer null      | biaya (jika berbayar)            |
| `scheduled_at`     | timestamptz null  | jadwal servis                    |
| `created_at`       | timestamptz       | default now                      |
| `updated_at`       | timestamptz       | default now                      |

**tabel `repair_updates`** (histori)

`id`, `ticket_id` FK, `status`, `note`, `parts` jsonb null, `created_at`.

## Router & Controller

| Method | Route                          | Auth        | Fungsi                            |
| ------ | ------------------------------ | ----------- | --------------------------------- |
| POST   | `/service-desk/warranties`     | login       | Registrasi garansi (nomor seri)   |
| GET    | `/service-desk/warranties`     | login       | Garansi milik sendiri             |
| POST   | `/service-desk/repairs`        | login       | Buat tiket reparasi               |
| GET    | `/service-desk/repairs`        | login       | Tiket milik sendiri               |
| GET    | `/service-desk/repairs/admin`  | staff/admin | Semua tiket (filter status)       |
| PATCH  | `/service-desk/repairs/:id`    | staff/admin | Update status/assign/biaya/jadwal |

## Definition of Done

- Customer bisa registrasi garansi & buat tiket reparasi.
- Staff bisa assign teknisi, ubah status, catat biaya & jadwal.
- Klaim garansi terhubung ke unit & masa berlaku.
- Migration ter-apply.

## Aturan Implementasi (WAJIB)

> Ikuti konvensi global di [_conventions.md](../_conventions.md).

1. **Registrasi garansi**: cari `equipment_units` by `serial_number` dengan status `sold` (belum sold → 400 `Unit belum terjual`). Satu unit hanya boleh punya SATU warranty (sudah ada → 409).
2. `starts_at` = tanggal registrasi (hari ini). `ends_at` = `starts_at` + `warranty_months` dari `machine_details`/`grinder_details` produk unit tsb.
3. **Klaim garansi valid** jika: warranty milik customer login DAN `now() <= ends_at`. Tidak valid → tiket tetap boleh dibuat tapi `is_warranty = false` (servis berbayar).
4. **Format ticket number**: `RPR-YYYYMMDD-NNN` (urutan hari itu, mulai `001`).
5. **Tabel transisi status repair** (selain ini → 409):

   | Dari | Boleh ke |
   | --- | --- |
   | `open` | `diagnosing`, `cancelled` |
   | `diagnosing` | `in_progress`, `cancelled` |
   | `in_progress` | `waiting_parts`, `completed` |
   | `waiting_parts` | `in_progress` |
   | `completed` / `cancelled` | (final) |

6. Setiap `PATCH` tiket insert `repair_updates` (status, note, parts).
7. `cost` hanya boleh diisi kalau `is_warranty = false` (in-warranty gratis; kalau ada biaya tambahan di luar garansi, catat di note).
8. Customer hanya lihat tiket/garansi miliknya sendiri; staff lihat semua.

## Update Desain — 2026-07-09 (kode ID)

1. `warranties` **TAMBAH kolom** `warranty_number text unique not null` — `WRT-XXXXXX` (global, pad 6) via sequence util (konvensi §16). Tampil di akun customer & response registrasi.
