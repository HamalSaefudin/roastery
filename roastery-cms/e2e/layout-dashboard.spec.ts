import { expect, test } from '@playwright/test'
import { buka } from './utils'
import { daftarUser, hapusUserTest, jadikanStaff } from './helpers/backend'

test.describe.configure({ mode: 'serial' })

const runId = Date.now()
const email = `e2e-layout-${runId}@example.com`
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

test('login -> dashboard dengan sidebar & topbar termuat', async ({ page }) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Selamat datang, ' + email)).toBeVisible()
  await expect(page.getByText('Order Baru')).toBeVisible()

  await expect(page.getByText('ROASTERY')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pesanan' })).toBeVisible()
})

test('sidebar collapse persist setelah reload', async ({ page }) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page.getByText('ROASTERY')).toBeVisible()

  await page.getByLabel('Ciutkan sidebar').click()
  await expect(page.getByText('ROASTERY')).toBeHidden()

  await page.reload()
  await expect(page.getByText('ROASTERY')).toBeHidden()

  await page.getByLabel('Perluas sidebar').click()
  await expect(page.getByText('ROASTERY')).toBeVisible()
})

test('navigasi sidebar ke placeholder pages', async ({ page }) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await page.getByRole('link', { name: 'Pesanan' }).click()
  await expect(page.getByRole('heading', { name: 'Pesanan' })).toBeVisible()
  await expect(page.getByText('segera tersedia')).toBeVisible()

  await page.getByRole('link', { name: 'Konten' }).click()
  await expect(page.getByRole('heading', { name: 'Konten' })).toBeVisible()
  await expect(page.getByText('segera tersedia')).toBeVisible()
})

test('halaman 403 dan 404 termuat dalam layout', async ({ page }) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await buka(page, '/403')
  await expect(page.getByText('403')).toBeVisible()
  await expect(page.getByText('tidak punya izin')).toBeVisible()

  await buka(page, '/404')
  await expect(page.getByText('404')).toBeVisible()
  await expect(page.getByText('tidak ditemukan')).toBeVisible()
})

test('breadcrumb benar saat navigasi', async ({ page }) => {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await page.getByRole('link', { name: 'Katalog' }).click()
  await page.getByRole('link', { name: 'Brand' }).click()
  await expect(page.getByRole('heading', { name: 'Brand' })).toBeVisible()
})
