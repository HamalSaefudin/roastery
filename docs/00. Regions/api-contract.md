# 00. Regions (Master Wilayah) — API Contract

Base URL `/api`. Semua **read-only & publik** (dipakai form alamat). Data referensi (di-seed).

## Objek

```json
// Province
{ "code": "32", "name": "JAWA BARAT" }

// Regency (kabupaten/kota)
{ "code": "32.73", "provinceCode": "32", "name": "KOTA BANDUNG", "type": "kota" }

// District (kecamatan)
{ "code": "32.73.01", "regencyCode": "32.73", "name": "SUKASARI" }

// Village (kelurahan/desa)
{ "code": "32.73.01.1001", "districtCode": "32.73.01", "name": "GEGERKALONG", "postalCode": "40153" }
```

---

## GET /regions/provinces

Semua provinsi (34+).
**Response `200`:** `{ "data": Province[] }`

## GET /regions/regencies

**Query:** `?provinceCode=32` (wajib)
**Response `200`:** `{ "data": Regency[] }`
**Error:** `400` tanpa `provinceCode`.

## GET /regions/districts

**Query:** `?regencyCode=32.73` (wajib)
**Response `200`:** `{ "data": District[] }`

## GET /regions/villages

**Query:** `?districtCode=32.73.01` (wajib)
**Response `200`:** `{ "data": Village[] }` (termasuk `postalCode`).

## GET /regions/search  _(opsional)_

**Query:** `?q=bandung&level=regency`
**Response `200`:** `{ "data": [ { "code", "name", "level" } ] }`

---

## Catatan untuk frontend

- Form alamat pakai **dropdown bertingkat**: pilih provinsi → panggil `/regions/regencies` → dst.
- Simpan **kode** tiap level saat submit alamat (lihat [02. Customers](../02.%20Customers/api-contract.md)).
- `postalCode` otomatis dari kelurahan terpilih.
