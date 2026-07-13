import { expect, test } from '@playwright/test'
import { buka, kumpulkanErrorConsole, navigasiSidebar } from './utils'
import { daftarUser, hapusUserTest, jadikanStaff } from './helpers/backend'

/**
 * E2E harga & promo (step 06) — BUTUH backend nyala di :3000.
 * Sub-menu: Harga, Tier Grosir, Kode Promo.
 * Bagian dari test ini memverifikasi dialog dan interaksi dasar.
 */
test.describe.configure({ mode: 'serial' })

const runId = Date.now()
const email = `e2e-pricing-${runId}@example.com`
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

test('sidebar Harga & Promo punya sub-menu dan halaman Harga termuat', async ({
  page,
}) => {
  const errors = kumpulkanErrorConsole(page)
  await login(page)

  await navigasiSidebar(page, 'Harga & Promo', 'Harga')
  await expect(
    page.getByRole('heading', { name: 'Harga Retail' }),
  ).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)
})

test('halaman Harga: dialog set harga bisa dibuka (via tombol Set Harga saat empty)', async ({
  page,
}) => {
  await login(page)

  await navigasiSidebar(page, 'Harga & Promo', 'Harga')
  await expect(
    page.getByRole('heading', { name: 'Harga Retail' }),
  ).toBeVisible()

  // tombol Set Harga atau kolom aksi Edit — salah satu akan terlihat
  const btnSet = page.getByRole('button', { name: 'Set Harga' })
  const btnEdit = page.getByRole('button', { name: 'Edit' }).first()

  if (await btnSet.isVisible().catch(() => false)) {
    await btnSet.click()
  } else if (await btnEdit.isVisible().catch(() => false)) {
    await btnEdit.click()
  }
  await expect(page.getByRole('dialog')).toBeVisible()
  // "Harga Retail" ambigu (muncul di heading halaman, label field, DAN
  // deskripsi dialog) — scope ke dalam dialog & pakai getByLabel field-nya
  await expect(
    page.getByRole('dialog').getByLabel('Harga Retail'),
  ).toBeVisible()

  // dialog tambah/edit (bukan ConfirmDialog) tidak punya tombol "Batal",
  // cuma ikon X close bawaan shadcn Dialog (aria: "Close")
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('InputRupiah memformat angka saat diketik', async ({ page }) => {
  await login(page)

  await navigasiSidebar(page, 'Harga & Promo', 'Harga')
  await expect(
    page.getByRole('heading', { name: 'Harga Retail' }),
  ).toBeVisible()

  // buka dialog
  const btnSet = page.getByRole('button', { name: 'Set Harga' })
  if (await btnSet.isVisible().catch(() => false)) {
    await btnSet.click()
  } else {
    await page.getByRole('button', { name: 'Edit' }).first().click()
  }
  await expect(page.getByRole('dialog')).toBeVisible()

  // input dengan prefix Rp (inputmode numeric, format id-ID)
  const input = page.locator('[inputmode="numeric"]')
  await input.fill('150000')
  await expect(input).toHaveValue('150.000')
})

test('halaman Tier Grosir termuat dan dialog tambah bisa dibuka/tutup', async ({
  page,
}) => {
  const errors = kumpulkanErrorConsole(page)
  await login(page)

  await navigasiSidebar(page, 'Harga & Promo', 'Tier Grosir')
  await expect(page.getByRole('heading', { name: 'Tier Grosir' })).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)

  // dialog tambah tier — dev DB bisa kosong, saat itu tombol "Tambah Tier"
  // muncul 2x (PageHeader aksi + EmptyState aksi), pakai .first()
  await page
    .getByRole('button', { name: /tambah tier/i })
    .first()
    .click()
  await expect(page.getByText('Nama Tier')).toBeVisible()
  await expect(page.getByText('Diskon (%)')).toBeVisible()

  // dialog tambah/edit (bukan ConfirmDialog) tidak punya tombol "Batal",
  // cuma ikon X close bawaan shadcn Dialog (aria: "Close")
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('halaman Kode Promo termuat dan dialog tambah bisa dibuka/tutup', async ({
  page,
}) => {
  const errors = kumpulkanErrorConsole(page)
  await login(page)

  await navigasiSidebar(page, 'Harga & Promo', 'Kode Promo')
  await expect(page.getByRole('heading', { name: 'Kode Promo' })).toBeVisible()
  expect(errors, `Console error:\n${errors.join('\n')}`).toHaveLength(0)

  // dialog tambah promo — getByLabel (bukan getByText) krn tabel Kode
  // Promo JUGA punya kolom header "Kode"/"Tipe", getByText jadi ambigu
  // dev DB bisa kosong, saat itu tombol "Tambah Promo" muncul 2x
  // (PageHeader aksi + EmptyState aksi), pakai .first()
  await page
    .getByRole('button', { name: /tambah promo/i })
    .first()
    .click()
  await expect(page.getByLabel('Kode')).toBeVisible()
  await expect(page.getByLabel('Tipe')).toBeVisible()

  // isi kode promo (auto UPPERCASE)
  const inputKode = page.getByLabel('Kode')
  await inputKode.fill('promo10')
  await expect(inputKode).toHaveValue('PROMO10')

  // dialog tambah/edit (bukan ConfirmDialog) tidak punya tombol "Batal",
  // cuma ikon X close bawaan shadcn Dialog (aria: "Close")
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
})
