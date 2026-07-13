import { expect, test } from '@playwright/test'
import { buka, kumpulkanErrorConsole, navigasiSidebar } from './utils'
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

async function login(page: Parameters<typeof buka>[0]) {
  await buka(page, '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
}

test('halaman Brand termuat tanpa error console', async ({ page }) => {
  const errors = kumpulkanErrorConsole(page)
  await login(page)

  await navigasiSidebar(page, 'Katalog', 'Brand')
  await expect(page.getByRole('heading', { name: 'Brand' })).toBeVisible()

  // komponen DataTable terlihat (skeleton, data, atau error)
  await expect(page.getByRole('table')).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)
})

test('dialog tambah Brand bisa dibuka dan ditutup', async ({ page }) => {
  await login(page)

  await navigasiSidebar(page, 'Katalog', 'Brand')
  await expect(page.getByRole('heading', { name: 'Brand' })).toBeVisible()

  await page.getByRole('button', { name: /tambah brand/i }).click()
  // label field cuma "Nama" — tabel Brand di belakang dialog JUGA punya
  // kolom "Nama", jadi getByText('Nama') ambigu. getByLabel aman karena
  // cuma match <label> form field beneran, bukan <th> tabel.
  await expect(page.getByLabel('Nama')).toBeVisible()

  // dialog tambah/edit (bukan ConfirmDialog) tidak punya tombol "Batal",
  // cuma ikon X close bawaan shadcn Dialog (aria: "Close")
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('halaman Origin termuat', async ({ page }) => {
  await login(page)

  await navigasiSidebar(page, 'Katalog', 'Origin')
  await expect(page.getByRole('heading', { name: 'Origin' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
})

test('halaman Kategori termuat', async ({ page }) => {
  await login(page)

  await navigasiSidebar(page, 'Katalog', 'Kategori')
  await expect(page.getByRole('heading', { name: 'Kategori' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
})

test('halaman list produk termuat (tabel atau empty state, tergantung data)', async ({
  page,
}) => {
  await login(page)

  await navigasiSidebar(page, 'Katalog', 'Produk')
  await expect(page.getByRole('heading', { name: 'Produk' })).toBeVisible()
  await expect(
    page.getByRole('table').or(page.getByText('Belum ada produk')),
  ).toBeVisible()
})

test('halaman tambah produk termuat dengan 3 kartu pilihan tipe', async ({
  page,
}) => {
  await login(page)

  await navigasiSidebar(page, 'Katalog', 'Produk')
  await page.getByRole('link', { name: 'Tambah Produk' }).click()
  await expect(
    page.getByRole('heading', { name: 'Tambah Produk' }),
  ).toBeVisible()

  // 3 kartu tipe produk adalah <button> — getByText ambigu krn ada juga
  // <option> "Biji Kopi" di select kategori pada bagian form di bawahnya.
  // Anchor ^ krn kartu Grinder deskripsinya "Penggiling biji kopi" jg
  // matched oleh regex /biji kopi/i kalau tanpa anchor.
  await expect(page.getByRole('button', { name: /^biji kopi/i })).toBeVisible()
  await expect(
    page.getByRole('button', { name: /mesin espresso/i }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /^grinder/i })).toBeVisible()
})
