# CMS 02. Auth & Sesi — Login, Guard, Logout

> Konsumen pertama API backend dari UI. Kontrak: [docs/01. Authentication/api-contract.md](../../01.%20Authentication/api-contract.md). Aturan feedback: [konvensi §5](../_conventions.md).

## Tujuan

1. Halaman `/login` — form email+password, cookie httpOnly cross-origin terbukti jalan.
2. Session management: `useQuery(['auth','me'])` + router context; guard semua route non-login via `beforeLoad`.
3. **Role gate**: CMS khusus `staff`/`admin` — user role lain ditolak dengan pesan jelas + auto logout.
4. Logout (dropdown user) + penanganan 401 global (sesi berakhir → redirect login + toast).

## Alur & feedback (eksplisit)

### Login (`POST /auth/login`)

- **Loading**: `LoadingButton` "Masuk…", kedua input disabled.
- **Sukses**: redirect ke `/` (dashboard); tidak perlu toast (perpindahan halaman = feedback-nya).
- **Error — WAJIB inline di atas form, BUKAN toast**:
  - 401 → "Email atau password salah" (pesan backend).
  - 403 suspended → pesan backend ("Akun ditangguhkan…").
  - Role bukan staff/admin (login sukses tapi `me.role` retail/wholesale/driver) → "Akun ini tidak punya akses CMS", panggil `POST /auth/logout`, tetap di halaman login.
  - Network → "Tidak bisa terhubung ke server. Coba lagi."
- Validasi client ringan: email format + password tidak kosong (error per-field, sebelum submit ke server).

### Guard route

- `beforeLoad` root: belum login (me 401 setelah 1x percobaan refresh) → `redirect({ to: '/login' })`.
- Sudah login buka `/login` → redirect ke `/`.
- **Loading awal app** (cek sesi): `PageSkeleton` singkat — bukan layar putih, bukan flash halaman login.

### Logout (`POST /auth/logout`)

- **Loading**: item menu disabled + spinner kecil.
- **Sukses**: redirect `/login` + toast "Berhasil keluar".
- **Error**: tetap paksa ke `/login` (clear query cache) — sesi lokal dianggap habis apa pun jawaban server, tapi tampilkan toast error kalau bukan 401.

### 401 global (sesi kedaluwarsa di tengah pemakaian)

- Interceptor di client API: 401 → coba `POST /auth/refresh` sekali → ulang request. Masih 401 → clear cache, redirect `/login`, toast "Sesi berakhir, silakan login lagi".

## Aturan Implementasi (WAJIB)

1. Jangan simpan token apa pun di JS — semua cookie httpOnly (backend yang set). Yang disimpan di query cache hanya profil `me`.
2. Form pakai TanStack Form + Zod schema (`email`, `password` min 8 — samakan dengan DTO backend).
3. Refresh-retry cuma SEKALI per request (hindari loop refresh).
4. Halaman login memakai design system penuh (logo, dark default) — ini kesan pertama CMS.

## Di luar scope

- Registrasi (CMS tidak punya — akun staf dibuat manual/seed), lupa password (belum ada di backend), manajemen user staf (backlog backend).

## Verifikasi kunci

Login benar → dashboard; password salah → inline error; user retail → ditolak + pesan; suspended → pesan backend; hapus cookie manual saat di dalam → aksi berikutnya redirect login + toast; logout → login + toast; buka `/login` saat sudah login → mental ke `/`; loading state kelihatan saat throttling.
