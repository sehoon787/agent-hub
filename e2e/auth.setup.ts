import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Reuse existing auth state if available
  if (fs.existsSync(authFile)) {
    console.log('✓ Reusing existing auth state from', authFile);
    return;
  }

  await page.goto('/');

  const userMenu = page.locator('button[aria-label="User menu"]').first();
  const isLoggedIn = await userMenu.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isLoggedIn) {
    console.log('\n⚠  Not logged in. Browser will pause for manual GitHub login.');
    console.log('   1. Click "Sign in" in the header');
    console.log('   2. Complete GitHub OAuth');
    console.log('   3. Return to the browser and click "Resume" in the Playwright inspector\n');
    await page.pause();
    await expect(userMenu).toBeVisible({ timeout: 30000 });
  }

  await page.context().storageState({ path: authFile });
});
