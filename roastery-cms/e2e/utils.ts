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
