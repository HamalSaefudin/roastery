# CMS 01. Fondasi UI — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md), aturan umum di [../_conventions.md](../_conventions.md).

## Fase 0 — Token & tema

- [ ] Mapping token Dark Roast → CSS variables shadcn di `styles.css` (dark default + `[data-theme="light"]`)
- [ ] Font via `@fontsource` (Space Grotesk, Inter, JetBrains Mono) + set di Tailwind theme
- [ ] Toggle tema + persist localStorage, tanpa FOUC (script inline di `__root.tsx`)
- [ ] Radius & warna semantic (sukses/peringatan/bahaya/info) tersedia sebagai utility

## Fase 1 — API client & util

- [ ] `pnpm add openapi-fetch` → `src/lib/api/client.ts` (base URL dari `VITE_API_URL`, `credentials: 'include'`)
- [ ] `getErrorMessage(err)` — handle message string/array/network/non-JSON
- [ ] `src/lib/format.ts` — `formatRupiah`, `formatTanggal` (+ unit test vitest utk keduanya)

## Fase 2 — Komponen feedback shared

- [ ] Toast: `pnpm dlx shadcn@latest add sonner` + helper `toastSukses`/`toastError`, posisi kanan-bawah
- [ ] `LoadingButton` (loading → disabled + spinner + teks pending)
- [ ] `TableSkeleton` (5 baris) + `PageSkeleton`
- [ ] `EmptyState` (ikon + pesan + slot CTA)
- [ ] `ErrorState` (pesan + tombol "Coba lagi" → refetch)
- [ ] `ConfirmDialog` (judul + deskripsi konsekuensi + tombol merah dengan loading state)
- [ ] `StatusBadge` — mapping SEMUA enum status backend → warna semantic (satu file mapping)
- [ ] `PageHeader` (judul + breadcrumb slot + aksi kanan)

## Fase 3 — Kitchen sink & verifikasi

- [ ] Route dev-only `/dev/kitchen-sink` memamerkan semua komponen dalam kondisi normal/loading/error/empty
- [ ] Verifikasi manual: toast sukses & error muncul benar; ConfirmDialog loading; toggle tema persist tanpa flash; badge semua status kebaca di dark & light
- [ ] `pnpm build` + `pnpm lint` + `pnpm check` + `pnpm test` hijau
- [ ] Update CLAUDE.md + commit
