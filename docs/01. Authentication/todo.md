# 01. Authentication — TODO

Aturan: **kerjakan per fase, urut**. Semua item di satu fase harus ✅ dulu sebelum lanjut ke fase berikutnya.
Referensi detail ada di [plan.md](./plan.md).

---

## Fase 0 — Setup & dependency

- [x] Install dependency: `@nestjs/jwt bcrypt cookie-parser class-validator class-transformer`
- [x] Install dev types: `@types/bcrypt @types/cookie-parser`
- [x] Tambah env di `.env` & `.env.example`: `JWT_SECRET`, `JWT_ACCESS_EXPIRES=15m`, `JWT_REFRESH_EXPIRES=7d` (+ `WEB_URL` untuk CORS)
- [x] Aktifkan `ValidationPipe` global + `cookie-parser` di `src/main.ts` (+ `setGlobalPrefix('api')` + `enableCors({ credentials: true })`)
- [x] Install `@nestjs/swagger`; aktifkan CLI plugin di `nest-cli.json`; setup `SwaggerModule` di `main.ts` (lihat konvensi §15)
- [x] Buka `http://localhost:3000/api/docs` → halaman Swagger tampil (200 OK, verified via curl + docs-json; retroactively tagged `regions.controller.ts` juga)

## Fase 1 — Schema & migration

- [x] Buat `src/modules/auth/auth.schema.ts` (enum `user_role`, `user_status`, tabel `users`, `refresh_tokens`)
- [x] Re-export schema di `src/database/schema.ts`
- [x] Generate migration: `pnpm db:generate` (`0001_spotty_squadron_supreme.sql`)
- [x] Apply migration: `pnpm db:migrate`
- [x] Verifikasi tabel ada (psql: `users` + `refresh_tokens` dengan FK cascade)

## Fase 2 — Scaffold file (Nest CLI)

- [x] `nest g service modules/auth --no-spec`
- [x] `nest g controller modules/auth --no-spec`
- [x] `nest g guard modules/auth/guards/jwt-auth --no-spec`
- [x] `nest g guard modules/auth/guards/roles --no-spec`
- [x] `nest g decorator modules/auth/decorators/roles --flat`
- [x] `nest g decorator modules/auth/decorators/current-user --flat`
- [x] `nest g decorator modules/auth/decorators/public --flat`
- [x] Buat `auth.constants.ts` (nama & opsi cookie) + folder `dto/` (`register.dto.ts`, `login.dto.ts` — **catatan**: `fullName` dihapus dari register, lihat fix docs di bawah)

## Fase 3 — Core logic (service)

- [x] Wiring `JwtModule` + `DRIZZLE` di `auth.module.ts` (`JwtModule.registerAsync` baca `JWT_SECRET`/`JWT_ACCESS_EXPIRES` dari `ConfigService`)
- [x] `register()` — cek email unik (409 kalau sudah ada), hash password (bcrypt cost 10), insert user role `retail`
- [x] `login()` — validasi email+password (pesan generik sama utk keduanya), cek `status suspended` (403), terbitkan access + refresh token
- [x] Simpan hash refresh token (sha256) ke tabel `refresh_tokens`
- [x] `refresh()` — validasi + rotasi refresh token (dalam transaksi: revoke lama, insert baru)
- [x] `logout()` — revoke refresh token

## Fase 4 — DTO & endpoint

- [x] `dto/register.dto.ts` + `dto/login.dto.ts` (class-validator) — **catatan**: `fullName` dihapus dari `register.dto.ts`, lihat catatan Fase 2
- [x] Endpoint `POST /auth/register` (set cookie, 201)
- [x] Endpoint `POST /auth/login` (set cookie, **200** — pakai `@HttpCode(200)` eksplisit, default Nest POST=201)
- [x] Endpoint `POST /auth/refresh` (**200** — sama, `@HttpCode(200)` eksplisit)
- [x] Endpoint `POST /auth/logout` (clear cookie, 204)
- [x] Endpoint `GET /auth/me` (pakai `JwtAuthGuard`, cek status dari DB real-time)

## Fase 5 — Guard & decorator

- [x] `JwtAuthGuard` — baca cookie `access_token`, verifikasi via `JwtService`, hormati `@Public()` (via `Reflector`)
- [x] `RolesGuard` — cek `@Roles(...)` vs `request.user.role`
- [x] `@Roles()`, `@CurrentUser()`, `@Public()` implemented (`CurrentUser` = `createParamDecorator`, bukan metadata)
- [x] Daftarkan guard **global** via `APP_GUARD` di `auth.module.ts` (urutan: JwtAuthGuard dulu baru RolesGuard)
- [x] **Retroaktif**: `AppController` (root `/`) & `RegionsController` (semua endpoint) ditandai `@Public()` — guard global otomatis memproteksi endpoint modul-modul sebelumnya juga, lihat [konvensi §10](../_conventions.md)

## Fase 6 — Verifikasi

- [x] Uji manual end-to-end via curl + cookie jar: register(201)→me(200)→refresh(200, token lama ter-revoke)→me dgn token baru(200)→logout(204)→refresh setelah logout(401)
- [x] Uji error case: duplicate email(409), password salah(401 pesan generik), email tak ada(401 pesan SAMA), tanpa cookie(401), validasi password pendek(400)
- [x] Uji role: endpoint ber-`@Roles('staff','admin')` sementara → role `retail` ditolak(403), role `staff` diterima(200) — endpoint test dihapus setelah verifikasi
- [x] Uji status `suspended`: `/auth/me` dgn access_token lama tapi status di-update ke suspended di DB → 403 (bukti cek real-time dari DB, bukan cache JWT); login saat suspended → 403
- [x] Verifikasi DB: `password_hash` format bcrypt (`$2b$10$...`), `token_hash` sha256 hex — tidak ada plaintext
- [x] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag `auth` yang benar; `/logout` & `/me` menampilkan `security: cookie`
- [x] `pnpm build` hijau & app boot tanpa error

## Fase 7 — Logging & Automated Testing (retrofit — lihat [konvensi §17](../_conventions.md#17-logging-wajib--pino-sudah-terpasang-sejak-modul-0001) & [§18](../_conventions.md#18-testing-wajib))

- [x] Pasang Pino (`nestjs-pino`) sebagai root infra (`src/logger/logger.module.ts`, di-import di `AppModule` sebelum modul lain; `main.ts` pakai `bufferLogs: true` + `app.useLogger()`) — berlaku untuk SEMUA modul selanjutnya, tidak perlu setup ulang
- [x] Redact cookie/authorization/password di log — diverifikasi: `set-cookie` & `cookie` header sama sekali tidak muncul di log request
- [x] Auto HTTP request-log (method/url/status/responseTime) diverifikasi jalan tanpa kode tambahan di controller
- [x] Setup infra e2e test: `test/utils/test-app.ts` (helper `createTestApp()`), `scripts/setup-test-db.sh` (provision + migrate + seed `roastery_test`), script `pnpm test:e2e` (dengan `test:e2e:setup` otomatis)
- [x] Tulis `test/auth.e2e-spec.ts` — 10 test: register (sukses/409/400), login (sukses-200/401 pesan generik ×2), `/me` tanpa cookie, alur lengkap login→me→refresh(rotasi)→me→logout→refresh gagal, status suspended (`/me` 403 + login 403)
- [x] Tulis `test/regions.e2e-spec.ts` (retrofit modul 00) — 4 test: list provinsi, 400 param kosong, cascade 4 level + kode pos, search
- [x] Unit test guard murni: `roles.guard.spec.ts` (5 test), `jwt-auth.guard.spec.ts` (4 test) — mock `Reflector`/`JwtService`, tanpa DB
- [x] Fix bonus ketemu pas nulis test: `DatabaseModule` sekarang implement `OnModuleDestroy` → `pg.Pool.end()` saat app/test shutdown (graceful shutdown produksi + Jest tidak lagi menggantung)
- [x] `pnpm test` (unit, 10 test) & `pnpm test:e2e` (14 test) hijau semua
- [x] Tandai modul **selesai** → lanjut `02. Customers`
