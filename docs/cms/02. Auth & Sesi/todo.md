# CMS 02. Auth & Sesi — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md).

## Fase 0 — Infrastruktur sesi

- [ ] `features/auth/queries.ts`: query `['auth','me']` + mutation login/logout
- [ ] Interceptor 401 di API client: refresh sekali → retry → gagal = clear cache + redirect `/login` + toast "Sesi berakhir"
- [ ] Router context menyimpan status auth utk `beforeLoad`

## Fase 1 — Halaman login

- [ ] Route `/login` + form (TanStack Form + Zod: email valid, password ≥ 8) — error per-field sebelum submit
- [ ] Loading: `LoadingButton` "Masuk…", input disabled
- [ ] Error inline (bukan toast): 401 pesan backend, 403 suspended, network error
- [ ] Role gate: login sukses tapi bukan staff/admin → pesan "tidak punya akses CMS" + auto `POST /auth/logout`
- [ ] Sukses → redirect `/`
- [ ] Styling sesuai design system (logo + dark default)

## Fase 2 — Guard & logout

- [ ] `beforeLoad` root: tanpa sesi → redirect `/login`; ada sesi buka `/login` → redirect `/`
- [ ] Loading cek sesi awal: `PageSkeleton` (bukan layar putih/flash login)
- [ ] Logout dari menu user: loading spinner → sukses redirect `/login` + toast "Berhasil keluar"; error non-401 → tetap redirect + toast error
- [ ] Placeholder halaman `/` sederhana ("Halo, {email}") — layout beneran di step 03

## Fase 3 — Verifikasi

- [ ] Login benar → masuk; password salah → inline "Email atau password salah"
- [ ] User role retail dicoba → ditolak dengan pesan + tidak nyangkut setengah-login
- [ ] User suspended → pesan backend tampil
- [ ] Hapus cookie manual di tengah sesi → aksi berikutnya redirect login + toast sesi berakhir
- [ ] Refresh otomatis: tunggu access token expired (atau perpendek TTL di env dev backend) → request tetap jalan tanpa logout
- [ ] Loading states kelihatan dengan Network throttling
- [ ] `pnpm build` + `pnpm lint` + `pnpm check` hijau
- [ ] Update CLAUDE.md + commit
