import { defineConfig, devices } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

// Load .env.local so DATABASE_URL is available for db-seed setup
loadEnvConfig(process.cwd());

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
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    // DB seed project (runs after auth setup)
    { name: 'db-seed', testMatch: /db-seed\.setup\.ts/, dependencies: ['setup'] },
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
      dependencies: ['db-seed'],
      testMatch: /(?!public-).*\.spec\.ts/,
      testIgnore: /.*\.setup\.ts/,
    },
    // DB teardown (runs after all test projects)
    {
      name: 'db-teardown',
      testMatch: /db-teardown\.setup\.ts/,
      dependencies: ['authenticated', 'public'],
    },
  ],
});
