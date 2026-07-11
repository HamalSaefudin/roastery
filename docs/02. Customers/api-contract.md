# 02. Customers — API Contract

Base URL `/api`. Auth via httpOnly cookie (`credentials: 'include'`). Format error standar lihat [01/api-contract](../01.%20Authentication/api-contract.md).

## Objek

### `CustomerProfile`

```json
{
  "id": "uuid",
  "userId": "uuid",
  "fullName": "Nama Lengkap",
  "phone": "0812xxxx",
  "customerType": "retail",
  "createdAt": "2026-07-08T00:00:00Z"
}
```

`customerType`: `retail` | `wholesale`

### `Address`

Referensi wilayah pakai **kode** dari modul [regions](../00.%20Regions/api-contract.md). Response menyertakan objek nama untuk tampilan.

```json
{
  "id": "uuid",
  "label": "Rumah",
  "recipientName": "Nama",
  "phone": "0812xxxx",
  "line1": "Jl. Contoh No. 1 RT01/RW02",
  "line2": null,
  "province": { "code": "32", "name": "JAWA BARAT" },
  "regency": { "code": "32.73", "name": "KOTA BANDUNG" },
  "district": { "code": "32.73.01", "name": "SUKASARI" },
  "village": { "code": "32.73.01.1001", "name": "GEGERKALONG" },
  "postalCode": "40153",
  "isDefault": true
}
```

---

## GET /customers/me

Profil user login (dibuat otomatis jika belum ada).
**Auth:** login. **Response `200`:** `{ "profile": CustomerProfile }`.

## PATCH /customers/me

**Auth:** login.
**Body:** `{ "fullName"?: string, "phone"?: string }`
**Response `200`:** `{ "profile": CustomerProfile }`

## GET /customers/me/addresses

**Auth:** login. **Response `200`:** `{ "addresses": Address[] }`

## POST /customers/me/addresses

**Body**

```json
{
  "label": "Rumah",
  "recipientName": "Nama",
  "phone": "0812xxxx",
  "line1": "Jl. Contoh No. 1 RT01/RW02",
  "line2": null,
  "provinceCode": "32",
  "regencyCode": "32.73",
  "districtCode": "32.73.01",
  "villageCode": "32.73.01.1001",
  "isDefault": true
}
```

`postalCode` diambil otomatis dari `villageCode`.
**Response `201`:** `{ "address": Address }`. **Error:** `400` validasi / kode wilayah tidak valid.

## PATCH /customers/me/addresses/:id

**Body:** subset field `Address`. **Response `200`:** `{ "address": Address }`. **Error:** `404`.

## DELETE /customers/me/addresses/:id

**Response `204`**. **Error:** `404`.

---

## POST /customers/me/wholesale-application

Ajukan jadi wholesale.
**Body:** `{ "businessName": string, "taxId"?: string }`
**Response `201`:** `{ "application": { "id", "status": "pending", "businessName", "createdAt" } }`
**Error:** `409` sudah ada pengajuan `pending`.

## GET /customers/me/wholesale-application

**Response `200`:** `{ "application": { "status": "pending|approved|rejected", "note": null } | null }`

---

## GET /customers  _(staff/admin)_

**Query:** `?search=&type=retail|wholesale&page=1&limit=20`
**Response `200`:** `{ "data": CustomerProfile[], "total": number, "page": number }`
**Error:** `403` bukan staff.

## GET /customers/wholesale-applications  _(staff/admin)_

**Query:** `?status=pending`
**Response `200`:** `{ "data": [ { "id", "customerId", "businessName", "taxId", "status", "createdAt" } ] }`

## PATCH /customers/wholesale-applications/:id  _(staff/admin)_

**Body:** `{ "decision": "approve" | "reject", "note"?: string }`
**Response `200`:** `{ "application": { "id", "status", "reviewedAt" } }`
Efek `approve`: `customerType` customer → `wholesale`.
**Error:** `404`, `409` (sudah diproses).

---

## Update Kontrak — 2026-07-09

Objek `CustomerProfile` **TAMBAH field** `"code": "CUS-000123"` (kode customer, unik, human-readable — tampil di CMS & akun customer). Berlaku di semua response yang memuat profil.
