# 10. Content — API Contract

Base URL `/api`. Read publik; kelola butuh role `staff`/`admin`.

## Objek

### `Article`

```json
{
  "id": "uuid",
  "type": "brew_guide",
  "title": "Cara Seduh V60",
  "slug": "cara-seduh-v60",
  "excerpt": "Panduan singkat...",
  "body": "# Langkah\n1. ...",
  "coverImageUrl": "https://...",
  "tags": ["v60", "manual brew"],
  "status": "published",
  "publishedAt": "2026-07-08T00:00:00Z"
}
```

`type`: `brew_guide` | `blog` | `origin_story` | `page`
`status`: `draft` | `published`

---

## GET /content  _(public)_

**Query:** `?type=brew_guide&search=&page=1&limit=10`
**Response `200`:** `{ "data": Article[], "total", "page" }` (hanya `published`).

## GET /content/:slug  _(public)_

**Response `200`:** `{ "article": Article }`.
**Error:** `404` slug tidak ada / masih draft.

---

## POST /content  _(staff/admin)_

**Body**

```json
{
  "type": "brew_guide",
  "title": "Cara Seduh V60",
  "excerpt": "Panduan singkat...",
  "body": "# Langkah\n1. ...",
  "coverImageUrl": "https://...",
  "tags": ["v60"],
  "status": "draft"
}
```

`slug` di-generate dari `title`.
**Response `201`:** `{ "article": Article }`. **Error:** `409` slug duplikat.

## PATCH /content/:id  _(staff/admin)_

**Body:** subset field `Article`. Set `status=published` → isi `publishedAt`.
**Response `200`:** `{ "article": Article }`.

## DELETE /content/:id  _(staff/admin)_

**Response `204`**.
