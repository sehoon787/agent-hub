import { test, expect } from '@playwright/test';

// These tests require authentication (storageState set in playwright.config.ts)

test.describe('My Submissions page — authenticated', () => {
  test('loads /my-submissions page when authenticated', async ({ page }) => {
    await page.goto('/my-submissions');
    await expect(page).toHaveURL(/\/my-submissions/);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows submissions list or "No submissions yet" message', async ({ page }) => {
    await page.goto('/my-submissions');
    // Wait for the async fetch to complete
    await page.waitForTimeout(3000);

    // Either shows submission items or the empty state
    const hasSubmissions = await page.locator('.space-y-3 > div').count() > 0;
    const hasEmptyState = await page.locator('text=No submissions yet.').isVisible().catch(() => false);

    expect(hasSubmissions || hasEmptyState).toBeTruthy();
  });

  test('does not show sign-in prompt when authenticated', async ({ page }) => {
    await page.goto('/my-submissions');
    await page.waitForTimeout(2000);

    await expect(page.locator('h2:has-text("Sign in Required")')).not.toBeVisible();
  });
});

test.describe('My Submissions — Edit & Remove buttons', () => {
  test('Edit button navigates to /submit?edit=NUMBER', async ({ page }) => {
    await page.goto('/my-submissions');
    await page.waitForTimeout(3000);

    const editLink = page.locator('a[href^="/submit?edit="]').first();
    const hasSubmissions = await editLink.isVisible().catch(() => false);
    if (!hasSubmissions) {
      test.skip();
      return;
    }

    const href = await editLink.getAttribute('href');
    expect(href).toMatch(/\/submit\?edit=\d+/);

    await editLink.click();
    await expect(page).toHaveURL(/\/submit\?edit=\d+/);
    // Edit form should load with pre-filled data
    await expect(page.locator('input[placeholder*="https://github.com"]')).toBeVisible({ timeout: 10000 });
  });

  test('Edit form pre-fills data from existing submission', async ({ page }) => {
    await page.goto('/my-submissions');
    await page.waitForTimeout(3000);

    const editLink = page.locator('a[href^="/submit?edit="]').first();
    const hasSubmissions = await editLink.isVisible().catch(() => false);
    if (!hasSubmissions) {
      test.skip();
      return;
    }

    await editLink.click();
    await expect(page).toHaveURL(/\/submit\?edit=\d+/);

    // Wait for form to load existing data
    await page.waitForTimeout(3000);

    // At least display name should be filled (not the placeholder)
    const displayNameInput = page.locator('input[placeholder="e.g. My Agent"]');
    await expect(displayNameInput).toBeVisible({ timeout: 10000 });
    const value = await displayNameInput.inputValue();
    // If editing, value should not be empty
    expect(value.length).toBeGreaterThan(0);
  });

  test('Remove button exists for all submission statuses', async ({ page }) => {
    await page.goto('/my-submissions');
    await page.waitForTimeout(3000);

    const submissions = page.locator('.space-y-3 > div');
    const count = await submissions.count();
    if (count === 0) {
      test.skip();
      return;
    }

    // Every submission should have a Remove button
    for (let i = 0; i < Math.min(count, 3); i++) {
      const removeButton = submissions.nth(i).locator('button:has-text("Remove")');
      await expect(removeButton).toBeVisible();
    }
  });

  test('Remove button shows confirmation dialog (cancel does not remove)', async ({ page }) => {
    await page.goto('/my-submissions');
    await page.waitForTimeout(3000);

    const removeButton = page.locator('button:has-text("Remove")').first();
    const hasSubmissions = await removeButton.isVisible().catch(() => false);
    if (!hasSubmissions) {
      test.skip();
      return;
    }

    // Count before
    const countBefore = await page.locator('.space-y-3 > div').count();

    // Set up dialog handler to dismiss (cancel)
    page.on('dialog', (dialog) => dialog.dismiss());
    await removeButton.click();

    // Wait a moment, then verify nothing was removed
    await page.waitForTimeout(1000);
    const countAfter = await page.locator('.space-y-3 > div').count();
    expect(countAfter).toBe(countBefore);
  });
});

test.describe('Profile dropdown — authenticated', () => {
  test('shows "My Submissions" link in user dropdown', async ({ page }) => {
    await page.goto('/');

    // Click user menu avatar
    const userMenu = page.locator('button[aria-label="User menu"]').first();
    await expect(userMenu).toBeVisible({ timeout: 10000 });
    await userMenu.click();

    // Dropdown should show My Submissions link
    const mySubmissionsLink = page.locator('a[href="/my-submissions"]:has-text("My Submissions")');
    await expect(mySubmissionsLink).toBeVisible({ timeout: 5000 });
  });

  test('"My Submissions" dropdown link navigates correctly', async ({ page }) => {
    await page.goto('/');

    const userMenu = page.locator('button[aria-label="User menu"]').first();
    await expect(userMenu).toBeVisible({ timeout: 10000 });
    await userMenu.click();

    await page.locator('a[href="/my-submissions"]:has-text("My Submissions")').click();
    await expect(page).toHaveURL(/\/my-submissions/);
  });
});
