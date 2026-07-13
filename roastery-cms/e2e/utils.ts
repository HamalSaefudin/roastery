import type { ConsoleMessage, Page } from '@playwright/test'

/**
 * Buka halaman + tunggu React selesai hydrate (html[data-hydrated] di-set
 * oleh __root.tsx). Tanpa ini, klik bisa mendarat di tombol SSR yang
 * handler-nya belum terpasang → interaksi diam-diam tidak terjadi.
 */
export async function buka(page: Page, path: string) {
  await page.goto(path)
  await page.waitForSelector('html[data-hydrated="true"]', {
    state: 'attached',
  })
}

/** Kumpulkan console error + pageerror utk assert console bersih. */
export function kumpulkanErrorConsole(page: Page): Array<string> {
  const errors: Array<string> = []
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))
  return errors
}

/**
 * Navigasi lewat sidebar ke sub-menu di dalam grup yang bisa di-collapse
 * (Katalog/Stok/Harga & Promo/Pengiriman/Service Desk — lihat
 * app-sidebar.tsx MENU). Grup TIDAK otomatis terbuka saat pindah halaman
 * (state `open` di-derive dari route aktif SEKALI saat mount), dan child
 * link-nya ke-unmount total dari DOM saat tertutup (bukan cuma CSS
 * hidden) — jadi WAJIB klik parent (button, bukan link!) dulu sebelum
 * child link-nya bisa ditemukan/diklik.
 */
export async function navigasiSidebar(page: Page, grup: string, child: string) {
  // exact: true — tanpa ini, getByRole match substring case-insensitive,
  // jadi tombol grup "Stok" ikut ke-match kartu dashboard "Stok Menipis"
  // (juga role=button, karena DashboardCard interaktif)
  await page.getByRole('button', { name: grup, exact: true }).click()
  await page.getByRole('link', { name: child, exact: true }).click()
}
