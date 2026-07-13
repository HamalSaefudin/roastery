import { expect, test } from '@playwright/test'
import { buka, kumpulkanErrorConsole } from './utils'
import {
  daftarUser,
  hapusUserTest,
  jadikanStaff,
  jadikanSuspended,
} from './helpers/backend'

/**
 * E2E auth (step 02) — BUTUH backend nyala di :3000 (`pnpm --dir
 * ../roastery-service start:dev`) + docker `roastery-postgres` jalan
 * (dipakai helpers/backend.ts utk set role/status test user).
 */

// WAJIB serial: semua test pakai 3 user yang sama dari satu beforeAll.
// Dengan fullyParallel (playwright.config.ts), test dalam 1 file bisa
// disebar ke worker berbeda -> beforeAll jalan berkali-kali -> daftarUser()
// dgn email sama secara konkuren -> backend 500 (unique-constraint race,
// bukan 409 bersih — ditemukan langsung saat run pertama tanpa serial).
test.describe.configure({ mode: 'serial' })

const runId = Date.now()
const staffEmail = `e2e-staff-${runId}@example.com`
const retailEmail = `e2e-retail-${runId}@example.com`
const suspendedEmail = `e2e-suspended-${runId}@example.com`
const password = 'password123'

test.beforeAll(async () => {
  await daftarUser(staffEmail, password)
  jadikanStaff(staffEmail)
  await daftarUser(retailEmail, password)
  await daftarUser(suspendedEmail, password)
  jadikanSuspended(suspendedEmail)
})

test.afterAll(() => {
  hapusUserTest(staffEmail, retailEmail, suspendedEmail)
})

test.afterEach(async ({ page }) => {
  // pastikan tidak ada sesi nyangkut antar test (masing-masing test login sendiri)
  await page.context().clearCookies()
})

test('halaman login termuat tanpa error console', async ({ page }) => {
  const errors = kumpulkanErrorConsole(page)
  await buka(page, '/login')
  await expect(page.getByText('Masuk ke panel admin')).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)
})

test('validasi client: email kosong & password < 8 karakter (sebelum submit)', async ({
  page,
}) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill('bukan-email')
  await page.getByLabel('Email').blur()
  await expect(page.getByText('Format email tidak valid')).toBeVisible()

  await page.getByLabel('Password').fill('pendek')
  await page.getByLabel('Password').blur()
  await expect(page.getByText('Password minimal 8 karakter')).toBeVisible()
})

test('login sukses (staff) -> redirect dashboard, sesi persist setelah reload', async ({
  page,
}) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(staffEmail)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await expect(page.getByText(staffEmail)).toBeVisible()
  expect(page.url()).toContain('/')
  expect(page.url()).not.toContain('/login')

  // reload penuh -> SSR beforeLoad harus meneruskan cookie ke backend
  // (bug nyata yang ketemu saat verifikasi manual: tanpa forwarding ini,
  // reload selalu mental ke /login walau cookie browser valid)
  await page.reload()
  await expect(page.getByText(staffEmail)).toBeVisible()
})

test('login gagal: password salah -> pesan inline, tetap di /login', async ({
  page,
}) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(staffEmail)
  await page.getByLabel('Password').fill('password-salah')
  await page.getByRole('button', { name: 'Masuk' }).click()

  await expect(page.getByText('Email atau password salah')).toBeVisible()
  expect(page.url()).toContain('/login')
})

test('login gagal: akun suspended -> pesan backend tampil', async ({
  page,
}) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(suspendedEmail)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await expect(page.getByText('Akun disuspend')).toBeVisible()
  expect(page.url()).toContain('/login')
})

test('login sukses tapi role retail -> ditolak akses CMS, auto logout, tetap di /login', async ({
  page,
}) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(retailEmail)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await expect(page.getByText('Akun ini tidak punya akses CMS')).toBeVisible()
  expect(page.url()).toContain('/login')

  // dibuktikan benar-benar logout (bukan cuma UI): reload tetap di /login,
  // bukan ke dashboard
  await page.reload()
  await expect(page.getByText('Masuk ke panel admin')).toBeVisible()
})

test('guard: buka / tanpa sesi -> redirect diam-diam ke /login (tanpa toast)', async ({
  page,
}) => {
  await buka(page, '/')
  await expect(page.getByText('Masuk ke panel admin')).toBeVisible()
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
})

test('buka /login saat sudah login (role CMS) -> mental ke dashboard', async ({
  page,
}) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(staffEmail)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page.getByText(staffEmail)).toBeVisible()

  await buka(page, '/login')
  await expect(page.getByText(staffEmail)).toBeVisible()
})

test('logout: redirect /login, sesi benar-benar habis', async ({ page }) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(staffEmail)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page.getByText(staffEmail)).toBeVisible()

  // handleLogout (app-topbar.tsx) tidak menampilkan toast — redirect ke
  // /login sendiri sudah jadi konfirmasi visual logout berhasil
  await page.getByRole('button', { name: 'Keluar' }).click()
  await expect(page.getByText('Masuk ke panel admin')).toBeVisible()

  await buka(page, '/')
  await expect(page.getByText('Masuk ke panel admin')).toBeVisible()
})

test('cookie dihapus manual saat di dalam -> aksi berikutnya (reload) redirect ke /login', async ({
  page,
}) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(staffEmail)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page.getByText(staffEmail)).toBeVisible()

  await page.context().clearCookies()
  await page.reload()

  await expect(page.getByText('Masuk ke panel admin')).toBeVisible()
})

// Catatan: jalur interceptor 401 mid-session ("### 401 global" di plan.md —
// refresh gagal SAAT ADA request aktif -> toast "Sesi berakhir" tanpa
// reload) sengaja BELUM diuji e2e otomatis. meQueryOptions pakai
// staleTime 60dtk supaya navigasi client-side tidak spam /me tiap pindah
// halaman; ini bikin skenario itu sulit dipicu deterministik dari e2e
// black-box tanpa hook test-only (mis. paksa invalidate query). Mekanisme
// interceptor-nya sendiri (lib/api/client.ts) sudah diverifikasi lewat
// code review + test lain di atas (retry-refresh jalan, lihat "sesi
// persist setelah reload"). Ditutup manual/di step 03 saat ada UI
// interaktif nyata (nav sidebar) yang lebih natural utk trigger ini.
