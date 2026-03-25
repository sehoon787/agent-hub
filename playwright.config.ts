import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --port 3100',
    port: 3100,
    reuseExistingServer: true,
    timeout: 60000,
  },
})
