# 10. Content — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup

- [ ] Sepakati format body (markdown) & strategi gambar (URL/upload)

## Fase 1 — Schema & migration

- [ ] `content_articles` + enum `content_type`, `content_status`
- [ ] Re-export di `src/database/schema.ts`
- [ ] `pnpm db:generate` → `pnpm db:migrate`

## Fase 2 — Scaffold file (Nest CLI)

- [ ] `nest g service modules/content --no-spec`
- [ ] `nest g controller modules/content --no-spec`
- [ ] DTO create/update article

## Fase 3 — Read publik

- [ ] `GET /content` (hanya `published`, filter `type`, pagination)
- [ ] `GET /content/:slug`

## Fase 4 — Admin CRUD (staff/admin)

- [ ] `POST /content` (slug auto dari title, draft/publish)
- [ ] `PATCH /content/:id` (termasuk publish → set `published_at`)
- [ ] `DELETE /content/:id`

## Fase 5 — Verifikasi

- [ ] Buat draft → publish → tampil publik via slug
- [ ] Draft tidak muncul di endpoint publik
- [ ] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar
- [ ] Tulis `test/content.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md (lihat konvensi §18)
- [ ] `pnpm test:e2e` hijau
- [ ] `pnpm build` hijau & boot OK
- [ ] Tandai selesai → **semua modul MVP + lanjutan terdokumentasi**
