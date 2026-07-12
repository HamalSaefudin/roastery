# CMS 02. Auth & Sesi — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md).

## Fase 0 — Infrastruktur sesi

- [x] `features/auth/queries.ts`: query `['auth','me']` + mutation login/logout
- [x] Interceptor 401 di API client: refresh sekali → retry → gagal = clear cache + redirect `/login` + toast "Sesi berakhir" (hanya kalau PERNAH autentikasi — lihat catatan di bawah)
- [x] Router context menyimpan status auth utk `beforeLoad` (`_auth.tsx`, `login.tsx`)

## Fase 1 — Halaman login

- [x] Route `/login` + form (TanStack Form + Zod: email valid, password ≥ 8) — error per-field `onBlur`
- [x] Loading: `LoadingButton` "Masuk…", input disabled
- [x] Error inline (bukan toast): 401 "Email atau password salah", 403 "Akun disuspend" (pesan backend), network error
- [x] Role gate: login sukses tapi bukan staff/admin → "Akun ini tidak punya akses CMS" + auto `POST /auth/logout`
- [x] Sukses → redirect `/`
- [x] Styling sesuai design system (logo + dark default)

## Fase 2 — Guard & logout

- [x] `beforeLoad` `_auth.tsx`: tanpa sesi ATAU role bukan staff/admin → redirect `/login`; `login.tsx`: sesi valid role CMS → redirect `/` (role lain TIDAK di-redirect, mencegah loop bolak-balik dgn guard)
- [x] Loading cek sesi awal: `PageSkeleton` (`pendingComponent` di `_auth.tsx`)
- [x] Logout dari dashboard: loading spinner → sukses redirect `/login` + toast "Berhasil keluar"; error non-401 → tetap redirect + toast error
- [x] Placeholder halaman `/` ("Halo, {email}") — layout beneran step 03

## Fase 3 — Verifikasi

- [x] Login benar → masuk; password salah → inline "Email atau password salah"
- [x] User role retail dicoba → ditolak dengan pesan + auto-logout, tidak nyangkut setengah-login
- [x] User suspended → pesan backend "Akun disuspend" tampil
- [x] Hapus cookie manual di tengah sesi → aksi berikutnya (reload) redirect login
- [x] Refresh otomatis: diverifikasi via code path (retry-refresh jalan di test "sesi persist setelah reload"); skenario spesifik "401 mid-request tanpa reload → toast sesi berakhir" **belum ada e2e** — staleTime 60dtk bikin sulit dipicu deterministik dari black-box test, dicatat sbg gap di `e2e/auth.spec.ts` (ditutup step 03 saat ada UI interaktif nyata)
- [x] Loading states kelihatan (LoadingButton disabled+spinner, PageSkeleton) — dibuktikan lewat Playwright assertion, bukan cuma visual
- [x] `pnpm typecheck` + `pnpm build` + `pnpm lint` + `pnpm check` + `pnpm test` (6) + `pnpm test:e2e` (18, termasuk kitchen-sink) hijau, idempoten (2x run)
- [x] Update CLAUDE.md + commit

## Bug nyata ditemukan & diperbaiki selama step ini

1. **SSR tidak meneruskan cookie ke backend** — `beforeLoad` jalan di Node (fetch SSR, tanpa cookie jar browser), jadi reload/navigasi-langsung selalu "terlihat" logout walau cookie browser valid. Fix: `createServerOnlyFn` (`@tanstack/react-start`) + `getRequestHeader('cookie')` diteruskan manual ke tiap request `api` client + `refreshSekali()`. Limitasi yang diterima & didokumentasikan: token hasil rotate SAAT SSR tidak ikut balik ke cookie jar browser (skenario sempit, dampak cuma perlu login ulang).
2. **`@tanstack/react-start/server` diimpor langsung di file yang ke-bundle ke client** → Vite `import-protection` plugin block build. Fix: bungkus pakai `createServerOnlyFn`.
3. **Paket nyasar di luar proyek**: `/Users/macbook/node_modules/@tanstack/router-core@1.169.2` (folder asing, bukan bagian repo manapun) ikut ke-resolve oleh Vite optimizer karena `@tanstack/router-core` tidak dideklarasikan sbg dependency langsung `roastery-cms` (transitive-only), dan Node/esbuild jalan naik ke direktori leluhur sampai ketemu itu — menyebabkan bundle client rusak permanen ("does not provide an export named 'appendUniqueUserTags'"), gejalanya persis hydration yang tidak pernah selesai. Fix (dalam kendali proyek, tanpa menyentuh folder di luar proyek): tambah `@tanstack/router-core` sbg dependency eksplisit di `package.json` supaya symlink lokal langsung ada, short-circuit sebelum resolver naik ke ancestor directory. Sekalian sinkron versi `router-plugin`/`router-cli` yang masih nyisa `^1.132.0` dari kesalahan `pin-versions` step 00.
4. **Race kondisi test**: `test.beforeAll` di Playwright jalan sekali PER WORKER (bukan sekali global) — dengan `fullyParallel: true`, tanpa `test.describe.configure({ mode: 'serial' })` beberapa worker mendaftar user test yang sama secara konkuren → backend balikin 500 mentah (bukan 409 bersih) saat registrasi email duplikat konkuren. **Dicatat sbg temuan backend terpisah** (race condition di `AuthService.register` — pre-check+insert, bukan atomic upsert), bukan blocker step ini (skenario sangat sempit, cuma kejadian di test).
