# 10. Content — Plan

Modul: `src/modules/content`
Fase proyek: **Fase 4** (opsional, marketing/SEO).

## Tujuan

Konten edukasi & marketing: **panduan seduh**, **cerita asal biji (origin story)**, **blog**, dan **halaman statis**.
Tujuannya menarik trafik (SEO) & bantu jualan.

## Ketergantungan

- `auth` — author = `users` (staff/admin); guard untuk kelola konten.
- `database` — Drizzle.

## Yang di-generate lewat Nest CLI

```bash
pnpm exec nest g service modules/content --no-spec
pnpm exec nest g controller modules/content --no-spec
```

## Schema DB (Drizzle → Postgres)

### enum `content_type`: `brew_guide` | `blog` | `origin_story` | `page`

### enum `content_status`: `draft` | `published`

### tabel `content_articles`

| kolom          | tipe              | keterangan                     |
| -------------- | ----------------- | ------------------------------ |
| `id`           | uuid PK           |                                |
| `type`         | `content_type`    |                                |
| `title`        | text              |                                |
| `slug`         | text unique       | untuk URL                      |
| `excerpt`      | text null         | ringkasan                      |
| `body`         | text              | markdown / rich text           |
| `cover_image_url`| text null       |                                |
| `tags`         | jsonb null        | daftar tag                     |
| `author_id`    | uuid FK null      | → users                        |
| `status`       | `content_status`  | default `draft`                |
| `published_at` | timestamptz null  |                                |
| `created_at`   | timestamptz       | default now                    |
| `updated_at`   | timestamptz       | default now                    |

## Router & Controller

| Method | Route                 | Auth        | Fungsi                                |
| ------ | --------------------- | ----------- | ------------------------------------- |
| GET    | `/content`            | Public      | List artikel published (filter type)  |
| GET    | `/content/:slug`      | Public      | Detail artikel                        |
| POST   | `/content`            | staff/admin | Buat artikel (draft/publish)          |
| PATCH  | `/content/:id`        | staff/admin | Ubah artikel                          |
| DELETE | `/content/:id`        | staff/admin | Hapus artikel                         |

## Definition of Done

- Artikel bisa dibuat (draft → publish) dari CMS.
- Publik hanya lihat yang `published`, akses via slug.
- Migration ter-apply.

## Aturan Implementasi (WAJIB)

> Ikuti konvensi global di [_conventions.md](../_conventions.md).

1. `body` = **markdown mentah** (string). API tidak me-render HTML; rendering urusan frontend.
2. Slug dari `title` pakai util slug yang sama dengan catalog (§11 konvensi).
3. Endpoint publik HANYA menampilkan `status = 'published'`. Draft diakses lewat endpoint admin.
4. `published_at` di-set SEKALI saat pertama kali status berubah ke `published`; unpublish→publish lagi tidak mengubah `published_at`.
5. `author_id` = user staff yang membuat (dari `@CurrentUser()`), bukan dari body.
6. Default list publik urut `published_at DESC`.
