# CMS 01. Fondasi UI — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md), aturan umum di [../_conventions.md](../_conventions.md).

## Fase 0 — Token & tema

- [x] Mapping token Dark Roast → CSS variables shadcn di `styles.css` (dark default + `[data-theme="light"]`) — sekalian bersihkan tema demo "lagoon" bawaan scaffold
- [x] Font via `@fontsource-variable` (Space Grotesk, Inter, JetBrains Mono) + `--font-heading`/`--font-sans`/`--font-mono` di Tailwind theme
- [x] Toggle tema + persist localStorage, tanpa FOUC (script inline di `__root.tsx` + `suppressHydrationWarning` di `<html>` — tanpa itu React lapor hydration mismatch karena server selalu render `data-theme="dark"`)
- [x] Radius & warna semantic (sukses/peringatan/bahaya/info + varian `-bg`) tersedia sebagai utility (`text-sukses`, `bg-peringatan-bg`, dst.)

## Fase 1 — API client & util

- [x] `pnpm add openapi-fetch` → `src/lib/api/client.ts` (baseUrl = origin dari `VITE_API_URL` — schema Swagger sudah ber-prefix `/api`, `credentials: 'include'`)
- [x] `getErrorMessage(err)` — handle message string/array/network(TypeError)/fallback
- [x] `src/lib/format.ts` — `formatRupiah`, `formatTanggal`, `formatTanggalSaja` + 6 unit test vitest (catatan: Intl id-ID pakai NBSP setelah "Rp" — test menormalisasi ` `)

## Fase 2 — Komponen feedback shared

- [x] Toast: shadcn sonner + helper `toastSukses`/`toastError` (`src/lib/toast.ts`), posisi kanan-bawah — **catatan**: sonner.tsx bawaan shadcn import `next-themes` (tidak kita pakai) → ditulis ulang mengikuti `data-theme` via MutationObserver, dep next-themes dihapus
- [x] `LoadingButton` (loading → disabled + spinner + loadingText)
- [x] `TableSkeleton` (5 baris) + `PageSkeleton`
- [x] `EmptyState` (ikon + pesan + slot CTA)
- [x] `ErrorState` (pesan via getErrorMessage + tombol "Coba lagi")
- [x] `ConfirmDialog` (judul spesifik + konsekuensi + tombol merah loading, terkunci saat pending)
- [x] `StatusBadge` — mapping 15 kelompok enum backend (order/payment/invoice/delivery/settlement/unit/wholesale/repair/content/user/customerType/paymentType/fulfillment/shipping/movement) → warna semantic + label Indonesia; status tak dikenal → tampil mentah netral (tidak crash)
- [x] `PageHeader` (judul + breadcrumb slot + aksi kanan)

## Fase 3 — Kitchen sink & verifikasi

- [x] Route dev-only `/dev/kitchen-sink` (`beforeLoad` throw notFound saat non-DEV) memamerkan semua komponen + simulasi loading 1,5 dtk
- [x] Verifikasi manual via browser preview: toast sukses & error (409/validasi array/network) tampil benar; ConfirmDialog loading (tombol disabled + "Menghapus…"); toggle tema → localStorage persist setelah reload; light mode pakai emas tua #A97B1C (kontras); badge 15 kelompok kebaca di dark & light; console bersih (hydration error di-fix)
- [x] `pnpm build` + `pnpm lint` + `pnpm check` + `pnpm test` (6 test) hijau
- [x] Update CLAUDE.md + commit
