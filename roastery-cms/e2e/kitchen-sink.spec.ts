import { expect, test } from '@playwright/test'
import { buka, kumpulkanErrorConsole } from './utils'

/**
 * E2E fondasi UI (step 01) — tidak butuh backend.
 * Meng-cover checklist verifikasi todo step 01: toast, ConfirmDialog loading,
 * toggle tema + persist, StatusBadge, dan console bersih (regresi hydration).
 */

test('halaman kitchen sink termuat tanpa error console (incl. hydration)', async ({
  page,
}) => {
  const errors = kumpulkanErrorConsole(page)
  await buka(page, '/dev/kitchen-sink')
  await expect(
    page.getByRole('heading', { name: /Kitchen Sink/ }),
  ).toBeVisible()
  expect(
    errors,
    `Console error terdeteksi:\n${errors.join('\n')}`,
  ).toHaveLength(0)
})

test('tema: default dark, toggle ke light, persist setelah reload', async ({
  page,
}) => {
  await buka(page, '/dev/kitchen-sink')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.getByRole('button', { name: 'Ganti ke mode terang' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await page.evaluate(() => localStorage.getItem('tema'))).toBe('light')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  // light mode wajib pakai emas tua #A97B1C utk primer (aturan kontras design system)
  const warnaPrimer = await page
    .getByRole('button', { name: 'Primer', exact: true })
    .evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(warnaPrimer).toBe('rgb(169, 123, 28)')
})

test('toast error validasi menampilkan pesan backend per baris', async ({
  page,
}) => {
  await buka(page, '/dev/kitchen-sink')
  await page
    .getByRole('button', { name: 'Toast error validasi (array)' })
    .click()
  const toast = page.locator('[data-sonner-toast]')
  await expect(toast).toContainText('nama tidak boleh kosong')
  await expect(toast).toContainText('harga minimal 1000')
})

test('toast sukses muncul', async ({ page }) => {
  await buka(page, '/dev/kitchen-sink')
  await page.getByRole('button', { name: 'Toast sukses' }).click()
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]'),
  ).toContainText('Perubahan disimpan')
})

test('LoadingButton: disabled + teks pending saat submit, lalu toast sukses', async ({
  page,
}) => {
  await buka(page, '/dev/kitchen-sink')
  await page.getByRole('button', { name: /Simulasi submit/ }).click()
  await expect(page.getByRole('button', { name: 'Menyimpan…' })).toBeDisabled()
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]'),
  ).toContainText('Produk berhasil disimpan')
  await expect(
    page.getByRole('button', { name: /Simulasi submit/ }),
  ).toBeEnabled()
})

test('ConfirmDialog: konfirmasi mengunci tombol + loading, sukses menutup dialog', async ({
  page,
}) => {
  await buka(page, '/dev/kitchen-sink')
  await page.getByRole('button', { name: 'Hapus brand "Rocket"' }).click()

  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('Hapus brand "Rocket"?')
  await dialog.getByRole('button', { name: 'Hapus', exact: true }).click()

  await expect(
    dialog.getByRole('button', { name: 'Menghapus…' }),
  ).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Batal' })).toBeDisabled()

  await expect(dialog).not.toBeVisible()
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]'),
  ).toContainText('Brand "Rocket" dihapus')
})

test('StatusBadge menampilkan label Indonesia utk enum backend', async ({
  page,
}) => {
  await buka(page, '/dev/kitchen-sink')
  for (const label of [
    'Jatuh tempo',
    'Ditangguhkan',
    'Belum di-assign',
    'Siap diambil',
  ]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible()
  }
})

test('EmptyState & ErrorState tampil dengan CTA', async ({ page }) => {
  await buka(page, '/dev/kitchen-sink')
  await expect(page.getByText('Belum ada produk')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Tambah Produk' }),
  ).toBeVisible()
  await expect(page.getByText('Gagal memuat data')).toBeVisible()
  await page.getByRole('button', { name: 'Coba lagi' }).click()
  await expect(page.locator('[data-sonner-toast]')).toContainText(
    'Refetch dipanggil',
  )
})
