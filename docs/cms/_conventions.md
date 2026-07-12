# Konvensi Implementasi CMS (WAJIB dibaca sebelum ngoding step mana pun)

> Padanan `docs/_conventions.md` (backend) untuk frontend CMS. Aturan di sini berlaku untuk SEMUA halaman/step. Plan per step hanya menulis hal spesifik step itu — hal umum (loading, toast, error, format) merujuk ke sini.

## 1. Cara kerja

1. Kerjakan step sesuai urutan folder `docs/cms/NN. <Step>/`. Per fase, urut — satu fase ✅ semua dulu baru lanjut (aturan sama seperti backend).
2. Komponen shadcn ditambah via CLI-nya (`pnpm dlx shadcn@latest add <nama>`), jangan tulis manual.
3. Setiap selesai item → centang todo.md; selesai fase/step → update tabel progress CLAUDE.md.
4. `api-contract.md` tiap modul backend = sumber kebenaran endpoint. Types dari `src/lib/api/schema.d.ts` (regenerate: `pnpm generate:api`).
5. Verifikasi per step = **e2e Playwright** (`pnpm test:e2e`, folder `roastery-cms/e2e/`) + cek visual manual seperlunya. Tiap step WAJIB menulis `e2e/<step>.spec.ts` yang meng-otomasi checklist verifikasinya — termasuk kondisi loading (tombol disabled/skeleton), sukses (toast/redirect), dan error (pesan tampil). Unit test (vitest) hanya untuk helper murni (formatter dll).
   - Playwright auto-start dev server :3001 (`webServer` di `playwright.config.ts`). Spec yang butuh API mengasumsikan backend nyala di :3000 — sebutkan di komentar atas spec-nya.
   - **Interaksi wajib lewat helper `buka()` dari `e2e/utils.ts`** — menunggu `html[data-hydrated]` (di-set `__root.tsx`); klik sebelum React hydrate mendarat di tombol SSR tanpa handler dan diam-diam tidak terjadi apa-apa.
   - Tiap spec halaman baru menyertakan assert console bersih (`kumpulkanErrorConsole`) — penjaga regresi hydration/error runtime.

## 2. Struktur folder

```
src/
├── routes/                  # file-based routing TanStack Router
├── features/<modul>/        # per modul: komponen + queries + types lokal
│   ├── components/
│   └── queries.ts           # queryOptions + mutation per modul
├── components/
│   ├── ui/                  # shadcn (generated)
│   └── shared/              # EmptyState, ErrorState, ConfirmDialog, StatusBadge, dst.
├── lib/
│   ├── api/                 # client.ts (openapi-fetch) + schema.d.ts (generated)
│   └── format.ts            # formatRupiah, formatTanggal
└── integrations/tanstack-query/
```

## 3. API client

- **`openapi-fetch`** + types `schema.d.ts` → semua panggilan type-safe terhadap Swagger backend.
- Wajib `credentials: 'include'` (auth = cookie httpOnly). Base URL dari `VITE_API_URL`.
- Bentuk error backend (NestJS): `{ statusCode, message, error }` — `message` bisa string ATAU array (validasi 400). Helper `getErrorMessage(err)`: array → gabung baris; string → tampilkan langsung. **Pesan backend sudah bahasa Indonesia — tampilkan apa adanya, jangan diterjemahkan ulang/di-generic-kan.**

## 4. TanStack Query

- `queryKey` konvensi: `['<modul>', '<resource>', params]` — contoh `['orders','list',{page:1,status:'paid'}]`, `['orders','detail',id]`.
- Mutation sukses → `invalidateQueries` (BUKAN optimistic update — konsisten & sederhana; optimistic hanya kalau nanti ada kebutuhan nyata, diputuskan per kasus).
- List dengan filter/pagination: `placeholderData: keepPreviousData` supaya tabel tidak "kedip kosong" saat ganti halaman/filter.

## 5. Feedback UX (WAJIB — loading / sukses / error di TIAP interaksi)

> Prinsip: **user tidak boleh pernah bingung** "sudah kepencet belum?", "berhasil nggak?", "kok kosong?". Setiap aksi punya 3 kondisi yang kelihatan: loading, sukses, error. Checklist verifikasi tiap step WAJIB menguji ketiganya.

### Matriks standar

| Interaksi | Loading | Sukses | Error |
| --- | --- | --- | --- |
| **Buka halaman / detail** | Skeleton menyerupai layout final (bukan spinner fullscreen) | Konten tampil | `<ErrorState>` + pesan + tombol **"Coba lagi"** (refetch) |
| **Tabel: load pertama** | Skeleton 5 baris di dalam tabel | Data tampil; kalau kosong → `<EmptyState>` + CTA (mis. "Belum ada produk — **+ Tambah Produk**") | `<ErrorState>` dalam area tabel |
| **Tabel: ganti filter/halaman** | Data lama tetap tampil + indikator kecil (spinner mini di toolbar), tombol pagination disabled | Data baru menggantikan | Toast error, data lama tetap |
| **Submit form (create)** | Tombol disabled + spinner + teks "Menyimpan…" — **anti double-submit** | Toast sukses ("Produk berhasil dibuat") + redirect ke detail/list | 400 validasi → error per field + toast "Periksa isian form"; 409/lainnya → toast pesan backend; form TIDAK di-reset |
| **Submit form (update)** | sda ("Menyimpan…") | Toast "Perubahan disimpan", tetap di halaman, data ter-refresh | sda |
| **Hapus / aksi destruktif** | WAJIB `<ConfirmDialog>` dulu (judul + konsekuensi + tombol merah); tombol konfirmasi spinner "Menghapus…" | Toast sukses + item hilang dari list (invalidate) + dialog tertutup | Toast pesan backend (mis. 409 "Masih dipakai produk"), dialog tertutup |
| **Aksi status** (proses order, assign driver, approve wholesale, publish artikel…) | Tombol aksi spinner + disabled | Toast + badge status langsung berubah (invalidate detail+list) | Toast pesan backend (409 transisi tidak valid dsb.) |
| **Login** | Tombol "Masuk…" disabled + spinner | Redirect ke dashboard | **Inline di atas form** (bukan toast): "Email atau password salah" / pesan 403 suspended |

### Aturan toast (sonner, via shadcn)

- Posisi **kanan-bawah**. Sukses ± 4 detik; error ± 6 detik.
- Error toast menampilkan `getErrorMessage(err)` — bukan "Something went wrong" generik, kecuali network error/500: "Terjadi kesalahan. Coba lagi."
- Maksimal 1 toast per aksi (jangan dobel toast + inline untuk hal yang sama, kecuali form validasi: inline per-field + 1 toast ringkas).

### Error global (di API client / router)

- **401** di halaman selain login → redirect `/login` + toast "Sesi berakhir, silakan login lagi". (Di halaman login: inline.)
- **403** → halaman/blok "Tidak punya akses" (bukan crash, bukan silent).
- **404** resource → halaman not-found ringan dengan tombol kembali ke list.
- **Network/5xx** → toast generik + `ErrorState` kalau page-level.

### Larangan

- ❌ Spinner fullscreen yang memblokir semua (kecuali transisi login→dashboard sesaat).
- ❌ Tombol masih bisa diklik saat mutation jalan.
- ❌ Aksi sukses tanpa feedback apa pun ("kok nggak terjadi apa-apa?").
- ❌ Error hanya di console.
- ❌ Layout "lompat" saat loading → skeleton harus reserve ruang yang sama dengan konten final.

## 6. Komponen shared (dibangun di step 01, dipakai semua step)

`LoadingButton` (tombol + spinner + disabled otomatis saat pending), `PageSkeleton` / `TableSkeleton`, `EmptyState` (ikon + pesan + CTA), `ErrorState` (pesan + Coba lagi), `ConfirmDialog`, `StatusBadge` (mapping semua enum status backend → warna design system), `PageHeader` (judul + breadcrumb + aksi kanan).

## 7. Format tampilan

- **Uang**: `formatRupiah(185000)` → `Rp 185.000` (tanpa desimal — backend integer rupiah).
- **Tanggal**: `formatTanggal(iso)` → `12 Jul 2026, 14:32` (locale id-ID, zona waktu browser; sebutkan WIB hanya kalau eksplisit dibutuhkan).
- **Kode publik** (ORD-…, CUS-…, DLV-…): tampil monospace (JetBrains Mono).
- **Status enum**: selalu lewat `StatusBadge`, jangan teks mentah.

## 8. Design system

**Dark Roast** (lihat [design system/README.md](design%20system/README.md)) — dark default, light via `[data-theme="light"]`. Token dipasang sebagai CSS variables shadcn di `styles.css` (step 01). Font: Space Grotesk / Inter / JetBrains Mono.

## 9. Auth & role

- CMS hanya untuk **staff/admin**. Login user role lain → tolak dengan pesan jelas + logout otomatis (guard di router `beforeLoad`).
- Session dari `GET /auth/me` (`useQuery ['auth','me']`); refresh token otomatis dihandle cookie backend — kalau 401, coba `POST /auth/refresh` sekali lalu ulang, gagal → treat as logged out.
- **Role gate ada di DUA tempat, jangan cuma satu**: (1) `_auth.tsx` `beforeLoad` — nolak akses kalau sesi cookie yang nyangkut (mis. dari app lain, satu domain backend) bukan staff/admin; (2) form login — auto-logout + pesan kalau baru saja login pakai akun bukan staff/admin. `login.tsx`'s `beforeLoad` HANYA redirect ke `/` kalau role CMS valid (role lain dibiarkan tetap di halaman login, JANGAN redirect) — kalau kedua guard saling redirect tanpa syarat role ini, terjadi infinite loop.

## 10. SSR & kode server-only (WAJIB dibaca sebelum akses request/cookie di `beforeLoad`/loader)

- **`fetch` yang jalan SAAT SSR (di `beforeLoad`, loader, dsb.) tidak punya cookie jar browser sama sekali** — cookie httpOnly backend TIDAK otomatis ikut kecuali diteruskan manual dari request masuk. Tanpa ini, cek sesi di `beforeLoad` selalu "terlihat" logout tiap reload/navigasi-langsung-via-URL walau cookie browser valid (bug nyata step 02). Pola yang dipakai (`lib/api/client.ts`): `createServerOnlyFn` (dari `@tanstack/react-start`) membungkus `getRequestHeader('cookie')` (dari `@tanstack/react-start/server`), dipanggil di `onRequest` interceptor `api` client + tiap `fetch` manual (refresh dll.) yang jalan saat SSR.
- **Jangan import `@tanstack/react-start/server` langsung di file yang ke-bundle ke client** (mis. `lib/api/client.ts` yang dipakai di mana-mana) — Vite `import-protection` plugin BLOCK build (error jelas saat dev, tapi kalau lolos dev-cache basi bisa muncul sbg hydration-tidak-pernah-selesai tanpa pesan error jelas). Wajib bungkus pakai `createServerOnlyFn(...)` (fungsi ini sendiri aman diimpor di file client — cuma isi callback-nya yang di-strip dari bundle client) — dynamic `import()` ke `/server` taruh DI DALAM callback-nya.
- Limitasi yang diterima (bukan bug, keputusan sadar): token hasil rotate refresh SAAT SSR tidak ikut diteruskan balik ke cookie jar browser (Set-Cookie dari fetch server-side tidak otomatis nyambung ke response SSR kita). Dampaknya sempit (reload persis di menit ke-15 access-token) dan self-correct di request client-side berikutnya — tidak diotomasi lebih jauh.
- **Kalau hydration "diam" (tidak error, tidak crash, tapi `html[data-hydrated]` tidak pernah ke-set)**: curigai bundle client rusak, bukan logic React. Cek console browser utk `SyntaxError: ... does not provide an export named ...` — itu tanda dependency resolution pecah (versi ganda/paket nyasar), BUKAN bug kode. Diagnosis: `pnpm list --depth 0 | grep <paket>` (versi top-level) vs isi nyata `node_modules/.pnpm/` (semua versi yang kebawa) vs `readlink -f roastery-cms/node_modules/@tanstack/<paket>` (apa yang BENERAN ke-resolve — bisa jadi TIDAK ADA symlink-nya kalau paket itu cuma transitive dependency, dan Node/esbuild "naik" ke ancestor directory sampai ketemu — termasuk bisa nyasar ke folder di luar proyek kalau ada `node_modules` nyasar di direktori leluhur). Fix: tambah paket itu sbg dependency eksplisit di `package.json` supaya symlink lokal langsung ada (short-circuit sebelum resolver naik), `rm -rf node_modules/.vite .tanstack` + restart dev server (bukan cuma reload browser — Vite cache in-memory tidak keinvalidate cuma dari hapus file saat server masih hidup).

## 11. Definition of Done per step

1. Semua item todo tercentang; `pnpm typecheck` + `pnpm build` + `pnpm lint` + `pnpm check` + `pnpm test` hijau. (**Catatan: `vite build` TIDAK type-check** — esbuild cuma strip types; `pnpm typecheck` (tsc --noEmit) wajib.)
2. `pnpm test:e2e` hijau — spec step ini meng-cover loading/sukses/error per halaman (lihat §1 poin 5).
3. Tidak ada `console.error` liar di happy path (di-assert otomatis di e2e).
4. CLAUDE.md progress + commit.
