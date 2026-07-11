# 09. Service Desk — API Contract

Base URL `/api`. Auth via cookie. Endpoint admin butuh role `staff`/`admin`.

## Objek

### `Warranty`

```json
{
  "id": "uuid",
  "serialNumber": "SN-2026-0001",
  "productName": "Rocket Appartamento",
  "startsAt": "2026-07-08",
  "endsAt": "2028-07-08",
  "isActive": true
}
```

### `RepairTicket`

```json
{
  "id": "uuid",
  "ticketNumber": "RPR-20260708-001",
  "issue": "Mesin tidak panas",
  "status": "open",
  "isWarranty": true,
  "assignedTo": null,
  "cost": null,
  "scheduledAt": null,
  "createdAt": "2026-07-08T00:00:00Z"
}
```

`status`: `open` | `diagnosing` | `in_progress` | `waiting_parts` | `completed` | `cancelled`

---

## POST /service-desk/warranties  _(login)_

Registrasi garansi via nomor seri.
**Body:** `{ "serialNumber": "SN-2026-0001", "orderId"?: "uuid" }`
**Response `201`:** `{ "warranty": Warranty }`
**Error:** `404` serial tidak ditemukan, `409` sudah teregistrasi.

## GET /service-desk/warranties  _(login)_

**Response `200`:** `{ "data": Warranty[] }` (milik sendiri).

---

## POST /service-desk/repairs  _(login)_

**Body**

```json
{ "issue": "Mesin tidak panas", "serialNumber": "SN-2026-0001", "warrantyId": "uuid" }
```

`warrantyId` opsional; jika valid & aktif → `isWarranty=true`.
**Response `201`:** `{ "ticket": RepairTicket }`.

## GET /service-desk/repairs  _(login)_

**Response `200`:** `{ "data": RepairTicket[] }` (milik sendiri).

---

## GET /service-desk/repairs/admin  _(staff/admin)_

**Query:** `?status=&assignedTo=&page=1`
**Response `200`:** `{ "data": RepairTicket[], "total" }`

## PATCH /service-desk/repairs/:id  _(staff/admin)_

**Body**

```json
{
  "status": "in_progress",
  "assignedTo": "uuid",
  "cost": 250000,
  "scheduledAt": "2026-07-10T10:00:00Z",
  "note": "ganti heating element",
  "parts": [{ "name": "heating element", "qty": 1 }]
}
```

**Response `200`:** `{ "ticket": RepairTicket }`. Menambah `repair_updates`.
