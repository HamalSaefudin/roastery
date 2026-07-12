# CMS 01. Fondasi UI — Design Tokens & Komponen Feedback

> Memasang design system **Dark Roast** ke kode + membangun semua komponen feedback (loading/sukses/error) yang jadi standar [konvensi §5-6](../_conventions.md). Belum ada halaman fitur — tapi setelah step ini, SEMUA step berikutnya tinggal pakai.

## Tujuan

1. Token Dark Roast → CSS variables shadcn di `src/styles.css` (dark = default, `[data-theme="light"]` override) + font Space Grotesk/Inter/JetBrains Mono.
2. Toggle tema (persist `localStorage`, tanpa flash saat load).
3. Infrastruktur feedback terpasang: **sonner** (toast) + komponen shared (`LoadingButton`, `TableSkeleton`, `PageSkeleton`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `StatusBadge`, `PageHeader`).
4. API client `openapi-fetch` + `getErrorMessage()` + formatter (`formatRupiah`, `formatTanggal`).
5. Halaman demo `/dev/kitchen-sink` (dev-only) yang memamerkan semua komponen dalam 3 kondisi — jadi alat verifikasi visual sebelum ada halaman nyata.

## Aturan Implementasi (WAJIB)

1. Mapping token → variable shadcn (`--background`, `--foreground`, `--primary`, `--card`, `--border`, `--destructive`, `--muted`, dst.) mengikuti tabel di [design system/README.md](../design%20system/README.md). Jangan hardcode hex di komponen — semua lewat variable.
2. Font di-self-host via `@fontsource` (bukan link Google Fonts runtime) — CMS internal tool, jangan bergantung CDN eksternal.
3. Warna `StatusBadge`: petakan SEMUA enum status backend (order, payment, delivery, repair, unit, wholesale application, content) ke skema warna semantic (`sukses`/`peringatan`/`bahaya`/`info`/netral) — satu sumber mapping, dipakai semua modul.
4. `LoadingButton`: prop `loading` → otomatis `disabled` + spinner + teks bisa diganti (mis. "Menyimpan…"). Semua tombol submit/destruktif di step berikutnya WAJIB pakai ini.
5. Toast helper: `toastSukses(msg)`, `toastError(err)` (memanggil `getErrorMessage`) — supaya pemakaian konsisten, bukan tiap halaman manggil sonner mentah.
6. `getErrorMessage`: handle `message` string/array, network error, dan non-JSON response.
7. Theme toggle harus tanpa FOUC: script kecil inline di `__root.tsx` baca localStorage sebelum paint.
8. Kitchen sink route hanya ter-register saat dev (`import.meta.env.DEV`).

## Di luar scope

- Login/session (step 02), layout sidebar (step 03), halaman fitur apa pun.

## Verifikasi kunci

- Kitchen sink menampilkan: tombol semua varian + kondisi loading, toast sukses & error, ConfirmDialog dengan konfirmasi loading, TableSkeleton/EmptyState/ErrorState, StatusBadge semua status, formatRupiah/formatTanggal, toggle dark↔light tanpa flash & persist setelah reload.
