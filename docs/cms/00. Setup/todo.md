# CMS 00. Setup — TODO

Aturan: **per fase, urut**. Detail & alasan di [plan.md](./plan.md).

---

## Fase 0 — Dokumen & keputusan

- [x] Brainstorm tech stack + konfirmasi user (TanStack Start, pnpm workspace, shadcn/ui, TanStack Query/Table/Form, openapi-typescript)
- [x] Tulis plan.md + todo.md step 0 ini

## Fase 1 — Migrasi pnpm workspace

- [x] `pnpm-workspace.yaml` di root (packages: `roastery-service`, `roastery-cms`)
- [x] `package.json` root (private, tanpa dependency — cuma penanda workspace root)
- [x] Hapus `roastery-service/pnpm-lock.yaml`, `pnpm install` dari root → satu lockfile root
- [x] Verifikasi backend tetap hijau: `pnpm build` + `pnpm test` (12) + `pnpm test:e2e` (224) dari `roastery-service/`
- [x] Cek `.gitignore` root masih meng-cover `node_modules` root & app baru (pola unanchored, aman)

## Fase 2 — Scaffold roastery-cms via CLI resmi

- [x] `npx @tanstack/cli create roastery-cms` — framework React, add-ons `shadcn,tanstack-query,table,form`, toolchain `eslint`, `--no-examples --no-git --no-intent --package-manager pnpm --non-interactive`
- [x] Port dev diset **3001** (backend di 3000; CORS backend sudah mengarah ke 3001)
- [x] Rapikan hasil scaffold: hapus `@faker-js/faker` (tak terpakai), pin semua versi `"latest"` ke versi resolve konkret, bump eslint 9→10 (peer dep `@tanstack/eslint-config@0.4`), `--passWithNoTests` utk vitest, hapus `.cursorrules`. **Catatan**: `npx @tanstack/cli pin-versions` JANGAN dipakai — malah inject paket lama v1.115 yang konflik dengan Vite 8 (di-pin manual dari `pnpm list`)
- [x] `pnpm dev` nyala di 3001 (HTTP 200)
- [x] `pnpm build` CMS hijau
- [x] `pnpm lint` + `pnpm check` (prettier) CMS hijau

## Fase 3 — Fondasi API types

- [x] Tambah devDep `openapi-typescript` + script `generate:api` (fetch `http://localhost:3000/api/docs-json` → `src/lib/api/schema.d.ts`)
- [x] Tambah env `VITE_API_URL` (`.env` + `.env.example`, default `http://localhost:3000/api`)
- [x] Jalankan `generate:api` sekali (backend nyala) → schema.d.ts ter-commit (3.703 baris, 102 operation)
- [x] Sanity check: types hasil generate memuat path yang dikenal (`/api/auth/login`, `/api/catalog/products`, dst.)
- [x] `schema.d.ts` + `routeTree.gen.ts` masuk `.prettierignore` (file generated, jangan diformat manual)

## Fase 4 — Rapikan & dokumentasi

- [x] Bersihkan sisa scaffold yang tidak dipakai
- [x] Update `CLAUDE.md`: peta repo (+`roastery-cms/`), perintah penting CMS, section progress CMS
- [x] Commit + push
