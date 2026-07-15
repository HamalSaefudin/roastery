import { expect, test } from '@playwright/test'
import { buka, kumpulkanErrorConsole, navigasiSidebar } from './utils'
import { daftarUser, hapusUserTest, jadikanStaff } from './helpers/backend'

test.describe.configure({ mode: 'serial' })

const runId = Date.now()
const email = `e2e-pesanan-${runId}@example.com`
const password = 'password123'

test.beforeAll(async () => {
  await daftarUser(email, password)
  jadikanStaff(email)
})

test.afterAll(() => {
  hapusUserTest(email)
})

test.afterEach(async ({ page }) => {
  await page.context().clearCookies()
})

test('sidebar Pesanan punya sub-menu Daftar dan Invoice', async ({ page }) => {
  const errors = kumpulkanErrorConsole(page)
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await navigasiSidebar(page, 'Pesanan', 'Daftar')
  await expect(page.getByRole('heading', { name: 'Pesanan' })).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)
})

test('halaman daftar pesanan termuat dengan tabel dan search', async ({
  page,
}) => {
  const errors = kumpulkanErrorConsole(page)
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await navigasiSidebar(page, 'Pesanan', 'Daftar')
  await expect(page.getByRole('heading', { name: 'Pesanan' })).toBeVisible()
  // dev DB bisa kosong (belum ada order) — DataTable render EmptyState,
  // bukan <table>, saat data kosong (lihat data-table.tsx). Filter default
  // "Butuh perhatian" bukan string kosong, jadi judul EmptyState-nya
  // "Tidak ada pesanan" (bukan "Belum ada pesanan").
  await expect(
    page.getByRole('table').or(page.getByText('Tidak ada pesanan')),
  ).toBeVisible()
  await expect(page.getByPlaceholder('Cari nomor pesanan...')).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)
})

test('halaman Invoice termuat, tampilkan error krn GET /payments/invoices belum ada di backend', async ({
  page,
}) => {
  // TIDAK pakai kumpulkanErrorConsole di sini — 404 asli dari backend
  // (endpoint list invoice belum ada) bikin Chrome log "Failed to load
  // resource" ke console sbg error, itu SIMPTOM YANG DIHARAPKAN dari test
  // ini, bukan bug yang perlu digagalkan.
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await navigasiSidebar(page, 'Pesanan', 'Invoice')
  await expect(
    page.getByRole('heading', { name: 'Invoice Wholesale' }),
  ).toBeVisible()
  // Backend modul Payments belum punya endpoint list invoice (cuma
  // create + pay per-id) — 404 asli, bukan bug test. DataTable dengan
  // benar menampilkan ErrorState (bukan <table> atau EmptyState). Timeout
  // diperpanjang: React Query retry 3x dgn backoff (~7s) sebelum settle
  // ke status error, lebih lama dari default assertion timeout 5s.
  // "Gagal memuat data" muncul 2x (judul + deskripsi default ErrorState),
  // pakai tombol "Coba lagi" yang unik utk memastikan ErrorState-nya render.
  await expect(
    page.getByRole('button', { name: 'Coba lagi' }),
  ).toBeVisible({ timeout: 10_000 })
})
