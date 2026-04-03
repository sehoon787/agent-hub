import { test, expect } from '@playwright/test'

test.describe('Skills Browse Page', () => {
  test('should load skills page with title', async ({ page }) => {
    await page.goto('/skills')
    await expect(page).toHaveTitle(/Browse Skills|AgentHub/)
  })

  test('should display "Browse Skills" heading', async ({ page }) => {
    await page.goto('/skills')
    await expect(page.locator('h1:has-text("Browse Skills")')).toBeVisible()
  })

  test('should display skill cards', async ({ page }) => {
    await page.goto('/skills')
    const cards = page.locator('a[href^="/agents/"]')
    await expect(cards.first()).toBeVisible({ timeout: 10000 })
    const count = await cards.count()
    expect(count).toBeGreaterThan(3)
  })

  test('should have search input with skills placeholder', async ({ page }) => {
    await page.goto('/skills')
    const searchInput = page.locator('input[placeholder="Search skills..."]')
    await expect(searchInput.first()).toBeVisible()
  })

  test('should have Platform filter', async ({ page }) => {
    await page.goto('/skills')
    await expect(page.locator('aside button:has-text("Claude")')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('aside button:has-text("Universal")')).toBeVisible()
  })

  test('should have Stage filter', async ({ page }) => {
    await page.goto('/skills')
    await expect(page.locator('aside button:has-text("Implement")')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('aside button:has-text("Review")')).toBeVisible()
  })

  test('should NOT have Category filter', async ({ page }) => {
    await page.goto('/skills')
    // Wait for page to load (Platform filter should be visible)
    await expect(page.locator('aside button:has-text("Claude")')).toBeVisible({ timeout: 5000 })
    // Category options should NOT exist in the sidebar
    await expect(page.locator('aside button:has-text("Orchestrator")')).not.toBeVisible()
    await expect(page.locator('aside button:has-text("Specialist")')).not.toBeVisible()
  })

  test('should NOT have Model filter', async ({ page }) => {
    await page.goto('/skills')
    // Wait for page to load
    await expect(page.locator('aside button:has-text("Claude")')).toBeVisible({ timeout: 5000 })
    // Model options should NOT exist
    await expect(page.locator('aside button:has-text("Sonnet (Coding)")')).not.toBeVisible()
    await expect(page.locator('aside button:has-text("Opus (Deep Reasoning)")')).not.toBeVisible()
  })

  test('should have Source filter', async ({ page }) => {
    await page.goto('/skills')
    await expect(page.locator('aside button:has-text("Community")')).toBeVisible({ timeout: 5000 })
  })

  test('should filter skills by search query', async ({ page }) => {
    await page.goto('/skills')
    const searchInput = page.locator('input[placeholder="Search skills..."]')
    await searchInput.first().fill('tdd')
    await page.waitForTimeout(600)
    const showingText = page.locator('p.text-zinc-500:has-text(" of ")')
    await expect(showingText).toBeVisible()
    const cards = page.locator('main a[href^="/agents/"]')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should have pagination', async ({ page }) => {
    await page.goto('/skills')
    const paginationButtons = page.locator('button:has-text("2")')
    await expect(paginationButtons.first()).toBeVisible({ timeout: 5000 })
  })
})
