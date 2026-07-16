import { expect, test } from '@playwright/test'
import { buka, kumpulkanErrorConsole, navigasiSidebar } from './utils'
import { daftarUser, hapusUserTest, jadikanStaff } from './helpers/backend'

/**
 * E2E pengiriman (step 09) — BUTUH backend nyala di :3000.
 * Sub-menu: Papan Dispatch, Zona, Driver, Kendaraan, Setoran COD.
 */
test.describe.configure({ mode: 'serial' })

const runId = Date.now()
const email = `e2e-pengiriman-${runId}@example.com`
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

async function login(page: Parameters<typeof buka>[0]) {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
}

test('sidebar Pengiriman punya sub-menu dan Papan Dispatch termuat', async ({
  page,
}) => {
  const errors = kumpulkanErrorConsole(page)
  await login(page)

  await navigasiSidebar(page, 'Pengiriman', 'Papan Dispatch')
  await expect(
    page.getByRole('heading', { name: 'Papan Dispatch' }),
  ).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)
})

test('halaman Papan Dispatch termuat (tabel atau empty state, tergantung data)', async ({
  page,
}) => {
  await login(page)

  await navigasiSidebar(page, 'Pengiriman', 'Papan Dispatch')
  await expect(
    page.getByRole('heading', { name: 'Papan Dispatch' }),
  ).toBeVisible()
  await expect(
    page.getByRole('table').or(page.getByText('Tidak ada delivery')),
  ).toBeVisible()
})

test('halaman Zona termuat dan dialog tambah bisa dibuka/tutup', async ({
  page,
}) => {
  const errors = kumpulkanErrorConsole(page)
  await login(page)

  await navigasiSidebar(page, 'Pengiriman', 'Zona')
  await expect(page.getByRole('heading', { name: 'Zona' })).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)

  // dev DB bisa kosong, saat itu tombol "Tambah Zona" muncul 2x
  // (PageHeader aksi + EmptyState aksi), pakai .first()
  await page.getByRole('button', { name: /tambah zona/i }).first().click()
  await expect(page.getByLabel('Nama Zona')).toBeVisible()
  await expect(page.getByPlaceholder('Cari kecamatan…')).toBeVisible()

  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('halaman Driver termuat dan dialog registrasi bisa dibuka/tutup', async ({
  page,
}) => {
  const errors = kumpulkanErrorConsole(page)
  await login(page)

  await navigasiSidebar(page, 'Pengiriman', 'Driver')
  await expect(page.getByRole('heading', { name: 'Driver' })).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)

  await page
    .getByRole('button', { name: /registrasi driver/i })
    .first()
    .click()
  await expect(page.getByLabel('User ID')).toBeVisible()

  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('halaman Kendaraan termuat dan dialog tambah bisa dibuka/tutup', async ({
  page,
}) => {
  const errors = kumpulkanErrorConsole(page)
  await login(page)

  await navigasiSidebar(page, 'Pengiriman', 'Kendaraan')
  await expect(page.getByRole('heading', { name: 'Kendaraan' })).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)

  await page
    .getByRole('button', { name: /tambah kendaraan/i })
    .first()
    .click()
  await expect(page.getByLabel('Plat Nomor')).toBeVisible()

  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('halaman Setoran COD termuat, minta pilih driver dulu', async ({
  page,
}) => {
  const errors = kumpulkanErrorConsole(page)
  await login(page)

  await navigasiSidebar(page, 'Pengiriman', 'Setoran COD')
  await expect(
    page.getByRole('heading', { name: 'Setoran COD' }),
  ).toBeVisible()
  // "Pilih driver" ambigu: muncul di placeholder Select DAN judul EmptyState
  await expect(
    page.getByText('Pilih driver untuk melihat saldo COD'),
  ).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)
})
