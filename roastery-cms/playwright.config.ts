import { defineConfig, devices } from '@playwright/test'

/**
 * E2E test CMS (konvensi cms §1) — dev server di-start otomatis.
 * Spec yang butuh API backend mengasumsikan backend nyala di :3000
 * (`pnpm --dir ../roastery-service start:dev`) — lihat catatan per spec.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
