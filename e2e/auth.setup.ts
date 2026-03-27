import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/');

  // Check if already logged in by looking for the user menu button (avatar)
  // Use .first() — desktop + mobile both render AuthButton
  const userMenu = page.locator('button[aria-label="User menu"]').first();
  const isLoggedIn = await userMenu.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isLoggedIn) {
    // Not logged in — pause so the user can manually complete GitHub OAuth
    console.log('\n⚠  Not logged in. Browser will pause for manual GitHub login.');
    console.log('   1. Click "Sign in" in the header');
    console.log('   2. Complete GitHub OAuth');
    console.log('   3. Return to the browser and click "Resume" in the Playwright inspector\n');
    await page.pause();

    // Verify login succeeded after resume
    await expect(userMenu).toBeVisible({ timeout: 30000 });
  }

  // Save auth state to disk
  await page.context().storageState({ path: authFile });
});
