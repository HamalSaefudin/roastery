# 04. Inventory — Plan

Modul: `src/modules/inventory`
Fase proyek: **Fase 1**.

## Tujuan

**Atur stok & ketersediaan** barang. Dua model stok berbeda:

- **Biji** → stok per **varian SKU** (jumlah gram/pack).
- **Mesin & grinder** → **unit ber-nomor seri** (serialized), tiap unit dilacak sendiri.

Plus **alert stok menipis** dan **audit pergerakan stok**.

## Ketergantungan

- `catalog` — `bean_variants` (biji), `products` (equipment).
- `orders` — reservasi stok saat checkout, kurangi saat lunas.
- `database` — Drizzle.

## Yang di-generate lewat Nest CLI

```bash
pnpm exec nest g service modules/inventory --no-spec
pnpm exec nest g controller modules/inventory --no-spec
```

File manual: `inventory.schema.ts`, DTO.

## Schema DB (Drizzle → Postgres)

### tabel `bean_stock` (stok biji per varian)

| kolom                 | tipe        | keterangan                    |
| --------------------- | ----------- | ----------------------------- |
| `variant_id`          | uuid PK/FK  | → bean_variants               |
| `quantity`            | integer     | stok tersedia                 |
| `reserved`            | integer     | ter-reserve utk order pending |
| `low_stock_threshold` | integer     | batas alert (default mis. 5)  |
| `updated_at`          | timestamptz | default now                   |

### enum `unit_status`: `in_stock` | `reserved` | `sold` | `defective`

### tabel `equipment_units` (unit serial mesin/grinder)

| kolom           | tipe          | keterangan                   |
| --------------- | ------------- | ---------------------------- |
| `id`            | uuid PK       |                              |
| `product_id`    | uuid FK       | → products (machine/grinder) |
| `serial_number` | text unique   | nomor seri fisik             |
| `status`        | `unit_status` | default `in_stock`           |
| `created_at`    | timestamptz   | default now                  |

### enum `movement_reason`: `purchase` | `sale` | `adjustment` | `return` | `reserve` | `release`

### tabel `stock_movements` (audit)

| kolom          | tipe              | keterangan                       |
| -------------- | ----------------- | -------------------------------- |
| `id`           | uuid PK           |                                  |
| `variant_id`   | uuid FK null      | untuk biji                       |
| `unit_id`      | uuid FK null      | untuk equipment                  |
| `change`       | integer           | +/- (biji); equipment via status |
| `reason`       | `movement_reason` |                                  |
| `ref_order_id` | uuid null         | order terkait (jika ada)         |
| `created_at`   | timestamptz       | default now                      |

## Router & Controller

| Method | Route                              | Auth        | Fungsi                            |
| ------ | ---------------------------------- | ----------- | --------------------------------- |
| GET    | `/inventory/overview`              | staff/admin | Ringkasan stok semua produk       |
| GET    | `/inventory/low-stock`             | staff/admin | Daftar SKU di bawah threshold     |
| PATCH  | `/inventory/bean-stock/:variantId` | staff/admin | Set/ubah stok biji (+ movement)   |
| POST   | `/inventory/equipment-units`       | staff/admin | Tambah unit serial baru           |
| GET    | `/inventory/equipment-units`       | staff/admin | List unit (filter product/status) |
| PATCH  | `/inventory/equipment-units/:id`   | staff/admin | Ubah status unit                  |
| GET    | `/inventory/availability`          | Public      | Cek ketersediaan varian/unit      |

## Definition of Done

- Stok biji bisa di-set & berkurang; alert low-stock jalan.
- Unit equipment ber-serial bisa ditambah & ganti status.
- Tiap perubahan tercatat di `stock_movements`.
- Migration ter-apply.

## Aturan Implementasi (WAJIB)

> Ikuti konvensi global di [\_conventions.md](../_conventions.md).

1. **Rumus ketersediaan biji**: `available = quantity - reserved`. Semua pengecekan stok pakai `available`, bukan `quantity`.
2. **`reserve(variantId, qty, orderId)`** (dipanggil modul orders, dalam transaksi checkout):
   1. `SELECT ... FOR UPDATE` row `bean_stock` (di Drizzle: `tx.select().from(beanStock).where(...).for('update')`).
   2. Kalau `available < qty` → `ConflictException('Stok tidak cukup')` (transaksi rollback).
   3. `UPDATE bean_stock SET reserved = reserved + qty`.
   4. Insert `stock_movements` (`reason: 'reserve'`, `change: -qty`, `ref_order_id`).
3. **`release(variantId, qty, orderId)`** (order dibatalkan): `reserved = reserved - qty` + movement `release` (+qty).
4. **`commit(variantId, qty, orderId)`** (order dibayar): `quantity = quantity - qty`, `reserved = reserved - qty` + movement `sale`.
5. **Equipment**: reserve = pilih N unit `in_stock` (urut `created_at` asc) → set `reserved`; commit → `sold`; release → balik `in_stock`. Selalu catat movement dengan `unit_id`.
6. Setiap perubahan stok/status unit WAJIB tercatat di `stock_movements` — tanpa kecuali.
7. `PATCH bean-stock` oleh staff = set nilai absolut `quantity`; hitung `change = baru - lama` untuk movement (`reason` dari body).
8. Fungsi reserve/release/commit diekspor dari `InventoryService` (module `exports`) supaya bisa dipakai `OrdersModule` — bukan lewat HTTP.
