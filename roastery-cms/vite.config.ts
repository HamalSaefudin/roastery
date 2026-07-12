/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  test: {
    // e2e/ = Playwright (pnpm test:e2e), bukan vitest
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})

export default config
