import { expect, test } from '@playwright/test'
import { buka, kumpulkanErrorConsole, navigasiSidebar } from './utils'
import { daftarUser, hapusUserTest, jadikanStaff } from './helpers/backend'

/**
 * E2E pelanggan & wholesale (step 07) — BUTUH backend nyala di :3000.
 */
test.describe.configure({ mode: 'serial' })

const runId = Date.now()
const email = `e2e-pelanggan-${runId}@example.com`
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

test('sidebar Pelanggan punya sub-menu dan halaman daftar termuat', async ({
  page,
}) => {
  const errors = kumpulkanErrorConsole(page)
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await navigasiSidebar(page, 'Pelanggan', 'Daftar')
  await expect(page.getByRole('heading', { name: 'Pelanggan' })).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)
})

test('halaman daftar pelanggan termuat dengan tabel dan search', async ({
  page,
}) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await navigasiSidebar(page, 'Pelanggan', 'Daftar')
  await expect(page.getByRole('heading', { name: 'Pelanggan' })).toBeVisible()
  // dev DB bisa kosong — DataTable render EmptyState, bukan <table>
  await expect(
    page.getByRole('table').or(page.getByText('Belum ada pelanggan')),
  ).toBeVisible()
  await expect(page.getByPlaceholder('Cari nama/email/kode...')).toBeVisible()
})

test('halaman Pengajuan Wholesale termuat dengan tabel dan filter', async ({
  page,
}) => {
  const errors = kumpulkanErrorConsole(page)
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await navigasiSidebar(page, 'Pelanggan', 'Pengajuan Wholesale')
  await expect(
    page.getByRole('heading', { name: 'Pengajuan Wholesale' }),
  ).toBeVisible()
  // dev DB bisa kosong (belum ada pengajuan pending) — DataTable render
  // EmptyState, bukan <table>
  await expect(
    page.getByRole('table').or(page.getByText('Tidak ada pengajuan menunggu')),
  ).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)
})
