import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads with AgentHub title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/AgentHub/);
  });

  test('shows hero section with AgentHub heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toContainText('AgentHub');
  });

  test('has Browse Agents and Submit Yours CTA buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a:has-text("Browse Agents")')).toBeVisible();
    await expect(page.locator('a:has-text("Submit Yours")')).toBeVisible();
  });

  test('has header navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header nav a[href="/agents"]')).toBeVisible();
    await expect(page.locator('header nav a[href="/submit"]')).toBeVisible();
    await expect(page.locator('header nav a[href="/about"]')).toBeVisible();
  });
});

test.describe('Agents page', () => {
  test('loads and shows agent cards', async ({ page }) => {
    await page.goto('/agents');
    await expect(page).toHaveTitle(/Browse Agents|AgentHub/);
    // Agent cards are links to /agents/<slug>
    const cards = page.locator('main a[href^="/agents/"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    expect(await cards.count()).toBeGreaterThan(5);
  });

  test('has a search bar', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.locator('input[placeholder="Search agents..."]').first()).toBeVisible();
  });

  test('clicking an agent card navigates to detail page', async ({ page }) => {
    await page.goto('/agents');
    const firstCard = page.locator('main a[href^="/agents/"]').first();
    await firstCard.click();
    await expect(page).toHaveURL(/\/agents\/[a-z0-9-]+/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('search filters agents', async ({ page }) => {
    await page.goto('/agents');
    const searchInput = page.locator('input[placeholder="Search agents..."]').first();
    await searchInput.fill('security');
    // Wait for debounce
    await page.waitForTimeout(600);
    await expect(page.locator('text=Showing')).toBeVisible();
    const cards = page.locator('main a[href^="/agents/"]');
    expect(await cards.count()).toBeGreaterThan(0);
  });
});

test.describe('About page', () => {
  test('loads and shows About AgentHub heading', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('h1:has-text("About AgentHub")')).toBeVisible();
  });
});
