# 10. Content — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup

- [x] Sepakati format body (markdown) & strategi gambar (URL/upload) — `body` = markdown mentah (string, API tidak render HTML), `coverImageUrl` = URL string (upload file di luar scope backend ini)

## Fase 1 — Schema & migration

- [x] `content_articles` + enum `content_type`, `content_status`
- [x] Re-export di `src/database/schema.ts`
- [x] `pnpm db:generate` → `pnpm db:migrate`

## Fase 2 — Scaffold file (Nest CLI)

- [x] `nest g service modules/content --no-spec`
- [x] `nest g controller modules/content --no-spec`
- [x] DTO create/update article

## Fase 3 — Read publik

- [x] `GET /content` (hanya `published`, filter `type`, pagination)
- [x] `GET /content/:slug`

## Fase 4 — Admin CRUD (staff/admin)

- [x] `POST /content` (slug auto dari title, draft/publish)
- [x] `PATCH /content/:id` (termasuk publish → set `published_at`)
- [x] `DELETE /content/:id`

## Fase 5 — Verifikasi

- [x] Buat draft → publish → tampil publik via slug
- [x] Draft tidak muncul di endpoint publik
- [x] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar
- [x] Tulis `test/content.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md (lihat konvensi §18)
- [x] `pnpm test:e2e` hijau
- [x] `pnpm build` hijau & boot OK
- [x] Tandai selesai → **semua modul MVP + lanjutan terdokumentasi**
