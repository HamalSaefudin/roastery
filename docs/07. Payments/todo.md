# 07. Payments — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup & keputusan

- [ ] **Pilih payment gateway** (Midtrans / Xendit)
- [ ] Daftar akun sandbox + simpan kredensial di `.env`
- [ ] Pastikan `orders` selesai

## Fase 1 — Schema & migration

- [ ] `payments` + enum `payment_status`
- [ ] `refunds`
- [ ] `invoices` + enum `invoice_status`
- [ ] Re-export di `src/database/schema.ts`
- [ ] `pnpm db:generate` → `pnpm db:migrate`

## Fase 2 — Scaffold file (Nest CLI)

- [ ] `nest g service modules/payments --no-spec`
- [ ] `nest g controller modules/payments --no-spec`
- [ ] Adapter provider (`providers/<gateway>.ts`)
- [ ] DTO checkout, refund, invoice

## Fase 3 — Pembayaran prepaid (Fase 1 proyek)

- [ ] `POST /payments/checkout` (buat transaksi di gateway, simpan `pending`)
- [ ] `POST /payments/webhook` (verifikasi signature → update status)
- [ ] Saat `paid` → update order jadi `paid`
- [ ] `GET /payments/order/:orderId`
- [ ] COD: `createCodPayment()` (dipanggil checkout, tanpa gateway) + `markCodPaid()` (dipanggil delivery saat driver konfirmasi)
- [ ] `payment_number` (PAY-YYYYMMDD-NNNN) & `refund_number` via sequence util

## Fase 4 — Refund

- [ ] `POST /payments/:id/refund` (penuh/sebagian → status `refunded`/`partially_refunded`)

## Fase 5 — Invoice wholesale (Fase 3 proyek)

- [ ] `POST /payments/invoices` (order wholesale → terbitkan invoice + due date)
- [ ] `PATCH /payments/invoices/:id/pay`
- [ ] Job/flag `overdue` bila lewat `due_date`

## Fase 6 — Verifikasi

- [ ] Uji sandbox: checkout → webhook → order `paid`
- [ ] Uji refund
- [ ] Verifikasi signature webhook menolak payload palsu
- [ ] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar
- [ ] Tulis `test/payments.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md (lihat konvensi §18)
- [ ] `pnpm test:e2e` hijau
- [ ] `pnpm build` hijau & boot OK
- [ ] Tandai selesai → lanjut `08. Delivery`
