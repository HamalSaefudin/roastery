# 01. Authentication — API Contract

Kontrak endpoint modul auth. **Sumber acuan untuk frontend** (Storefront, CMS, Driver App).
Semua request/response `application/json` kecuali disebut lain.

## Konvensi umum

- **Base URL:** `/api` (mis. `POST /api/auth/login`).
- **Auth:** pakai **httpOnly cookie** (`access_token`, `refresh_token`). Frontend **tidak** menyimpan token manual — cukup `fetch(..., { credentials: 'include' })` / `axios` `withCredentials: true`.
- **Cookie di-set otomatis** oleh server pada `register`, `login`, `refresh`. Dihapus saat `logout`.
- **Format error** (konsisten seluruh API):

```json
{
  "statusCode": 401,
  "message": "Email atau password salah",
  "error": "Unauthorized"
}
```

- `message` bisa berupa string atau array string (error validasi).

### Objek `User` (dipakai di beberapa response)

```json
{
  "id": "uuid",
  "email": "user@mail.com",
  "role": "retail",
  "status": "active"
}
```

`role`: `retail` | `wholesale` | `staff` | `admin` | `driver`
`status`: `active` | `pending` | `suspended`

---

## POST /auth/register

Daftar akun retail baru. Setelah sukses, cookie langsung ter-set (user otomatis login).

**Auth:** Public

**Request body**

```json
{
  "email": "user@mail.com",
  "password": "min8char"
}
```

| field      | tipe   | wajib | aturan             |
| ---------- | ------ | ----- | ------------------ |
| `email`    | string | ya    | format email, unik |
| `password` | string | ya    | min 8 karakter     |

> Tabel `users` (modul ini) cuma kredensial + role — TIDAK ada `fullName` di sini. Nama lengkap diisi customer belakangan lewat `PATCH /customers/me` (lihat [02. Customers](../02.%20Customers/api-contract.md)).

**Response `201`**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@mail.com",
    "role": "retail",
    "status": "active"
  }
}
```

Header: `Set-Cookie: access_token=...; HttpOnly` + `refresh_token`.

**Error**

- `400` — validasi gagal (email/password tidak valid).
- `409` — email sudah terdaftar.

---

## POST /auth/login

**Auth:** Public

**Request body**

```json
{ "email": "user@mail.com", "password": "min8char" }
```

**Response `200`**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@mail.com",
    "role": "retail",
    "status": "active"
  }
}
```

Header: set cookie `access_token` + `refresh_token`.

**Error**

- `400` — validasi gagal.
- `401` — email/password salah.
- `403` — akun `suspended`.

---

## POST /auth/refresh

Tukar `refresh_token` (dari cookie) → `access_token` baru. Refresh token dirotasi.

**Auth:** butuh cookie `refresh_token`

**Request body:** _kosong_

**Response `200`**

```json
{ "ok": true }
```

Header: set cookie `access_token` (+ `refresh_token` baru).

**Error**

- `401` — refresh token tidak ada / kedaluwarsa / sudah di-revoke.

---

## POST /auth/logout

Revoke refresh token & hapus cookie.

**Auth:** butuh cookie

**Response `204`** — tanpa body. Header menghapus cookie (`Max-Age=0`).

---

## GET /auth/me

Data user yang sedang login.

**Auth:** `JwtAuthGuard` (cookie `access_token`)

**Response `200`**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@mail.com",
    "role": "retail",
    "status": "active"
  }
}
```

**Error**

- `401` — belum login / token invalid.

---

## Catatan untuk frontend

- Kalau dapat `401` di endpoint terproteksi → coba `POST /auth/refresh` sekali, lalu ulangi request. Kalau masih `401` → arahkan ke halaman login.
- Role menentukan akses: CMS butuh `staff`/`admin`, Driver App butuh `driver`, Storefront `retail`/`wholesale`.
