# CMS 00. Setup — Workspace, Scaffold & Fondasi

> Step 0 proyek frontend CMS. **Belum ada fitur/modul apa pun di sini** — auth, layout dashboard, halaman modul (catalog/orders/dll.) semuanya mulai di step berikutnya. Step ini murni menyiapkan fondasi supaya step-step fitur nanti tinggal fokus ke fiturnya.

## Tujuan

1. Repo jadi **pnpm workspace** (monorepo formal): `roastery-service/` + `roastery-cms/` (+ nanti `roastery-storefront/`, `roastery-driver/`), satu lockfile di root.
2. Proyek **`roastery-cms/`** ter-scaffold via **CLI resmi TanStack** (`npx @tanstack/cli create`) — BUKAN bikin file satu-satu manual.
3. Fondasi terpasang & terverifikasi jalan: Tailwind v4, shadcn/ui, TanStack Query/Table/Form, ESLint+Prettier, generate types dari Swagger backend.

## Keputusan tech stack (hasil brainstorm 2026-07-12)

| Bagian | Pilihan | Alasan |
|---|---|---|
| Framework | **TanStack Start** (React) | Sesuai keputusan `rencana-fase.md` — 3 client seragam. Router type-safe + file-based. CMS tidak butuh SEO, SSR bisa diminimalkan. |
| Scaffolder | **`npx @tanstack/cli create`** | CLI resmi TanStack (pengganti `create-start-app` yang deprecated). Add-ons resmi tersedia untuk hampir semua stack kita. |
| UI | **Tailwind CSS v4** (bawaan CLI, selalu on) + **shadcn/ui** (add-on `shadcn`) | De facto untuk admin dashboard; komponen di-copy ke repo, gampang dikustom. |
| Server state | **TanStack Query** (add-on `tanstack-query`) | Cache + refetch data API. Auth pakai cookie httpOnly → semua fetch wajib `credentials: 'include'`. |
| Tabel | **TanStack Table** (add-on `table`) | CMS table-heavy (orders, produk, dispatch board, dst.). |
| Form | **TanStack Form** (add-on `form`) + **Zod** | Add-on resmi; satu ekosistem dengan Router/Query. (Catatan: brainstorm awal menyebut React Hook Form — diganti TanStack Form karena tersedia sebagai add-on resmi CLI & konsisten satu ekosistem. Kalau nanti terasa kurang, evaluasi ulang sebelum form kompleks pertama.) |
| Types API | **openapi-typescript** | Generate types dari Swagger backend (`/api/docs-json`) yang sudah teruji e2e — tidak nulis manual dari api-contract.md. |
| Toolchain | **ESLint + Prettier** (toolchain `eslint` dari CLI) | Konsisten dengan backend. |
| Struktur | **pnpm workspace** di repo ini | Satu repo sudah keputusan lama; workspace = satu lockfile, bisa share config/types antar app nanti. |

## Konfigurasi penting

- **Port dev CMS = 3001** — backend `main.ts` sudah set CORS `origin: WEB_URL ?? http://localhost:3001` + `credentials`. Backend tetap di 3000.
- **Base URL API** via env `VITE_API_URL` (default `http://localhost:3000/api`).
- **Tanpa demo/examples** dari CLI (`--no-examples`), tanpa nested git (`--no-git` — repo git sudah ada di root).
- Script `generate:api` di `roastery-cms/package.json` → fetch `http://localhost:3000/api/docs-json` → `src/lib/api/schema.d.ts` (butuh backend nyala saat generate; hasil generate di-commit supaya dev lain tidak wajib nyalakan backend cuma buat build).

## Aturan Implementasi (WAJIB)

1. **Scaffold pakai CLI resmi** — jangan bikin struktur proyek manual. Modifikasi setelah scaffold boleh (hapus sisa demo, atur port, dsb.).
2. **Migrasi workspace tidak boleh merusak backend**: setelah `pnpm-workspace.yaml` + install ulang dari root, SEMUA perintah backend wajib diverifikasi tetap hijau (`pnpm build`, `pnpm test`, `pnpm test:e2e` dari dalam `roastery-service/`).
3. Lockfile lama `roastery-service/pnpm-lock.yaml` dihapus (workspace = satu lockfile di root).
4. **Step 0 TIDAK membuat fitur**: tidak ada halaman login, tidak ada layout dashboard, tidak ada panggilan API dari UI. Halaman default hasil scaffold dibiarkan/dibersihkan seperlunya saja.
5. Verifikasi minimum sebelum step 0 dianggap selesai: `pnpm dev` CMS nyala di 3001, `pnpm build` CMS hijau, `pnpm lint` CMS hijau, types API ter-generate, backend tetap hijau semua.
6. Selesai step 0 → update `CLAUDE.md` (peta repo + perintah + progress CMS) dan commit.

## Di luar scope step 0 (eksplisit)

- Auth/login page & session handling → **CMS step 01**
- Layout dashboard (sidebar, menu per modul) → step berikutnya
- Halaman modul apa pun (catalog, orders, delivery, dst.)
- Deploy/hosting
- Storefront & Driver App (proyek terpisah, nanti)
