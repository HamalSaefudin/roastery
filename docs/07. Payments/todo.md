# 07. Payments — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup & keputusan

- [x] **Pilih payment gateway**: target real-world **Midtrans** (kandidat paling umum Indonesia, dukungan VA/QRIS/e-wallet lengkap) — TAPI belum ada kredensial sandbox, jadi dibangun `MockPaymentProvider` di belakang interface `PaymentProvider` (adapter pattern §Aturan Implementasi 1) supaya checkout/webhook bisa dibangun & diuji end-to-end sekarang. Tinggal ganti binding `PAYMENT_PROVIDER` ke implementasi `midtrans-client` nanti — `PaymentsService` tidak perlu berubah.
- [x] Daftar akun sandbox + simpan kredensial di `.env` — **ditunda** (belum ada akun asli); `.env`/`.env.example` sudah punya `PAYMENT_SERVER_KEY` (dipakai signature verification mock).
- [x] Pastikan `orders` selesai

## Fase 1 — Schema & migration

- [x] `payments` + enum `payment_status`
- [x] `refunds`
- [x] `invoices` + enum `invoice_status`
- [x] Re-export di `src/database/schema.ts` — **digabung 1 migrasi bareng modul 06+08** (`0007_next_starhawk.sql`)
- [x] `pnpm db:generate` → `pnpm db:migrate`

## Fase 2 — Scaffold file (Nest CLI)

- [x] `nest g service modules/payments --no-spec`
- [x] `nest g controller modules/payments --no-spec`
- [x] Adapter provider (`providers/payment-provider.interface.ts` + `providers/mock-payment.provider.ts`)
- [x] DTO checkout, refund, invoice
- [x] `PaymentsModule` exports `PaymentsService`; `forwardRef()` ke `OrdersModule` (circular, lihat konvensi §12)

## Fase 3 — Pembayaran prepaid (Fase 1 proyek)

- [x] `POST /payments/checkout` (buat transaksi di gateway, simpan `pending`)
- [x] `POST /payments/webhook` (verifikasi signature → update status) — idempotent (payment sudah `paid` → no-op), providerRef tak dikenal → `200` (bukan 404, biar gateway tak retry terus)
- [x] Saat `paid` → update order jadi `paid` (via `OrdersService.changeStatus()`, dalam transaksi yang sama — lihat konvensi §12 poin 3)
- [x] `GET /payments/order/:orderId`
- [x] COD: `createCodPayment()` (dipanggil checkout, tanpa gateway) + `markCodPaid()` (dipanggil delivery saat driver konfirmasi)
- [x] `payment_number` (PAY-YYYYMMDD-NNNN) & `refund_number` via sequence util

## Fase 4 — Refund

- [x] `POST /payments/:id/refund` (penuh/sebagian → status `refunded`/`partially_refunded`; refund berulang divalidasi `Σrefund <= amount`)

## Fase 5 — Invoice wholesale (Fase 3 proyek)

- [x] `POST /payments/invoices` (order wholesale → terbitkan invoice + due date)
- [x] `PATCH /payments/invoices/:id/pay` (juga memicu `OrdersService.changeStatus(orderId, 'paid')`)
- [x] Job/flag `overdue` bila lewat `due_date` — `PaymentsService.markOverdueInvoices()` (`@Cron(CronExpression.EVERY_DAY_AT_1AM)`, infra `@nestjs/schedule` `ScheduleModule.forRoot()` ditambahkan di `app.module.ts`), update `status='issued' AND due_date < current_date` → `overdue`; diverifikasi e2e dgn manipulasi `due_date` langsung + panggil method via DI (tidak ada endpoint HTTP trigger manual, memang cron internal)

## Fase 6 — Verifikasi

- [x] Uji alur mock: checkout → webhook → order `paid` (manual curl + e2e)
- [x] Uji refund (sebagian lalu penuh, ditolak setelah lunas)
- [x] Verifikasi signature webhook menolak payload palsu (401) + idempotency
- [x] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar (`payments`)
- [x] Tulis `test/payments.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md (18 test)
- [x] `pnpm test:e2e` hijau
- [x] `pnpm build` hijau & boot OK
- [x] Tandai selesai → lanjut `08. Delivery`

### Fix ditemukan saat testing

- [x] `POST /payments/webhook` default Nest 201, kontrak minta 200 → tambah `@HttpCode(200)` (pola sama dgn bug login/refresh modul 01, promo/validate modul 05 — lihat konvensi §8)
- [x] `checkout()` pesan error COD kurang spesifik (ketutup cek `order.status !== 'created'` yang jalan duluan) — urutan cek dibalik biar pesan `'Order COD tidak butuh pembayaran gateway'` yang muncul
- [x] `handleWebhook`/`payInvoice` awalnya update `payments`/`invoices` lalu panggil `OrdersService.changeStatus()` di TRANSAKSI TERPISAH — kalau `changeStatus` gagal, row pertama sudah kadung commit (state korup). Fix: wrap `this.db.transaction()`, oper `tx` ke `changeStatus()` (lihat konvensi §12 poin 3)
