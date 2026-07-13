import { expect, test } from '@playwright/test'
import { buka, kumpulkanErrorConsole } from './utils'
import { daftarUser, hapusUserTest, jadikanStaff } from './helpers/backend'

/**
 * E2E stok (step 05) — BUTUH backend nyala di :3000.
 * Memverifikasi navigasi sub-menu stok dan struktur halaman.
 */
test.describe.configure({ mode: 'serial' })

const runId = Date.now()
const email = `e2e-stok-${runId}@example.com`
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

test('sidebar stok punya sub-menu dan menu Stok Biji termuat', async ({
  page,
}) => {
  const errors = kumpulkanErrorConsole(page)
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  // klik parent menu Stok
  await page.getByRole('link', { name: 'Stok' }).first().click()
  await expect(page.getByRole('heading', { name: 'Stok' })).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)
})

test('halaman Stok Biji termuat dengan tabel', async ({ page }) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await page.getByRole('link', { name: 'Stok Biji' }).click()
  await expect(page.getByRole('heading', { name: 'Stok Biji' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
})

test('halaman Stok Unit termuat dengan tabel', async ({ page }) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await page.getByRole('link', { name: 'Stok Unit' }).click()
  await expect(page.getByRole('heading', { name: 'Stok Unit' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
})

test('halaman Riwayat Stok termuat dengan tabel', async ({ page }) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await page.getByRole('link', { name: 'Riwayat Stok' }).click()
  await expect(
    page.getByRole('heading', { name: 'Riwayat Stok' }),
  ).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
})
