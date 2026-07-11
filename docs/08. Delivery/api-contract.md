# 08. Delivery — API Contract

Base URL `/api`. Auth via cookie. Endpoint driver butuh role `driver`, dispatch butuh `staff`/`admin`.

## Objek

### `DeliveryZone`

```json
{
  "id": "uuid",
  "name": "Bandung Kota",
  "districtCodes": ["32.73.01", "32.73.02"],
  "fee": 15000,
  "etaText": "1-2 hari",
  "isActive": true
}
```

### `Delivery`

```json
{
  "id": "uuid",
  "orderId": "uuid",
  "status": "assigned",
  "driver": { "id": "uuid", "name": "Budi", "phone": "0812xxxx" },
  "scheduledSlot": "2026-07-09 09:00-12:00",
  "deliveredAt": null
}
```

`status`: `pending` | `assigned` | `picked_up` | `en_route` | `delivered` | `failed`

---

## GET /delivery/zones _(public)_

**Response `200`:** `{ "data": DeliveryZone[] }`

## GET /delivery/fee _(public)_

**Query:** `?districtCode=32.73.01` (kode kecamatan dari modul regions)
**Response `200`:** `{ "zoneId": "uuid", "fee": 15000, "etaText": "1-2 hari" }`
**Error:** `404` di luar jangkauan.

## POST /delivery/zones _(staff/admin)_

**Body:** `{ "name": "Bandung Kota", "districtCodes": ["32.73.01"], "fee": 15000, "etaText": "1-2 hari" }`
**Response `201`:** `{ "zone": DeliveryZone }`

---

## GET /delivery/dispatch _(staff/admin)_

Papan pengiriman.
**Query:** `?status=pending`
**Response `200`:** `{ "data": [ { ...Delivery, "order": { "orderNumber", "address" } } ] }`

## POST /delivery/:id/assign _(staff/admin)_

**Body:** `{ "driverId": "uuid", "scheduledSlot"?: "2026-07-09 09:00-12:00" }`
**Response `200`:** `{ "delivery": Delivery }`. Status → `assigned`.

## GET /delivery/track/:orderId _(login)_

**Response `200`:** `{ "delivery": Delivery, "events": [ { "status", "note", "createdAt" } ] }`

---

## GET /delivery/driver/jobs _(driver)_ — Fase 2

**Response `200`:** `{ "data": Delivery[] }` (job milik driver login).

## PATCH /delivery/:id/status _(driver)_ — Fase 2

**Body:** `{ "status": "en_route", "lat"?: -6.9, "lng"?: 107.6, "note"?: "" }`
**Response `200`:** `{ "delivery": Delivery }`. Menambah `delivery_events`.

## POST /delivery/driver/location _(driver)_ — Fase 2

**Body:** `{ "lat": -6.9, "lng": 107.6 }`
**Response `204`**.

## POST /delivery/drivers _(staff/admin)_

**Body:** `{ "userId": "uuid", "name": "Budi", "phone": "0812xxxx", "vehicleId": "uuid" }`
**Response `201`:** `{ "driver": { "id", "name", "vehicle": { "id", "plateNumber", "type" } } }`

---

## Master Kendaraan (`vehicles`)  _(staff/admin)_

### `Vehicle`

```json
{ "id": "uuid", "plateNumber": "D 1234 AB", "type": "motor", "capacityKg": 20, "isActive": true }
```

`type`: `motor` | `mobil` | `van`

- `GET /delivery/vehicles` → `{ "data": Vehicle[] }`
- `POST /delivery/vehicles` → body `{ "plateNumber", "type", "capacityKg"? }` → `201 { "vehicle": Vehicle }`. `409` plat duplikat.
- `PATCH /delivery/vehicles/:id` → `200 { "vehicle": Vehicle }`

---

## Update Kontrak — 2026-07-09

1. Objek `Delivery` **TAMBAH field**: `"deliveryNumber": "DLV-20260709-0001"`, `"codAmount": 185000 | null`, `"codCollectedAt": null`.
2. **GET /delivery/fee — response baru (PENGGANTI, tidak ada 404 lagi):**

```json
{ "zoneId": "uuid", "fee": 15000, "etaText": "1-2 hari", "shippingMethod": "internal", "outOfZone": false }
```

Luar zona → `"shippingMethod": "external", "outOfZone": true`, fee = tarif flat zona fallback.

3. **Endpoint COD (baru):**

- `POST /delivery/:id/cod-collect` _(driver)_ — konfirmasi terima uang tunai. **Response `200`:** `{ "delivery": Delivery }`. **Error:** `403` bukan job-nya, `409` bukan delivery COD / sudah dikonfirmasi.
- `GET /delivery/driver/cod-balance` _(driver)_ — **Response `200`:** `{ "balance": 370000, "deliveries": [ { "deliveryNumber", "codAmount", "codCollectedAt" } ] }`
- `POST /delivery/cod-settlements` _(staff/admin)_ — body `{ "driverId": "uuid" }` → **`201`:** `{ "settlement": { "id", "settlementNumber", "amount", "status": "pending" } }`. **Error:** `409` tidak ada uang yang perlu disetor.
- `PATCH /delivery/cod-settlements/:id/confirm` _(staff/admin)_ — **`200`:** `{ "settlement": { ..., "status": "confirmed" } }`
