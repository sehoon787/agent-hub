import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL: 'https://agent-hub-omega.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Setup project for authentication
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    // Public tests (no auth)
    {
      name: 'public',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /public-.*\.spec\.ts/,
    },
    // Authenticated tests
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /(?!public-).*\.spec\.ts/,
      testIgnore: /.*\.setup\.ts/,
    },
  ],
});
