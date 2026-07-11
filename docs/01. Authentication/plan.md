# 01. Authentication — Plan

Modul: `src/modules/auth`
Fase proyek: **Fase 1 (MVP)** — fondasi login untuk semua client.

## Tujuan

Bikin **login/logout & sesi user** untuk seluruh client (Storefront, CMS, Driver App).
Autentikasi pakai **JWT yang disimpan di httpOnly cookie** (bukan localStorage → aman dari XSS).
Mengatur **role**: `retail`, `wholesale`, `staff`, `admin`, `driver`.

## Ketergantungan

- `config` — baca `JWT_SECRET`, `JWT_EXPIRES_IN`, dll dari `.env`.
- `database` — akses Drizzle (token `DRIZZLE`).
- Modul lain akan pakai **guard** dari sini untuk proteksi endpoint.

## Dependency yang perlu di-install

```bash
pnpm add @nestjs/jwt bcrypt cookie-parser class-validator class-transformer
pnpm add -D @types/bcrypt @types/cookie-parser
```

> Catatan: kita pakai `@nestjs/jwt` + guard custom (tanpa Passport) biar simpel & kontrol penuh atas cookie.

## Yang di-generate lewat Nest CLI

```bash
pnpm exec nest g service modules/auth --no-spec
pnpm exec nest g controller modules/auth --no-spec
pnpm exec nest g guard modules/auth/guards/jwt-auth --no-spec
pnpm exec nest g guard modules/auth/guards/roles --no-spec
pnpm exec nest g decorator modules/auth/decorators/roles --flat
pnpm exec nest g decorator modules/auth/decorators/current-user --flat
pnpm exec nest g decorator modules/auth/decorators/public --flat
```

File non-CLI (dibuat manual, karena bukan module/controller/service/guard/decorator):

- `src/modules/auth/auth.schema.ts` — schema Drizzle.
- `src/modules/auth/dto/login.dto.ts`, `dto/register.dto.ts` — DTO + validasi.
- `src/modules/auth/auth.constants.ts` — nama cookie, opsi cookie.

## Schema DB (Drizzle → Postgres)

File: `src/modules/auth/auth.schema.ts`, lalu re-export di `src/database/schema.ts`.

### enum `user_role`

`retail` | `wholesale` | `staff` | `admin` | `driver`

### enum `user_status`

`active` | `pending` | `suspended`

### tabel `users`

| kolom           | tipe                     | keterangan          |
| --------------- | ------------------------ | ------------------- |
| `id`            | uuid PK (default random) | id user             |
| `email`         | text unique not null     | dipakai untuk login |
| `password_hash` | text not null            | hasil bcrypt        |
| `role`          | `user_role` not null     | default `retail`    |
| `status`        | `user_status` not null   | default `active`    |
| `created_at`    | timestamptz not null     | default now         |
| `updated_at`    | timestamptz not null     | default now         |

### tabel `refresh_tokens` (rotasi sesi)

| kolom        | tipe                 | keterangan                             |
| ------------ | -------------------- | -------------------------------------- |
| `id`         | uuid PK              |                                        |
| `user_id`    | uuid FK → users.id   | on delete cascade                      |
| `token_hash` | text not null        | hash dari refresh token (jangan plain) |
| `expires_at` | timestamptz not null | kapan kedaluwarsa                      |
| `revoked_at` | timestamptz null     | diisi saat logout / rotasi             |
| `created_at` | timestamptz not null | default now                            |

> Relasi profil customer (alamat, tipe retail/wholesale) **bukan** di sini — itu di modul `customers`. Tabel `users` cuma kredensial + role.

## Router & Controller

Base path: `/auth`

| Method | Route            | Auth         | Fungsi                                                      |
| ------ | ---------------- | ------------ | ----------------------------------------------------------- |
| POST   | `/auth/register` | Public       | Daftar akun retail baru → buat user, set cookie             |
| POST   | `/auth/login`    | Public       | Login email+password → set httpOnly cookie (access+refresh) |
| POST   | `/auth/refresh`  | Cookie       | Tukar refresh token → access token baru (rotasi)            |
| POST   | `/auth/logout`   | Cookie       | Revoke refresh token + hapus cookie                         |
| GET    | `/auth/me`       | JwtAuthGuard | Data user yang sedang login                                 |

### Perilaku cookie

- `access_token` → httpOnly, `secure` (prod), `sameSite=lax`, umur pendek (mis. 15m).
- `refresh_token` → httpOnly, path `/auth/refresh`, umur panjang (mis. 7d).
- Konstanta cookie & opsi di `auth.constants.ts`.
- `cookie-parser` di-`app.use()` pada `main.ts`.

### Guard & Decorator

- `JwtAuthGuard` — baca `access_token` dari cookie, verifikasi, tempel `user` ke request. Hormati `@Public()`.
- `RolesGuard` — cek `@Roles(...)` vs role user.
- `@Roles(...roles)` — batasi endpoint per role.
- `@CurrentUser()` — ambil user dari request di handler.
- `@Public()` — tandai endpoint yang skip auth.

## Definition of Done

- Bisa register → login → dapat cookie → akses `/auth/me` → logout.
- Endpoint ber-`@Roles` menolak role yang salah (403).
- Migration ter-generate & ter-apply (tabel `users`, `refresh_tokens` ada di DB).

## Aturan Implementasi (WAJIB)

> Ikuti konvensi global di [_conventions.md](../_conventions.md).

1. **JWT payload** (access token): `{ sub: user.id, email: user.email, role: user.role }`. Jangan tambah field lain.
2. **bcrypt cost = 10** (`bcrypt.hash(password, 10)`).
3. Nama cookie persis: `access_token` dan `refresh_token` (definisikan di `auth.constants.ts`).
4. Opsi cookie: `httpOnly: true`, `sameSite: 'lax'`, `secure: process.env.NODE_ENV === 'production'`, `path: '/'` untuk access, `path: '/api/auth'` untuk refresh.
5. **Login gagal**: email tidak ada ATAU password salah → error message SAMA (`Email atau password salah`, 401). Jangan bedakan, biar tidak bocor info akun.
6. **Register** selalu membuat user `role: 'retail'`, `status: 'active'`. Role lain (staff/admin/driver) dibuat manual lewat DB/seed — tidak ada endpoint register untuk role itu.
7. **Alur refresh (rotasi)** — langkah persis:
   1. Baca `refresh_token` dari cookie; kalau tidak ada → 401.
   2. Hash token (sha256) → cari di tabel `refresh_tokens` yang `revoked_at IS NULL` dan `expires_at > now()`. Tidak ketemu → 401.
   3. Set `revoked_at = now()` pada token lama.
   4. Terbitkan access token baru + refresh token baru (simpan hash-nya, expires 7 hari).
   5. Set kedua cookie baru.
8. **Logout**: revoke refresh token di DB + `res.clearCookie` kedua cookie → 204.
9. Simpan refresh token di DB **hanya hash-nya** (sha256), tidak pernah plain.
10. Daftarkan `JwtAuthGuard` & `RolesGuard` sebagai `APP_GUARD` global di `auth.module.ts`; endpoint publik dikasih `@Public()` (register, login, refresh — refresh cek cookie manual di dalam handler).
11. `GET /auth/me` ambil data dari DB (bukan cuma dari JWT) supaya `status` terbaru ikut; kalau `status = suspended` → 403.

## Update — 2026-07-11 (Logging & Automated Testing)

Ditambahkan setelah modul ini "selesai" — retrofit karena awalnya kelewat dari scope. Detail lengkap di [konvensi §17 (Logging)](../_conventions.md) & [§18 (Testing)](../_conventions.md).

1. **Logger Pino** dipasang sebagai root infra (`src/logger/logger.module.ts`) — sekali setup, berlaku semua modul. Modul lain cukup pakai `new Logger(ClassName.name)` dari `@nestjs/common` seperti biasa.
2. **`DatabaseModule` diperbaiki** untuk graceful shutdown: token baru `PG_POOL` (`src/database/drizzle.constants.ts`) + `DatabaseModule implements OnModuleDestroy` yang panggil `pool.end()`. Tanpa ini, koneksi pg menggantung saat app/test shutdown.
3. **Infra e2e test** dibuat di sini (konsumen pertama): `test/utils/test-app.ts`, `scripts/setup-test-db.sh`, DB terpisah `roastery_test`, script `pnpm test:e2e`. Modul berikutnya tinggal ikuti pola `test/<modul>.e2e-spec.ts`.
4. File test modul ini: `test/auth.e2e-spec.ts` (e2e), `src/modules/auth/guards/*/*.spec.ts` (unit test guard).
