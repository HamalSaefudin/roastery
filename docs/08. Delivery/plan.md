# 08. Delivery — Plan

Modul: `src/modules/delivery` (+ sub-modul `zones`, `dispatch`, `drivers`, `vehicles`)
Fase proyek: **Fase 1** (zones + dispatch-only) & **Fase 2** (driver app + live tracking).

## Tujuan

Logistik **pengiriman in-house**:

- **zones** — area & ongkir.
- **dispatch** — staff assign order ke driver (papan di CMS).
- **drivers** — profil driver, antrian job, update status & lokasi live (Driver App).

## Ketergantungan

- `orders` — tiap delivery terikat 1 order.
- `auth` — driver = `users` role `driver`; guard.
- `customers` — alamat & postal code untuk pemetaan zona.

## Yang di-generate lewat Nest CLI

```bash
pnpm exec nest g service modules/delivery --no-spec
pnpm exec nest g controller modules/delivery --no-spec
pnpm exec nest g service modules/delivery/zones --no-spec
pnpm exec nest g controller modules/delivery/zones --no-spec
pnpm exec nest g service modules/delivery/dispatch --no-spec
pnpm exec nest g controller modules/delivery/dispatch --no-spec
pnpm exec nest g service modules/delivery/drivers --no-spec
pnpm exec nest g controller modules/delivery/drivers --no-spec
# master kendaraan (sub-modul baru)
pnpm exec nest g module modules/delivery/vehicles
pnpm exec nest g service modules/delivery/vehicles --no-spec
pnpm exec nest g controller modules/delivery/vehicles --no-spec
```

## Schema DB (Drizzle → Postgres)

### Section: ZONES

**tabel `delivery_zones`**

| kolom          | tipe      | keterangan                   |
| -------------- | --------- | ---------------------------- |
| `id`           | uuid PK   |                              |
| `name`         | text      | mis. "Bandung Kota"          |
| `district_codes` | jsonb     | daftar kode kecamatan (regions) |
| `fee`          | integer   | ongkir (IDR)                 |
| `eta_text`     | text null | mis. "1-2 hari"              |
| `is_active`    | boolean   | default true                 |

### Section: DRIVERS

**tabel `drivers`**

| kolom          | tipe           | keterangan            |
| -------------- | -------------- | --------------------- |
| `id`           | uuid PK        |                       |
| `user_id`      | uuid FK unique | → users (role driver) |
| `name`         | text           |                       |
| `phone`        | text           |                       |
| `vehicle_id`   | uuid FK null   | → **vehicles**        |
| `is_available` | boolean        | default true          |
| `current_lat`  | double null    | lokasi live (Fase 2)  |
| `current_lng`  | double null    |                       |
| `updated_at`   | timestamptz    | default now           |

### Section: VEHICLES (master kendaraan)

**enum** `vehicle_type`: `motor` | `mobil` | `van`

**tabel `vehicles`**

| kolom          | tipe            | keterangan                 |
| -------------- | --------------- | -------------------------- |
| `id`           | uuid PK         |                            |
| `plate_number` | text unique     | plat nomor                 |
| `type`         | `vehicle_type`  |                            |
| `capacity_kg`  | integer null    | kapasitas muatan           |
| `is_active`    | boolean         | default true               |
| `created_at`   | timestamptz     | default now                |

> `drivers.vehicle_id` menunjuk ke sini (kendaraan bisa dipindah antar driver). Opsional: `deliveries` juga bisa mencatat `vehicle_id` yang dipakai per pengiriman.

### Section: DISPATCH / DELIVERY

**enum** `delivery_status`: `pending` | `assigned` | `picked_up` | `en_route` | `delivered` | `failed`

**tabel `deliveries`**

| kolom            | tipe              | keterangan                    |
| ---------------- | ----------------- | ----------------------------- |
| `id`             | uuid PK           |                               |
| `order_id`       | uuid FK unique    | → orders                      |
| `zone_id`        | uuid FK null      | → delivery_zones              |
| `driver_id`      | uuid FK null      | → drivers (diisi saat assign) |
| `status`         | `delivery_status` | default `pending`             |
| `scheduled_slot` | text null         | slot waktu                    |
| `assigned_at`    | timestamptz null  |                               |
| `delivered_at`   | timestamptz null  |                               |
| `proof_url`      | text null         | foto bukti kirim (Fase 2)     |
| `created_at`     | timestamptz       | default now                   |

**tabel `delivery_events`** (histori tracking)

`id`, `delivery_id` FK, `status`, `lat` null, `lng` null, `note` null, `created_at`.

## Router & Controller

| Method | Route                       | Auth        | Fase | Fungsi                          |
| ------ | --------------------------- | ----------- | ---- | ------------------------------- |
| GET    | `/delivery/zones`           | Public      | 1    | List zona + ongkir              |
| POST   | `/delivery/zones`           | staff/admin | 1    | Buat zona                       |
| GET    | `/delivery/fee`             | Public      | 1    | Ongkir berdasar kode kecamatan   |
| GET    | `/delivery/dispatch`        | staff/admin | 1    | Papan: delivery pending & aktif |
| POST   | `/delivery/:id/assign`      | staff/admin | 1    | Assign driver ke delivery       |
| GET    | `/delivery/track/:orderId`  | login       | 1    | Status pengiriman order         |
| GET    | `/delivery/driver/jobs`     | driver      | 2    | Antrian job driver              |
| PATCH  | `/delivery/:id/status`      | driver      | 2    | Update status kirim             |
| POST   | `/delivery/driver/location` | driver      | 2    | Kirim lokasi live               |
| POST   | `/delivery/drivers`         | staff/admin | 2    | Daftarkan driver (+ `vehicleId`)|
| GET    | `/delivery/vehicles`        | staff/admin | 1    | List kendaraan                  |
| POST   | `/delivery/vehicles`        | staff/admin | 1    | Tambah kendaraan                |
| PATCH  | `/delivery/vehicles/:id`    | staff/admin | 1    | Ubah kendaraan                  |

## Definition of Done

- Master `vehicles` bisa dikelola; `driver.vehicle_id` menunjuk ke sana (bukan text).
- **Fase 1:** zona & ongkir jalan; staff bisa assign driver; customer lihat status dasar.
- **Fase 2:** driver terima job, update status + lokasi; customer tracking real-time.
- Migration ter-apply.

## Aturan Implementasi (WAJIB)

> Ikuti konvensi global di [_conventions.md](../_conventions.md).

1. **Zona pakai `district_codes`** (kode kecamatan dari modul `regions`), BUKAN kode pos. Satu kecamatan tidak boleh ada di dua zona aktif (validasi saat create/update zona → 409).
2. **Resolve ongkir**: input `districtCode` → cari zona aktif yang array `district_codes`-nya memuat kode itu → return `fee`. Tidak ketemu → 404 (`Di luar jangkauan`).
3. **`createForOrder(orderId, zoneId)`**: dipanggil OrdersService saat checkout — insert `deliveries` status `pending`. Jangan buat lewat endpoint.
4. **Tabel transisi status delivery** (selain ini → 409):

   | Dari | Boleh ke |
   | --- | --- |
   | `pending` | `assigned` |
   | `assigned` | `picked_up`, `pending` (batal assign) |
   | `picked_up` | `en_route` |
   | `en_route` | `delivered`, `failed` |
   | `failed` | `assigned` (re-assign) |
   | `delivered` | (final) |

5. **Assign**: hanya delivery `pending`/`failed`; driver harus `is_available = true`. Set `driver_id`, `assigned_at`, status `assigned` + insert `delivery_events`.
6. **Endpoint driver**: driver hanya boleh lihat & update delivery miliknya (`deliveries.driver_id` = driver milik user login). Bukan miliknya → 403.
7. Setiap `PATCH status` insert `delivery_events` (+ lat/lng kalau dikirim). Status `delivered`: set `delivered_at` + panggil `OrdersService.changeStatus(orderId, 'delivered')`.
8. `POST driver/location` hanya update `drivers.current_lat/lng` + `updated_at` — TIDAK bikin event (dipanggil tiap beberapa detik).
9. Order status `processing → out_for_delivery` di-set staff dari CMS (modul orders); delivery `picked_up` tidak otomatis mengubah order.

## Update Desain — 2026-07-09 (COD, zona fallback, kode ID)

> Bagian ini **MENGGANTIKAN** poin terkait di atas bila bertentangan. Referensi: [gambaran-bisnis.md](../gambaran-bisnis.md) + konvensi §16.

### Schema tambahan

- `deliveries` **TAMBAH kolom**:

| kolom | tipe | keterangan |
| --- | --- | --- |
| `delivery_number` | text unique not null | `DLV-YYYYMMDD-NNNN` via sequence util |
| `cod_amount` | integer null | tagihan COD (= order.total); null utk non-COD |
| `cod_collected_at` | timestamptz null | diisi saat driver konfirmasi terima uang |
| `cod_settlement_id` | uuid FK null | → cod_settlements; diisi saat masuk setoran |

- `delivery_zones` **TAMBAH kolom** `is_fallback boolean not null default false` — tepat **SATU** zona fallback aktif (nama mis. "Luar Zona"), `district_codes`-nya kosong. Fee-nya = tarif flat luar zona (**keputusan bisnis: disamakan tarif dalam kota untuk sekarang** — staff yang set angkanya).
- Tabel baru **`cod_settlements`** (setoran tunai driver):

| kolom | tipe | keterangan |
| --- | --- | --- |
| `id` | uuid PK | |
| `settlement_number` | text unique | `STL-YYYYMMDD-NN` |
| `driver_id` | uuid FK → drivers | |
| `amount` | integer | total yang disetor |
| `status` | enum `settlement_status`: `pending` \| `confirmed` | |
| `confirmed_by` | uuid FK → users null | staff yang terima uang |
| `confirmed_at` | timestamptz null | |
| `created_at` | timestamptz | default now |

### Aturan PENGGANTI/BARU

1. **Fee resolve TIDAK lagi 404**: districtCode ketemu di zona biasa → `{ zona, fee, shippingMethod: 'internal' }`; tidak ketemu → **zona fallback** `{ fee: fallback.fee, shippingMethod: 'external', outOfZone: true }`. Validasi "satu kecamatan satu zona" tidak berlaku untuk zona fallback.
2. `createForOrder(orderId, zoneId, codAmount?)` — hanya dipanggil untuk order **delivery internal**; `cod_amount` diisi bila COD. Order pickup & external TIDAK punya row deliveries (dispatch board hanya berisi kiriman driver sendiri).
3. **Alur COD di driver**: job driver menampilkan `codAmount`. Endpoint baru `POST /delivery/:id/cod-collect` (role driver, hanya job miliknya, hanya delivery ber-`cod_amount`): set `cod_collected_at = now()` + panggil `PaymentsService.markCodPaid(orderId)`. Konfirmasi uang boleh sebelum/bersamaan status `delivered`; delivery COD **tidak boleh** `delivered` sebelum `cod_collected_at` terisi (409).
4. **Setoran**: saldo tunai driver = Σ `cod_amount` dari deliveries yang `cod_collected_at` terisi dan `cod_settlement_id` masih null. `POST /delivery/cod-settlements` (staff, body `{ driverId }`) → kumpulkan semua delivery itu, buat settlement `pending`, isi `cod_settlement_id` masing-masing. `PATCH /delivery/cod-settlements/:id/confirm` (staff) → `confirmed` + `confirmed_by`. `GET /delivery/driver/cod-balance` (driver) → saldo di tangan.
5. `delivery_number` digenerate di `createForOrder` (dalam transaksi checkout).
