import { expect, test } from '@playwright/test'
import { buka, kumpulkanErrorConsole } from './utils'
import { daftarUser, hapusUserTest, jadikanStaff } from './helpers/backend'

/**
 * E2E katalog & master data (step 04) — BUTUH backend nyala di :3000.
 * Test ini fokus ke navigasi, struktur halaman, dan interaksi dasar
 * yang bisa diverifikasi tanpa data backend spesifik.
 */
test.describe.configure({ mode: 'serial' })

const runId = Date.now()
const email = `e2e-katalog-${runId}@example.com`
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

test('halaman Brand termuat tanpa error console', async ({ page }) => {
  const errors = kumpulkanErrorConsole(page)
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await page.getByRole('link', { name: 'Brand' }).click()
  await expect(page.getByRole('heading', { name: 'Brand' })).toBeVisible()

  // komponen DataTable terlihat (skeleton, data, atau error)
  await expect(page.getByRole('table')).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)
})

test('dialog tambah Brand bisa dibuka dan ditutup', async ({ page }) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await page.getByRole('link', { name: 'Brand' }).click()
  await expect(page.getByRole('heading', { name: 'Brand' })).toBeVisible()

  await page.getByRole('button', { name: /tambah brand/i }).click()
  await expect(page.getByText('Nama Brand')).toBeVisible()

  await page.getByRole('button', { name: 'Batal' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('halaman Origin termuat', async ({ page }) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await page.getByRole('link', { name: 'Origin' }).click()
  await expect(page.getByRole('heading', { name: 'Origin' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
})

test('halaman Kategori termuat', async ({ page }) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await page.getByRole('link', { name: 'Kategori' }).click()
  await expect(page.getByRole('heading', { name: 'Kategori' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
})

test('halaman list produk termuat', async ({ page }) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await page.getByRole('link', { name: 'Katalog' }).click()
  await expect(page.getByRole('heading', { name: 'Produk' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
})

test('halaman tambah produk termuat dengan 3 kartu pilihan tipe', async ({
  page,
}) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await page.getByRole('link', { name: 'Katalog' }).click()
  await page.getByRole('link', { name: 'Tambah Produk' }).click()
  await expect(
    page.getByRole('heading', { name: 'Tambah Produk' }),
  ).toBeVisible()

  // 3 kartu tipe produk
  await expect(page.getByText('Biji Kopi')).toBeVisible()
  await expect(page.getByText('Mesin Espresso')).toBeVisible()
  await expect(page.getByText('Grinder')).toBeVisible()
})
