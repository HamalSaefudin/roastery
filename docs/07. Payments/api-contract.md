# 07. Payments — API Contract

Base URL `/api`. Nominal integer (IDR). Provider-agnostic (`provider` + `providerRef`).

## Objek

### `Payment`

```json
{
  "id": "uuid",
  "orderId": "uuid",
  "provider": "midtrans",
  "method": "qris",
  "amount": 185000,
  "status": "pending",
  "paidAt": null
}
```

`status`: `pending` | `paid` | `failed` | `refunded` | `partially_refunded`

---

## POST /payments/checkout

Buat transaksi bayar untuk order (retail/prepaid).
**Auth:** login
**Body:** `{ "orderId": "uuid", "method"?: "qris" }`
**Response `201`**

```json
{
  "payment": { "id": "uuid", "status": "pending", "amount": 185000 },
  "paymentInstruction": {
    "type": "redirect",
    "redirectUrl": "https://gateway/pay/xxx",
    "qrString": null,
    "vaNumber": null,
    "expiresAt": "2026-07-08T01:00:00Z"
  }
}
```

Bentuk `paymentInstruction` tergantung `method` (redirect / QRIS / VA).
**Error:** `409` order sudah dibayar, `404` order.

## POST /payments/webhook

Callback dari gateway. **Publik** tapi wajib verifikasi signature.
**Body:** payload provider (bentuk sesuai gateway).
**Response `200`:** `{ "received": true }`. Efek: update `payment.status`; jika `paid` → order `paid`.
**Error:** `401` signature invalid.

## GET /payments/order/:orderId

**Auth:** login. **Response `200`:** `{ "payment": Payment }`.

---

## POST /payments/:id/refund  _(staff/admin)_

**Body:** `{ "amount"?: 50000, "reason"?: "barang rusak" }` (tanpa `amount` = refund penuh)
**Response `201`:** `{ "refund": { "id", "amount", "status" }, "payment": Payment }`

## POST /payments/invoices  _(staff/admin)_ — Fase 3

**Body:** `{ "orderId": "uuid", "dueDate": "2026-08-07" }`
**Response `201`:** `{ "invoice": { "id", "invoiceNumber", "amount", "dueDate", "status": "issued" } }`

## PATCH /payments/invoices/:id/pay  _(staff/admin)_

**Response `200`:** `{ "invoice": { "id", "status": "paid", "paidAt" } }`

---

## Update Kontrak — 2026-07-09

1. Objek `Payment` **TAMBAH field** `"paymentNumber": "PAY-20260709-0001"`; `method` kini bisa `"cod"`.
2. **COD**: tidak ada panggilan `POST /payments/checkout` (order COD dibuat langsung `processing` saat checkout — lihat kontrak 06). `GET /payments/order/:orderId` untuk order COD mengembalikan payment `method: "cod"`, `status: "pending"` sampai driver konfirmasi terima uang → `"paid"`.
3. `POST /payments/checkout` pada order COD → `409`.
