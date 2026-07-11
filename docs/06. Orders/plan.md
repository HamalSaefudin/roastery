# 06. Orders — Plan

Modul: `src/modules/orders`
Fase proyek: **Fase 1**.

## Tujuan

**Keranjang → checkout → siklus pesanan.** Inti transaksi. Mengikat customer, item, harga, ongkir, dan status.

## Ketergantungan

- `auth` + `customers` — pemilik order & alamat.
- `catalog` + `inventory` — item & reservasi stok.
- `pricing` — hitung harga item & promo.
- `payments` — status pembayaran.
- `delivery` — ongkir & pengiriman.

## Yang di-generate lewat Nest CLI

```bash
pnpm exec nest g service modules/orders --no-spec
pnpm exec nest g controller modules/orders --no-spec
```

## Schema DB (Drizzle → Postgres)

### tabel `carts` + `cart_items`

`carts`: `id`, `customer_id` FK, `created_at`, `updated_at`.
`cart_items`: `id`, `cart_id` FK, `variant_id` null, `product_id` null, `quantity`, `created_at`.
(harga dihitung saat checkout, bukan disimpan di cart)

### enum `order_status`

`created` → `paid` → `processing` (roasting/packing) → `out_for_delivery` → `delivered` → `cancelled`

### enum `payment_type`: `prepaid` | `invoice`

### tabel `orders`

| kolom              | tipe             | keterangan                          |
| ------------------ | ---------------- | ----------------------------------- |
| `id`               | uuid PK          |                                     |
| `order_number`     | text unique      | nomor order human-readable          |
| `customer_id`      | uuid FK          |                                     |
| `status`           | `order_status`   | default `created`                   |
| `payment_type`     | `payment_type`   | default `prepaid` (wholesale=invoice)|
| `subtotal`         | integer          | jumlah item                         |
| `discount`         | integer          | dari promo                          |
| `delivery_fee`     | integer          | dari zona                           |
| `total`            | integer          | subtotal - discount + delivery_fee  |
| `promo_code`       | text null        | snapshot                            |
| `delivery_address` | jsonb            | snapshot alamat saat order          |
| `notes`            | text null        |                                     |
| `created_at`       | timestamptz      | default now                         |
| `updated_at`       | timestamptz      | default now                         |

### tabel `order_items` (snapshot, harga dikunci)

| kolom          | tipe          | keterangan                       |
| -------------- | ------------- | -------------------------------- |
| `id`           | uuid PK       |                                  |
| `order_id`     | uuid FK       | on delete cascade                |
| `product_id`   | uuid FK       |                                  |
| `variant_id`   | uuid FK null  | untuk biji                       |
| `name`         | text          | snapshot nama produk             |
| `grind`        | text null     | snapshot pilihan giling          |
| `weight_grams` | integer null  | snapshot                         |
| `quantity`     | integer       |                                  |
| `unit_price`   | integer       | harga saat order                 |
| `line_total`   | integer       | unit_price × quantity            |

### tabel `order_status_history`

`id`, `order_id` FK, `status`, `changed_by` (user id) null, `note` null, `created_at`.

## Router & Controller

| Method | Route                     | Auth        | Fungsi                                   |
| ------ | ------------------------- | ----------- | ---------------------------------------- |
| GET    | `/orders/cart`            | login       | Lihat keranjang                          |
| POST   | `/orders/cart/items`      | login       | Tambah item ke keranjang                 |
| PATCH  | `/orders/cart/items/:id`  | login       | Ubah qty                                 |
| DELETE | `/orders/cart/items/:id`  | login       | Hapus item                               |
| POST   | `/orders/checkout`        | login       | Buat order dari cart (reserve stok)      |
| GET    | `/orders`                 | login       | Riwayat order sendiri                    |
| GET    | `/orders/:id`             | login       | Detail order                             |
| GET    | `/orders/admin`           | staff/admin | Semua order (filter status)              |
| PATCH  | `/orders/:id/status`      | staff/admin | Ubah status (+ history)                  |

## Definition of Done

- Cart CRUD jalan; checkout membuat order + reserve stok + hitung total (harga, promo, ongkir).
- Status order bisa diubah staff & tercatat di history.
- Migration ter-apply.

## Aturan Implementasi (WAJIB)

> Ikuti konvensi global di [_conventions.md](../_conventions.md).

1. **Format order number**: `ORD-YYYYMMDD-NNNN` — `NNNN` = urutan hari itu, mulai `0001`. Hitung dengan `COUNT(*)` order hari itu + 1, di dalam transaksi checkout.
2. **Tabel transisi status order** (selain ini → 409):

   | Dari | Boleh ke |
   | --- | --- |
   | `created` | `paid`, `cancelled` |
   | `paid` | `processing`, `cancelled` |
   | `processing` | `out_for_delivery` |
   | `out_for_delivery` | `delivered` |
   | `delivered` | (final) |
   | `cancelled` | (final) |

3. **Algoritma checkout** (SATU transaksi DB, urutan persis):
   1. Ambil cart user; kosong → 409.
   2. Validasi `addressId` milik customer login → snapshot objek alamat (nama penerima, phone, line1, nama wilayah, postal_code) ke `delivery_address` jsonb.
   3. Tentukan zona: dari `district_code` alamat → cari `delivery_zones` aktif yang memuat kode itu; tidak ada → 400 (`Di luar jangkauan pengiriman`). `delivery_fee = zone.fee`.
   4. Per item cart: `resolvePrice()` dari PricingService (pakai `customer_type` user + qty) → `unit_price`; `reserve()` dari InventoryService.
   5. `subtotal = Σ line_total`.
   6. Kalau ada `promoCode`: `validatePromo(code, subtotal)`; invalid → 422; valid → `discount` + increment `used_count`.
   7. `total = subtotal - discount + delivery_fee`.
   8. `payment_type`: `invoice` kalau `customer_type = wholesale`, selain itu `prepaid`.
   9. Insert `orders` + `order_items` (snapshot name/grind/weight/unit_price) + `order_status_history` (`created`).
   10. Kosongkan cart. (Pembuatan row `deliveries` dilakukan modul delivery — panggil `DeliveryService.createForOrder(orderId, zoneId)` di sini.)
4. **Status berubah otomatis**: `paid` di-set oleh modul payments (webhook); `delivered` oleh modul delivery. Keduanya lewat method `OrdersService.changeStatus()` yang sama (validasi transisi + tulis history).
5. **Cancel** (`status → cancelled`): release semua reservasi stok item order itu (dalam transaksi).
6. `changed_by` di history = user id pengubah; `null` kalau via webhook/sistem.
7. Cart item: kalau varian/produk sama ditambahkan lagi → jumlahkan qty ke item yang ada, jangan bikin row baru.

## Update Desain — 2026-07-09 (gambaran bisnis final + kode ID)

> Hasil finalisasi [gambaran-bisnis.md](../gambaran-bisnis.md) (pickup, COD, luar zona) + konvensi §16. **Bagian ini MENGGANTIKAN** poin-poin terkait di atas bila bertentangan.

### Schema — kolom & enum tambahan

- enum `order_status` **TAMBAH nilai**: `ready_for_pickup`.
- enum baru `fulfillment_method`: `delivery` | `pickup`.
- enum baru `shipping_method`: `internal` (driver sendiri) | `external` (kurir pihak ketiga).
- tabel `orders` **TAMBAH kolom**:

| kolom | tipe | keterangan |
| --- | --- | --- |
| `fulfillment_method` | `fulfillment_method` not null default `delivery` | pilihan customer saat checkout |
| `shipping_method` | `shipping_method` null | hanya terisi jika `delivery`; ditentukan sistem dari zona |
| `courier_name` | text null | kurir eksternal (diisi staff, mis. `JNE`) |
| `tracking_number` | text null | resi kurir eksternal (diisi staff manual) |
| `pickup_code` | text null | 6 karakter random (BUKAN sequence), dibuat saat status `ready_for_pickup` |

- `cart_items`: tambahkan CHECK XOR — tepat satu dari `variant_id`/`product_id` terisi.
- `order_number` tetap `ORD-YYYYMMDD-NNNN` — generate via `nextCode(tx, { prefix: 'ORD', scope: 'daily', width: 4, counter: 'order' })` (konvensi §16), bukan `COUNT(*)+1` lagi.

### Tabel transisi status — PENGGANTI tabel di atas

| Dari | Boleh ke | Catatan |
| --- | --- | --- |
| `created` | `paid`, `processing`, `cancelled` | → `paid` via webhook (online); → `processing` langsung **hanya untuk COD** (bayar belakangan) |
| `paid` | `processing`, `cancelled` | |
| `processing` | `out_for_delivery`, `ready_for_pickup` | `out_for_delivery` utk delivery (internal saat driver assigned / external saat resi diinput); `ready_for_pickup` utk pickup |
| `out_for_delivery` | `delivered` | |
| `ready_for_pickup` | `delivered` | saat customer ambil & staff konfirmasi |
| `delivered` / `cancelled` | (final) | |

> Order COD tidak pernah lewat status `paid` — status bayarnya dilacak di tabel `payments` (lihat modul 07).

### Algoritma checkout — PENGGANTI algoritma di atas

Body checkout: `{ fulfillmentMethod: 'delivery'|'pickup', paymentMethod: 'online'|'cod', addressId?, promoCode?, notes? }`. SATU transaksi DB:

1. Ambil cart user; kosong → 409.
2. **Jika `pickup`**: tidak butuh `addressId`; `delivery_fee = 0`; `shipping_method = null`; lewati langkah 3–4.
3. **Jika `delivery`**: validasi `addressId` milik customer → snapshot ke `delivery_address` jsonb.
4. Tentukan zona dari `district_code` alamat: ketemu → `shipping_method = 'internal'`, `delivery_fee = zone.fee`; TIDAK ketemu → **JANGAN tolak** — `shipping_method = 'external'`, `delivery_fee` = fee **zona fallback** (lihat modul 08; keputusan bisnis: tarif luar zona disamakan tarif dalam kota untuk sekarang).
5. Validasi `paymentMethod`: `cod` hanya boleh jika `delivery` + `shipping_method = 'internal'` — selain itu 400 (`COD hanya untuk pengiriman driver dalam zona`). Tidak ada batas nominal COD (keputusan bisnis).
6. Per item cart: `resolvePrice()` + `reserve()` (sama seperti sebelumnya).
7. `subtotal`, promo (422 jika invalid), `total = subtotal - discount + delivery_fee`.
8. `payment_type`: `invoice` jika wholesale; selain itu `prepaid`.
9. Generate `order_number` via sequence util; insert `orders` + `order_items` + history.
10. **Jika `paymentMethod = 'cod'`**: panggil `PaymentsService.createCodPayment(orderId, total)` + langsung `changeStatus(orderId, 'processing')` (tanpa menunggu webhook).
11. Jika `delivery` + `internal`: panggil `DeliveryService.createForOrder(orderId, zoneId, codAmount?)` — `codAmount = total` bila COD, selain itu null. **Pickup & external TIDAK membuat row deliveries.**
12. Kosongkan cart.

### Endpoint tambahan

| Method | Route | Auth | Fungsi |
| --- | --- | --- | --- |
| PATCH | `/orders/:id/shipping` | staff/admin | Input kurir eksternal: body `{ "courierName", "trackingNumber" }` — hanya order `shipping_method = 'external'` status `processing`; efek: status → `out_for_delivery` + history. Resi tampil di storefront. |

Aturan pickup: saat staff set status `ready_for_pickup`, generate `pickup_code` (6 char alfanumerik uppercase random) + tampilkan ke customer; saat customer datang, staff cocokkan kode lalu set `delivered`.
