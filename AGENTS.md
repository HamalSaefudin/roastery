# AGENTS.md — Panduan untuk AI coding agent (semua tool)

> File ini mengikuti standar [agents.md](https://agents.md) — dibaca oleh Cursor, OpenCode, Codex CLI, Claude Code, dan tool sejenis. Isinya **aturan kerja prosedural** yang WAJIB diikuti apa pun tool-nya. Untuk status progress terkini, jangan duplikasi di sini — selalu cek **[CLAUDE.md](CLAUDE.md)** (sumber tunggal, di-update tiap sesi). Konvensi teknis detail ada di `docs/_conventions.md` (backend) dan `docs/cms/_conventions.md` (CMS).

## Tentang proyek

Platform e-commerce + operasional untuk **roastery kopi**: jual biji kopi, mesin espresso, grinder; pengiriman dikelola sendiri (driver in-house); melayani retail & wholesale.

**Arsitektur:** 1 Service API (NestJS 11 + PostgreSQL + Drizzle, `roastery-service/`) + client CMS/Admin (TanStack Start, `roastery-cms/`; Storefront & Driver App belum dibuat). Repo = **pnpm workspace**, satu lockfile di root — install dependency SELALU dari root (`pnpm install`), jangan `npm install` atau `pnpm install` di dalam subfolder.

## Aturan kerja (WAJIB, tanpa terkecuali)

1. **Bahasa Indonesia** untuk semua komunikasi & dokumen yang ditulis (komentar kode boleh singkat/teknis).
2. **Baca konvensi sebelum ngoding**: backend → [docs/_conventions.md](docs/_conventions.md); CMS → [docs/cms/_conventions.md](docs/cms/_conventions.md). Jangan menebak pola — kedua file itu sumber kebenaran (naming, struktur folder, DTO, error handling, feedback UX, dst.).
3. **Kerjakan modul/step sesuai urutan folder docs** — backend: `docs/00. Regions/` → `docs/10. Content/`; CMS: `docs/cms/00. Setup/` → `docs/cms/11. Konten/`. Dalam satu modul/step, ikuti `todo.md` **per fase, urut** — satu fase harus ✅ semua dulu baru lanjut fase berikutnya. Jangan loncat.
4. **Generate, jangan tulis manual**: backend — module/controller/service/guard/decorator NestJS wajib via Nest CLI (`pnpm exec nest g ...`); CMS — komponen shadcn wajib via `pnpm dlx shadcn@latest add <nama>`.
5. **Tiap modul/step backend punya 3 dokumen** di `docs/NN. <Modul>/`: `plan.md` (apa & bagaimana + "Aturan Implementasi"), `todo.md` (checklist per fase), `api-contract.md` (kontrak API — sumber kebenaran utk frontend). CMS: `plan.md` + `todo.md` per step di `docs/cms/NN. <Step>/`.
6. **Centang checklist saat item selesai** di `todo.md` yang relevan. Saat satu modul/step selesai penuh, update tabel progress di [CLAUDE.md](CLAUDE.md).
7. **Verifikasi = tes beneran, bukan cuma build lolos**:
   - Backend: `pnpm test:e2e` (DB terpisah `roastery_test`, auto-provision). Tiap modul wajib punya `test/<modul>.e2e-spec.ts`.
   - CMS: `pnpm test:e2e` (Playwright, auto-start dev server). Tiap step wajib punya `e2e/<step>.spec.ts` yang meng-otomasi verifikasi loading/sukses/error (lihat `docs/cms/_conventions.md` §5). **`vite build` TIDAK type-check** — selalu jalankan `pnpm typecheck` juga.
8. **UX feedback WAJIB eksplisit** (CMS): tiap interaksi (buka halaman, submit form, hapus, aksi status, login) harus punya state loading yang kelihatan, feedback sukses (toast/redirect), dan feedback error yang jelas (pesan backend apa adanya, bukan generik). Matriks lengkap di `docs/cms/_conventions.md` §5 — jangan skip.
9. **Jangan bikin fitur/refactor di luar scope step yang sedang dikerjakan.** Kalau nemu bug/gap di luar scope saat kerja, catat di `todo.md`/CLAUDE.md sebagai temuan terpisah — jangan diam-diam diperbaiki bareng, kecuali memang blocker langsung untuk step aktif.
10. Kalau nemu error yang aneh/tidak jelas (mis. bundling gagal tanpa pesan jelas, hydration tidak selesai) — cek dulu apakah itu masalah dependency/environment (versi ganda, cache basi, paket nyasar di luar proyek) sebelum mengubah-ubah kode aplikasi. Lihat `docs/cms/_conventions.md` §10 untuk contoh kasus nyata & cara diagnosisnya.

## Perintah penting

```bash
cd roastery-service
pnpm db:up               # nyalakan Postgres (docker compose)
pnpm start:dev            # jalankan API (port 3000, prefix /api)
pnpm build                # cek kompilasi
pnpm test                  # unit test
pnpm test:e2e              # e2e test (auto provision+migrate+seed DB roastery_test)
```

```bash
cd roastery-cms
pnpm dev                 # dev server CMS (port 3001)
pnpm typecheck            # tsc --noEmit (WAJIB — vite build tidak type-check)
pnpm build                # build produksi
pnpm lint                  # eslint
pnpm check                 # prettier --check
pnpm test                  # unit test vitest
pnpm test:e2e              # e2e Playwright (auto-start dev server; spec ber-API butuh backend :3000 nyala)
pnpm generate:api          # regenerate types dari Swagger backend (backend harus nyala)
```

> Install dependency SELALU dari root repo: `pnpm install`.

## Peta repo

- `roastery-service/` — API NestJS (modul di `src/modules/`, DB di `src/database/`)
- `roastery-cms/` — CMS/Admin TanStack Start (types API di-generate ke `src/lib/api/schema.d.ts` — catat: response body Swagger belum lengkap terdeklarasi, banyak endpoint hasilnya `content?: never`; type response di-tulis manual per fitur mengikuti `api-contract.md`, lihat pola di `roastery-cms/src/features/auth/types.ts`)
- `docs/gambaran-bisnis.md` — **big picture bisnis**, baca ini paling awal kalau belum familiar dengan domainnya
- `docs/rencana-fase.md` — overview arsitektur & fase rilis backend
- `docs/_conventions.md` — konvensi implementasi backend (WAJIB dibaca sebelum sentuh `roastery-service/`)
- `docs/cms/_conventions.md` — konvensi implementasi CMS (WAJIB dibaca sebelum sentuh `roastery-cms/`), termasuk matriks feedback UX dan pola SSR/cookie
- `docs/cms/design system/README.md` — token design system terpilih (Dark Roast)
- `docs/NN. <Modul>/` — plan + todo + api-contract per modul backend
- `docs/cms/NN. <Step>/` — plan + todo per step CMS

## Status & keputusan desain

Jangan simpan status progress di file ini — **selalu rujuk [CLAUDE.md](CLAUDE.md)** untuk: tabel progress tiap modul/step, keputusan desain yang sudah diambil (payment gateway, ID/kode publik, dll.), dan daftar keputusan pending. File itu di-update tiap kali ada perubahan checklist, jadi selalu jadi sumber paling akurat.
