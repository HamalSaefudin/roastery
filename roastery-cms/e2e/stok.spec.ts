import { expect, test } from '@playwright/test'
import { buka, kumpulkanErrorConsole, navigasiSidebar } from './utils'
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

async function login(page: Parameters<typeof buka>[0]) {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
}

test('sidebar stok punya sub-menu dan menu Stok Biji termuat', async ({
  page,
}) => {
  const errors = kumpulkanErrorConsole(page)
  await login(page)

  await navigasiSidebar(page, 'Stok', 'Biji')
  await expect(page.getByRole('heading', { name: 'Stok Biji' })).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)
})

test('halaman Stok Biji termuat (tabel atau empty state, tergantung data)', async ({
  page,
}) => {
  await login(page)

  await navigasiSidebar(page, 'Stok', 'Biji')
  await expect(page.getByRole('heading', { name: 'Stok Biji' })).toBeVisible()
  // dev DB bisa kosong (belum ada penyesuaian stok) — DataTable render
  // EmptyState, bukan <table>, saat data kosong (lihat data-table.tsx)
  await expect(
    page.getByRole('table').or(page.getByText('Belum ada data stok')),
  ).toBeVisible()
})

test('halaman Unit Equipment termuat (tabel atau empty state, tergantung data)', async ({
  page,
}) => {
  await login(page)

  await navigasiSidebar(page, 'Stok', 'Unit')
  await expect(
    page.getByRole('heading', { name: 'Unit Equipment' }),
  ).toBeVisible()
  await expect(
    page.getByRole('table').or(page.getByText('Belum ada unit')),
  ).toBeVisible()
})

test('halaman Riwayat Stok termuat (tabel atau empty state, tergantung data)', async ({
  page,
}) => {
  await login(page)

  await navigasiSidebar(page, 'Stok', 'Riwayat')
  await expect(
    page.getByRole('heading', { name: 'Riwayat Stok' }),
  ).toBeVisible()
  await expect(
    page.getByRole('table').or(page.getByText('Belum ada riwayat')),
  ).toBeVisible()
})
