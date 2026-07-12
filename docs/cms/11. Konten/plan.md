# CMS 11. Konten — Artikel (Brew Guide / Blog / Origin Story / Page)

> Kontrak: [docs/10. Content/api-contract.md](../../10.%20Content/api-contract.md). Feedback per [konvensi §5](../_conventions.md). Step CMS terakhir (MVP CMS lengkap setelah ini).

## Halaman

1. **List artikel** (`/konten`): judul, tipe (badge), StatusBadge draft/published, penulis, publishedAt. Filter tipe & status; search judul. Catatan: endpoint list publik hanya `published` — untuk CMS butuh melihat draft juga → **cek api-contract**: kalau tidak ada endpoint admin-list (termasuk draft), ini gap backend kecil → tambah `GET /content/admin` dulu (item backlog backend dikerjakan bareng step ini, dengan e2e-nya).
2. **Editor artikel** (`/konten/baru`, `/konten/$id`): judul, tipe, excerpt, **body markdown** (textarea + preview markdown side-by-side sederhana — bukan WYSIWYG dulu), cover URL + preview, tags (chip input).
3. **Publish/unpublish**: tombol di editor & list — publish pertama set publishedAt; **republish tidak mereset tanggal** (perilaku backend) → tampilkan publishedAt asli, beri tooltip penjelasan.

## Keputusan UX spesifik

- Slug auto dari judul (backend) — tampil setelah simpan + tombol copy URL storefront.
- **Guard tinggalkan halaman** saat editor ada perubahan belum tersimpan (beforeunload + router block) — satu-satunya tempat di CMS yang butuh ini (tulisan panjang, kehilangan draft itu menyakitkan).
- Simpan draft vs publish = dua tombol terpisah yang jelas, dua-duanya LoadingButton.
- Hapus artikel published → ConfirmDialog menyebut "hilang dari storefront".

## Verifikasi kunci

Tulis draft → tidak tampil publik (curl) → publish → tampil; unpublish→republish → publishedAt tidak berubah (tampil benar di UI); duplikat judul → slug -2 (tampil, bukan error); guard unsaved-changes memicu saat pindah halaman; loading/sukses/error/empty terbukti.
