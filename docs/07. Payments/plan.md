# 07. Payments — Plan

Modul: `src/modules/payments`
Fase proyek: **Fase 1** (bayar retail/prepaid) & **Fase 3** (invoice wholesale).

## Tujuan

Proses **pembayaran**: integrasi payment gateway, tangani callback/webhook, refund (penuh/sebagian),
serta **invoice/tempo** untuk wholesale.

## Keputusan pending

- **Payment gateway** belum dipilih. Kandidat umum di Indonesia: **Midtrans** atau **Xendit**
  (dukungan VA, e-wallet, QRIS). Modul dirancang provider-agnostic (kolom `provider` + `provider_ref`).

## Ketergantungan

- `orders` — bayar terhadap order; update status order jadi `paid`.
- `customers` — wholesale → jalur invoice.
- `config` — kredensial gateway.

## Yang di-generate lewat Nest CLI

```bash
pnpm exec nest g service modules/payments --no-spec
pnpm exec nest g controller modules/payments --no-spec
```

## Schema DB (Drizzle → Postgres)

### enum `payment_status`: `pending` | `paid` | `failed` | `refunded` | `partially_refunded`

### tabel `payments`

| kolom          | tipe              | keterangan                         |
| -------------- | ----------------- | ---------------------------------- |
| `id`           | uuid PK           |                                    |
| `order_id`     | uuid FK           |                                    |
| `provider`     | text              | mis. `midtrans`                    |
| `provider_ref` | text null         | id transaksi di gateway            |
| `method`       | text null         | va/ewallet/qris                    |
| `amount`       | integer           | nominal                            |
| `status`       | `payment_status`  | default `pending`                  |
| `paid_at`      | timestamptz null  |                                    |
| `created_at`   | timestamptz       | default now                        |

### tabel `refunds`

| kolom        | tipe             | keterangan            |
| ------------ | ---------------- | --------------------- |
| `id`         | uuid PK          |                       |
| `payment_id` | uuid FK          |                       |
| `amount`     | integer          | nominal refund        |
| `reason`     | text null        |                       |
| `status`     | text             | requested/done        |
| `created_at` | timestamptz      | default now           |

### enum `invoice_status`: `issued` | `paid` | `overdue` | `cancelled`

### tabel `invoices` (wholesale, Fase 3)

| kolom            | tipe              | keterangan            |
| ---------------- | ----------------- | --------------------- |
| `id`             | uuid PK           |                       |
| `order_id`       | uuid FK           |                       |
| `invoice_number` | text unique       |                       |
| `amount`         | integer           |                       |
| `due_date`       | date              | jatuh tempo (net-30)  |
| `status`         | `invoice_status`  | default `issued`      |
| `issued_at`      | timestamptz       | default now           |
| `paid_at`        | timestamptz null  |                       |

## Router & Controller

| Method | Route                        | Auth        | Fungsi                                     |
| ------ | ---------------------------- | ----------- | ------------------------------------------ |
| POST   | `/payments/checkout`         | login       | Buat transaksi bayar utk order (prepaid)   |
| POST   | `/payments/webhook`          | Public*     | Callback dari gateway (verifikasi signature)|
| GET    | `/payments/order/:orderId`   | login       | Status pembayaran order                    |
| POST   | `/payments/:id/refund`       | staff/admin | Refund penuh/sebagian                      |
| POST   | `/payments/invoices`         | staff/admin | Terbitkan invoice wholesale (Fase 3)       |
| PATCH  | `/payments/invoices/:id/pay` | staff/admin | Tandai invoice lunas                       |

`*` webhook publik tapi **wajib verifikasi signature** provider.

## Definition of Done

- Retail: checkout → dapat instruksi bayar → webhook menandai `paid` → order jadi `paid`.
- Refund tercatat & ubah status payment.
- (Fase 3) Invoice wholesale bisa diterbitkan & dilunasi.
- Migration ter-apply.

## Aturan Implementasi (WAJIB)

> Ikuti konvensi global di [_conventions.md](../_conventions.md).

1. **Adapter provider**: interface `PaymentProvider` (`createTransaction(order, method)`, `verifyWebhook(headers, body)`, `parseWebhook(body)`) di `providers/payment-provider.interface.ts`; implementasi konkret (mis. `providers/midtrans.provider.ts`) di-bind lewat DI. Service TIDAK boleh import SDK gateway langsung.
2. **`amount` SELALU diambil dari `orders.total` di DB** — jangan pernah percaya nominal dari client.
3. Satu order hanya boleh punya SATU payment ber-status `pending` (cek dulu; kalau ada, return payment lama + instruksi baru, jangan bikin baru). Order sudah `paid` → 409.
4. **Webhook wajib idempotent**: kalau payment sudah `paid` dan webhook `paid` datang lagi → return 200 tanpa efek apa pun.
5. Urutan handler webhook: verifikasi signature (gagal → 401) → cari payment by `provider_ref` (tidak ada → 200, log warning, JANGAN 404 biar gateway tidak retry terus) → update status → kalau jadi `paid`: set `paid_at` + panggil `OrdersService.changeStatus(orderId, 'paid')`.
6. **Refund**: hanya untuk payment `paid`. `Σ refund <= amount`. Refund penuh → status `refunded`; sebagian → `partially_refunded`.
7. **Invoice** (Fase 3): `invoice_number` format `INV-YYYYMM-NNNN`. Hanya untuk order `payment_type = invoice`. Tandai lunas → juga `OrdersService.changeStatus(orderId, 'paid')`.
8. Kredensial gateway dari `ConfigService` (`PAYMENT_SERVER_KEY` dsb.) — tambah ke `.env` + `.env.example`.

## Update Desain — 2026-07-09 (COD + kode ID)

> Bagian ini menang bila bertentangan dengan bagian di atas. Referensi: [gambaran-bisnis.md](../gambaran-bisnis.md) + konvensi §16.

1. `payments` **TAMBAH kolom** `payment_number text unique not null` — `PAY-YYYYMMDD-NNNN` via sequence util (daily). `refunds` **TAMBAH** `refund_number` — `RFD-YYYYMMDD-NNN` (daily, pad 3).
2. `method` kini termasuk `'cod'` (nilai: `va` | `ewallet` | `qris` | `cod`).
3. **Alur COD** (tidak lewat gateway sama sekali):
   - `createCodPayment(orderId, amount)` — dipanggil OrdersService saat checkout COD (dalam transaksi checkout): insert row `payments` dengan `provider = 'internal'`, `method = 'cod'`, `status = 'pending'`.
   - `markCodPaid(orderId)` — dipanggil DeliveryService saat driver konfirmasi terima uang: set `status = 'paid'` + `paid_at = now()`. **JANGAN** panggil `OrdersService.changeStatus(orderId, 'paid')` — order COD tidak lewat status `paid` (sudah `processing`/`out_for_delivery`; lihat tabel transisi modul 06).
   - `POST /payments/checkout` **menolak order COD** → 409 (`Order COD tidak butuh pembayaran gateway`).
4. Keputusan bisnis: **tidak ada batas nominal COD** untuk sekarang.
5. Kedua fungsi COD diekspor dari `PaymentsService` (dipakai Orders & Delivery via DI, bukan HTTP).
