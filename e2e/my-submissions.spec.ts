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
