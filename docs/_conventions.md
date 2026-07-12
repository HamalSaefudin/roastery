# Konvensi Implementasi (WAJIB DIBACA SEBELUM NGODING)

Dokumen ini adalah **aturan global** untuk mengimplementasikan semua modul di `roastery-service`.
Setiap modul punya folder docs sendiri (`00.` – `10.`) berisi `plan.md`, `todo.md`, `api-contract.md`.
**Jangan menyimpang dari konvensi ini.** Kalau plan modul bertentangan dengan file ini, ikuti plan modul.

---

## 1. Cara kerja

1. Kerjakan modul **sesuai nomor urut folder** (00 → 10), kecuali diminta lain.
2. Di dalam modul, kerjakan **fase di `todo.md` secara urut**. Satu fase selesai semua ✅ dulu baru fase berikutnya. **Kecuali**: item yang isinya "verifikasi integrasi dengan modul lain yang belum dibangun" (mis. modul fondasi menunggu modul konsumennya) — item begitu boleh tetap `[ ]` dengan catatan kapan akan dicentang; itu bukan penghalang lanjut ke modul berikutnya.
3. Setiap selesai satu item, **centang** di `todo.md` (`- [ ]` → `- [x]`).
4. **Module/controller/service/guard/decorator WAJIB dibuat pakai Nest CLI** (`pnpm exec nest g ...`), jangan bikin file manual. File lain (schema, DTO, constants) boleh manual.
5. Setelah tiap fase: `pnpm build` harus hijau. Kalau ada perubahan schema: `pnpm db:generate` lalu `pnpm db:migrate`.
6. **Jangan edit file SQL hasil migrate di folder `drizzle/` secara manual.**
7. Skrip standalone (seed, dll) taruh di `scripts/` root **dan wajib** ada di `exclude` milik `tsconfig.build.json` — kalau tidak, `tsc` ikut compile file itu dan `dist/main.js` bergeser jadi `dist/src/main.js` (app gagal start). Jalankan skrip standalone pakai `tsx` (bukan lewat `nest build`), lihat pola di `scripts/seed-regions.ts`.
8. **`pnpm` TIDAK otomatis menjalankan script `pre<nama>`/`post<nama>` seperti npm** (`pretest:e2e` tidak akan jalan sendiri sebelum `test:e2e`, beda dari kebiasaan npm). Kalau butuh setup wajib sebelum sebuah script, **rantai eksplisit** pakai `&&` di script yang sama (`"test:e2e": "pnpm test:e2e:setup && jest ..."`), jangan andalkan penamaan `pre*`/`post*`. Ini ketauan lewat testing beneran (`pnpm test:e2e` sempat gagal karena tabel belum ter-migrate ke DB test), bukan dari baca dokumentasi pnpm — selalu verifikasi command chain benar-benar jalan, jangan asumsi.

## 2. Naming

| Hal                  | Konvensi           | Contoh                                    |
| -------------------- | ------------------ | ----------------------------------------- |
| Tabel DB             | snake_case, plural | `bean_variants`                           |
| Kolom DB             | snake_case         | `created_at`                              |
| Enum DB              | snake_case         | `order_status`                            |
| Property TS/JSON API | camelCase          | `createdAt`                               |
| File                 | kebab-case         | `auth.schema.ts`, `create-product.dto.ts` |
| Class                | PascalCase         | `CreateProductDto`                        |
| Route                | kebab-case, plural | `/catalog/products`                       |

Mapping kolom: Drizzle field camelCase → nama kolom snake_case ditulis eksplisit, contoh: `createdAt: timestamp('created_at', ...)`.

## 3. Struktur folder per modul

```
src/modules/<modul>/
├── <modul>.module.ts        # dari CLI (sudah ada)
├── <modul>.controller.ts    # dari CLI
├── <modul>.service.ts       # dari CLI
├── <modul>.schema.ts        # manual — schema Drizzle
├── <modul>.constants.ts     # manual — konstanta (kalau perlu)
└── dto/
    ├── create-<x>.dto.ts
    └── update-<x>.dto.ts
```

Setiap `*.schema.ts` **wajib di-re-export** di `src/database/schema.ts`:

```ts
export * from "../modules/auth/auth.schema";
```

## 4. Setup `main.ts` (dikerjakan sekali, di modul 01 Fase 0)

```ts
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api"); // semua route di bawah /api
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: [process.env.WEB_URL ?? "http://localhost:3001"],
    credentials: true, // WAJIB true karena auth pakai cookie
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

## 5. Pola schema Drizzle

Contoh lengkap — tiru pola ini untuk semua tabel:

```ts
// src/modules/auth/auth.schema.ts
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  date,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "retail",
  "wholesale",
  "staff",
  "admin",
  "driver",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("retail"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// FK: selalu tulis eksplisit + aturan delete
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // ...
});
```

Aturan tipe:

- PK: `uuid('id').defaultRandom().primaryKey()` — kecuali `regions` (pakai kode resmi `text` PK).
- Waktu: `timestamp('...', { withTimezone: true })`; tanggal saja: `date('...')`.
- **Uang: `integer` rupiah bulat** (tidak ada desimal, tidak pakai float/numeric). Currency default `IDR`.
- Soft delete pakai kolom `is_active boolean default true` — **jangan** hard delete data yang direferensikan.
- **FK ke `users` yang sifatnya "siapa yang melakukan X" (reviewer/approver/assignee/teknisi, mis. `reviewed_by`, `assigned_to`) pakai `{ onDelete: 'set null' }`**, BUKAN `cascade` dan BUKAN default (`no action`). Alasan: kalau staf/reviewer itu dihapus dari sistem nanti, record histori (order, aplikasi, tiket) harus tetap ada — jangan ikut kehapus (`cascade` salah) dan jangan sampai user itu tidak bisa dihapus sama sekali (`no action`/default bikin FK constraint block delete). Beda dengan FK "pemilik data" (mis. `customer_profiles.user_id`, `orders.customer_id`) yang memang harus `cascade` karena datanya milik entitas itu.

## 6. Akses DB di service

```ts
import { Inject, Injectable } from "@nestjs/common";
import { eq, and, ilike, sql } from "drizzle-orm";
import { DRIZZLE } from "../../database/drizzle.constants";
import type { DrizzleDB } from "../../database/drizzle.constants";
import { users } from "./auth.schema";

@Injectable()
export class AuthService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByEmail(email: string) {
    return this.db.query.users.findFirst({ where: eq(users.email, email) });
  }
}
```

> **Wajib**: `DrizzleDB` diimpor dengan `import type` **terpisah** dari `DRIZZLE` (bukan satu baris `import { DRIZZLE, DrizzleDB }`). Karena `isolatedModules` + `emitDecoratorMetadata` aktif di `tsconfig.json`, tipe yang dipakai di constructor ber-decorator (`@Inject`) wajib type-only import — kalau tidak, `pnpm build` gagal dengan error TS1272.

Operasi multi-tabel yang harus konsisten (checkout, approve wholesale, assign default address) **wajib pakai transaksi**:

```ts
await this.db.transaction(async (tx) => {
  await tx.insert(orders).values(...);
  await tx.update(beanStock).set(...);
});
```

## 7. DTO & validasi

Semua body request divalidasi lewat DTO + class-validator. Contoh:

```ts
// dto/register.dto.ts
import { IsEmail, IsString, MinLength, IsOptional } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}
```

Field opsional selalu `@IsOptional()` + `?`. Enum pakai `@IsIn([...])` atau `@IsEnum(...)`.

## 8. Bentuk response (WAJIB seragam)

- Objek tunggal: dibungkus nama objeknya → `{ "user": {...} }`, `{ "order": {...} }`.
- List + pagination: `{ "data": [...], "total": number, "page": number, "limit": number }`.
- Delete sukses: HTTP `204`, tanpa body (`@HttpCode(204)`).
- Create sukses: HTTP `201` (default POST di Nest). **Kalau api-contract bilang endpoint POST return `200`** (mis. login, refresh, validate, webhook — bukan "membuat resource baru"), **wajib tambahkan `@HttpCode(200)` eksplisit** di handler, jangan andalkan default. Selalu cocokkan dengan status code yang tertulis di api-contract.md tiap modul.
- **Jangan pernah return `password_hash`, `token_hash`**, atau field sensitif lain.

Pagination default: `page=1`, `limit=20`, `limit` maksimum `100`. Rumus: `offset = (page - 1) * limit`.

## 9. Error (WAJIB pakai exception bawaan Nest)

| Situasi                                                        | Exception                      | HTTP |
| -------------------------------------------------------------- | ------------------------------ | ---- |
| Validasi gagal                                                 | otomatis dari ValidationPipe   | 400  |
| Belum login / token invalid                                    | `UnauthorizedException`        | 401  |
| Login tapi role salah / bukan pemilik resource                 | `ForbiddenException`           | 403  |
| Data tidak ditemukan                                           | `NotFoundException`            | 404  |
| Duplikat / konflik state (stok kurang, transisi status ilegal) | `ConflictException`            | 409  |
| Aturan bisnis gagal (promo invalid saat checkout)              | `UnprocessableEntityException` | 422  |

Format JSON error mengikuti default Nest: `{ "statusCode", "message", "error" }` — jangan bikin format sendiri.

## 10. Auth, guard, role

- Login pakai **httpOnly cookie**: `access_token` (15 menit) & `refresh_token` (7 hari). Detail di modul `01. Authentication`.
- `JwtAuthGuard` + `RolesGuard` didaftarkan **global** via `APP_GUARD` (di `auth.module.ts`). Karena global, **SEMUA endpoint di SEMUA modul (termasuk yang dibuat sebelum modul 01) butuh `@Public()` eksplisit kalau memang publik** — tanpa itu, request akan kena `401` walau endpoint-nya seharusnya publik. Setelah modul 01 selesai, cek ulang controller yang sudah dibuat sebelumnya (mis. modul 00 Regions) sudah ditandai `@Public()` dengan benar.
- Endpoint publik ditandai `@Public()` (bisa di level `@Controller()` kalau semua endpoint di situ publik, seperti `RegionsController`).
- Endpoint role tertentu ditandai `@Roles('staff', 'admin')`.
- Ambil user login: `@CurrentUser() user` → berisi `{ id, email, role }` dari JWT payload.
- Cek kepemilikan: query resource harus difilter `customer_id` milik user login — kalau bukan miliknya lempar `ForbiddenException` (atau `NotFoundException` biar tidak bocor info).
- **Soft-auth (opsional login) di endpoint `@Public()`** (mis. `GET /pricing/resolve` — publik, tapi kalau login dapat harga wholesale): `JwtAuthGuard` (sejak modul 05) tetap MENCOBA baca+verify cookie `access_token` walau endpoint `@Public()`, dan nempelin `request.user` kalau valid — tapi TIDAK PERNAH throw 401 di endpoint `@Public()` (cookie kosong/basi/invalid tetap lolos, cuma `request.user` jadi `undefined`). Di controller, pakai `@CurrentUser() user?: RequestUser` (optional) untuk endpoint begini, BUKAN `RequestUser` non-optional biasa.

## 11. Slug

Fungsi util bersama (`src/common/slug.util.ts`, buat sekali di modul 03):
`name` → lowercase → ganti non-alfanumerik jadi `-` → trim `-`. Kalau slug sudah ada di tabel, tambahkan suffix `-2`, `-3`, dst.

## 12. Status & transisi

Semua perubahan status (order, delivery, repair) **wajib divalidasi** terhadap tabel transisi yang ada di plan modul masing-masing. Transisi di luar tabel → `ConflictException`. Perubahan status selalu dicatat ke tabel history/events modul tsb.

## 13. Environment variable

Semua env baru **wajib ditambahkan ke `.env` DAN `.env.example`**. Akses lewat `ConfigService` (`config.getOrThrow('NAMA')`), jangan `process.env` langsung (kecuali `main.ts` & `drizzle.config.ts`).

## 14. Definition of Done per fase

Fase dianggap selesai kalau:

1. Semua checkbox fase itu ✅.
2. `pnpm build` hijau.
3. App boot tanpa error (`pnpm start:dev` lalu lihat log "successfully started").
4. Kalau fase menyentuh schema: migration ter-generate & ter-apply tanpa error.

## 15. Swagger / OpenAPI (dokumentasi API otomatis)

Setup **sekali** di modul `01. Authentication` Fase 0, setelah itu tiap modul cukup pakai decorator.

**Install:**

```bash
pnpm add @nestjs/swagger
```

**Aktifkan CLI plugin** di `nest-cli.json` (supaya property DTO otomatis terbaca Swagger tanpa `@ApiProperty()` manual satu-satu):

```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "plugins": ["@nestjs/swagger"]
  }
}
```

**Setup di `main.ts`** (tambahkan SEBELUM `app.listen`, setelah pipes/cors):

```ts
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

const swaggerConfig = new DocumentBuilder()
  .setTitle("Roastery API")
  .setDescription(
    "Service API roastery — kontrak detail per modul ada di folder docs/",
  )
  .setVersion("1.0")
  .addCookieAuth("access_token") // auth pakai httpOnly cookie
  .build();
const document = SwaggerModule.createDocument(app, swaggerConfig);
SwaggerModule.setup("api/docs", app, document); // UI di /api/docs
```

**Aturan pemakaian per modul (WAJIB):**

1. Setiap controller diberi `@ApiTags('<nama-modul>')` — mis. `@ApiTags('auth')`, `@ApiTags('catalog')`. Sub-modul pakai nama sendiri (`brands`, `zones`, dst).
2. Endpoint non-publik diberi `@ApiCookieAuth()` di controller/handler supaya muncul ikon gembok.
3. DTO **tidak perlu** `@ApiProperty()` manual — CLI plugin membacanya dari tipe + class-validator. Cukup tambah manual kalau butuh `example`/deskripsi khusus.
4. Handler penting boleh diberi `@ApiOperation({ summary: '...' })` — ringkas, bahasa Indonesia.
5. Swagger hanyalah **dokumentasi**; sumber kebenaran kontrak tetap `api-contract.md` tiap modul. Kalau beda, ikuti api-contract lalu betulkan decorator.
6. Verifikasi tiap modul: buka `http://localhost:3000/api/docs` → endpoint modul muncul di tag-nya & bisa "Try it out".

## 16. ID & Kode Publik + Sequence (WAJIB — keputusan 2026-07-09)

**Prinsip:** primary key semua tabel tetap **uuid internal** (untuk relasi antar-tabel, TIDAK pernah ditampilkan di UI). Entitas yang dilihat/disebut manusia dapat kolom **kode publik unik** ber-sequence, format **`PREFIX-ANGKA`** (prefix pendek + dash). API & frontend menampilkan kode, bukan uuid.

### Registry kode (semua entitas ber-sequence)

| Entitas | Kolom | Prefix | Reset | Pad | Contoh |
| --- | --- | --- | --- | --- | --- |
| `customer_profiles` | `code` | `CUS` | global | 6 | `CUS-000123` |
| `products` (bean) | `code` | `BEN` | global per tipe | 6 | `BEN-000042` |
| `products` (machine) | `code` | `MCH` | global per tipe | 6 | `MCH-000007` |
| `products` (grinder) | `code` | `GRD` | global per tipe | 6 | `GRD-000011` |
| `orders` | `order_number` | `ORD` | per hari | 4 | `ORD-20260709-0001` |
| `payments` | `payment_number` | `PAY` | per hari | 4 | `PAY-20260709-0001` |
| `refunds` | `refund_number` | `RFD` | per hari | 3 | `RFD-20260709-001` |
| `invoices` | `invoice_number` | `INV` | per bulan | 4 | `INV-202607-0001` |
| `deliveries` | `delivery_number` | `DLV` | per hari | 4 | `DLV-20260709-0001` |
| `cod_settlements` | `settlement_number` | `STL` | per hari | 2 | `STL-20260709-01` |
| `repair_tickets` | `ticket_number` | `RPR` | per hari | 3 | `RPR-20260709-001` |
| `warranties` | `warranty_number` | `WRT` | global | 6 | `WRT-000123` |

**BUKAN sequence** (jangan dibikin sequence):
- `bean_variants.sku` — **derived**, auto-generate: `<kodeProduk>-<berat>-<GILING>` → `BEN-000042-250-V60` (grind uppercase; `whole` → `WB`). Bukan input manual.
- `equipment_units.serial_number` — dari pabrikan, input manual staff.
- `orders.pickup_code` — 6 karakter random (bukan urut, biar tidak bisa ditebak).
- Master data (brands/origins/categories/zones/vehicles) — pakai slug/plat, tidak perlu kode.

### Mekanisme: tabel counter transaksional (bukan `CREATE SEQUENCE`)

Pakai tabel counter yang di-increment **di dalam transaksi insert yang sama** — hasilnya **gapless** (kalau transaksi rollback, counter ikut rollback) dan aman dari race (row lock). Native Postgres SEQUENCE tidak dipakai karena non-transaksional (bolong kalau rollback).

**Schema** — `src/database/sequences.schema.ts` (dibuat pertama kali di **modul 02 Fase 1**, konsumen pertama; re-export di barrel):

```ts
import { bigint, pgTable, text } from 'drizzle-orm/pg-core';

export const sequenceCounters = pgTable('sequence_counters', {
  name: text('name').primaryKey(), // mis. 'product_bean', 'order:20260709', 'invoice:202607'
  value: bigint('value', { mode: 'number' }).notNull().default(0),
});
```

**Helper** — `src/common/sequence.util.ts` (fungsi murni, dipanggil dengan `tx` transaksi aktif):

```ts
import { sql } from 'drizzle-orm';

/** Ambil nilai berikutnya utk counter `name`. WAJIB dipanggil di dalam transaksi insert-nya. */
export async function nextSequence(tx: any, name: string): Promise<number> {
  const res = await tx.execute(sql`
    INSERT INTO sequence_counters (name, value) VALUES (${name}, 1)
    ON CONFLICT (name) DO UPDATE SET value = sequence_counters.value + 1
    RETURNING value
  `);
  return Number(res.rows[0].value);
}

const pad = (n: number, w: number) => String(n).padStart(w, '0');
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
const ym = (d: Date) => ymd(d).slice(0, 6);

/** Bentuk kode publik sesuai registry §16. */
export async function nextCode(
  tx: any,
  opts: { prefix: string; scope: 'global' | 'daily' | 'monthly'; width: number; counter?: string },
): Promise<string> {
  const now = new Date();
  const base = opts.counter ?? opts.prefix.toLowerCase();
  if (opts.scope === 'daily') {
    const n = await nextSequence(tx, `${base}:${ymd(now)}`);
    return `${opts.prefix}-${ymd(now)}-${pad(n, opts.width)}`;
  }
  if (opts.scope === 'monthly') {
    const n = await nextSequence(tx, `${base}:${ym(now)}`);
    return `${opts.prefix}-${ym(now)}-${pad(n, opts.width)}`;
  }
  const n = await nextSequence(tx, base);
  return `${opts.prefix}-${pad(n, opts.width)}`;
}
```

Contoh pakai (create produk bean): `const code = await nextCode(tx, { prefix: 'BEN', scope: 'global', width: 6, counter: 'product_bean' });`

### Aturan pakai

1. **Selalu di dalam transaksi** yang sama dengan insert-nya — jangan pernah generate kode di luar transaksi / di sisi client.
2. Nama counter: global → `product_bean`, `customer`, `warranty`; harian → `order:YYYYMMDD`; bulanan → `invoice:YYYYMM`.
3. Row-lock membuat insert bersamaan pada counter yang sama antre sebentar — tidak masalah di skala bisnis ini.
4. Kolom kode selalu `text unique not null`; lookup publik pakai kode (mis. `GET /orders/ORD-20260709-0001` boleh), uuid tetap dipakai antar-service internal.
5. Kode **tidak pernah diubah** setelah dibuat, meski data lain di baris itu berubah.

## 17. Logging (WAJIB — Pino, sudah terpasang sejak modul 00/01)

**Setup sudah selesai** (root infra, `src/logger/logger.module.ts`, di-import di `AppModule` sebelum modul lain; `main.ts` pakai `NestFactory.create(AppModule, { bufferLogs: true })` + `app.useLogger(app.get(Logger))`). Modul-modul berikutnya **tidak perlu setup apa pun** — cukup pakai `Logger` biasa dari `@nestjs/common`:

```ts
import { Logger } from '@nestjs/common';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  async checkout(...) {
    this.logger.log(`Checkout dimulai untuk customer ${customerId}`);
    // ...
    this.logger.warn(`Stok ${variantId} tinggal ${available}`);
  }
}
```

Kenapa Pino (bukan `Logger` bawaan Nest polos): output **structured JSON** (gampang di-filter/agregasi nanti pas produksi — mis. cari semua log `orderId` tertentu), sangat cepat, dan **HTTP request/response ter-log otomatis** (method, url, status, responseTime) tanpa kode tambahan di controller mana pun.

**Aturan:**
1. Pakai level yang sesuai: `log()` info normal, `warn()` kondisi mencurigakan tapi bukan error (stok menipis, retry), `error()` kegagalan nyata (selalu sertakan stack: `this.logger.error(msg, err.stack)`), `debug()` detail teknis (nonaktif di prod, `LOG_LEVEL=info`).
2. **Jangan log data sensitif**: password, token mentah, nomor kartu. Cookie/Authorization header & `req.body.password` sudah di-redact otomatis oleh `LoggerModule` — tidak perlu redact manual untuk itu, tapi hati-hati kalau log payload custom yang memuat data sensitif lain.
3. Instansiasi `new Logger(ClassName.name)` sebagai `private readonly logger` — konsisten dengan pola Nest, bukan `console.log`.
4. Env: `LOG_LEVEL` (default `debug` di dev, `info` di prod — lihat `.env.example`).

## 18. Testing (WAJIB)

**Filosofi: bukan piramida klasik, condong ke e2e** ("testing trophy") — proyek ini API-heavy, jadi nilai terbesar ada di tes yang membuktikan **kontrak HTTP beneran jalan** (status code, response shape, error case) persis seperti `api-contract.md`, bukan di unit test yang banyak tapi cuma menguji detail internal.

### E2E test (WAJIB untuk setiap modul, folder `test/`)

- Satu file per modul: `test/<modul>.e2e-spec.ts` (mis. `test/orders.e2e-spec.ts`).
- Pakai helper bersama `test/utils/test-app.ts` (`createTestApp()`) — sudah mereplikasi setup `main.ts` (prefix `/api`, cookie-parser, ValidationPipe) tanpa Swagger.
- Jalan ke **database test sungguhan** (`roastery_test`, bukan mock) via `pnpm test:e2e` (otomatis provision + migrate + seed regions lewat `test:e2e:setup` → `scripts/setup-test-db.sh`).
- **Cakupan minimum tiap modul**: golden path tiap endpoint utama + setiap error case yang tertulis eksplisit di `api-contract.md` (400/401/403/404/409/422) + transisi status kalau modulnya punya (lihat §12).
- **Isolasi data**: pakai email/kode unik per run (mis. `` `test-${Date.now()}@example.com` ``) — JANGAN truncate tabel (bisa nabrak data modul lain kalau beberapa spec file jalan bareng). Bersihkan row yang dibuat sendiri di `afterAll`.
- Ambil cookie dari `Set-Cookie` response lalu pasang lagi via `.set('Cookie', [...])` di request berikutnya (supertest tidak punya cookie jar otomatis) — lihat contoh di `test/auth.e2e-spec.ts`.
- Butuh akses DB langsung di test (mis. ubah status jadi `suspended`, atau cleanup)? Ambil instance Drizzle dari testing module: `app.get<DrizzleDB>(DRIZZLE)`.
- Jalankan dengan `pnpm test:e2e` (BUKAN `pnpm test`, itu untuk unit test / beda config & folder).

### Unit test (opsional, HANYA untuk logic murni yang kompleks)

Folder sama dengan source (`*.spec.ts` di sebelah file yang diuji, konvensi default Nest), dijalankan via `pnpm test`. Tulis unit test HANYA untuk:
- Guard/decorator logic murni tanpa DB (contoh: `roles.guard.spec.ts`, `jwt-auth.guard.spec.ts`) — mock `Reflector`/`ExecutionContext`.
- Kalkulasi/algoritma non-trivial: resolusi harga + urutan validasi promo (modul 05), kalkulasi total checkout (modul 06), `nextCode()`/`nextSequence()` (util sequence).

**Jangan** unit-test tiap service/controller yang isinya cuma query Drizzle — itu sudah tercover e2e test dan cuma nambah maintenance tanpa nilai tambah berarti.

### Definition of Done tiap modul (update §14)

Selain 4 poin di §14, tiap modul **wajib** tambah: e2e test untuk endpoint-endpoint utamanya, `pnpm test:e2e` hijau (bukan cuma `pnpm build`).

### Lint (`pnpm lint`, WAJIB hijau)

- `app.getHttpServer()` dan `Response.body` dari `supertest` mengetik `any` **by design** (bukan bug) — assert-nya lewat `expect()`, bukan lewat static typing. Karena itu `eslint.config.mjs` sudah punya override khusus `test/**/*.e2e-spec.ts` yang mematikan 4 rule `@typescript-eslint/no-unsafe-*` (argument/assignment/call/member-access/return) HANYA untuk file e2e — jangan copy pattern ini ke `src/`.
- Di `src/`, kalau ketemu "unsafe assignment/call/member-access" dari Express `Request` (mis. `req.cookies?.[...]`, `ctx.switchToHttp().getRequest()`), itu **beneran** perlu di-type — pola yang dipakai: `as string | undefined` untuk cookie value, atau `getRequest<{ user: RequestUser }>()` untuk generic type param. Lihat `auth.controller.ts`, `current-user.decorator.ts`, `jwt-auth.guard.ts`.
- Redline ESLint di VS Code (bukan dari `pnpm exec eslint` CLI) kadang false-positive karena TS language server gagal resolve generic `DrizzleDB` yang dalam — cek dulu via CLI (`pnpm exec eslint <file>`) sebelum "memperbaiki" kode yang sebenarnya sudah benar; kalau CLI bersih tapi editor merah, restart TS Server + ESLint Server dulu.
