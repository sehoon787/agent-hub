import { test, expect } from '@playwright/test'

test.describe('Responsive Design', () => {
  test('should display correctly on mobile (375x812)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()
    // Header should be visible
    await expect(page.locator('header')).toBeVisible()
    // Footer should be visible (scroll down)
    await expect(page.locator('footer')).toBeVisible()
  })

  test('should show mobile menu button on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    // Mobile nav trigger uses SheetTrigger with aria-label="Menu"
    const menuButton = page.locator('[aria-label="Menu"]')
    await expect(menuButton).toBeVisible({ timeout: 5000 })
  })

  test('should display correctly on tablet (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/agents')
    await expect(page.locator('h1')).toBeVisible()
    // Agent cards should be visible
    const cards = page.locator('main a[href^="/agents/"]')
    await expect(cards.first()).toBeVisible({ timeout: 10000 })
  })

  test('should display correctly on desktop (1920x1080)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/agents')
    await expect(page.locator('h1')).toBeVisible()
    // Filter sidebar should be visible on desktop (the visible wrapper)
    await expect(page.locator('aside').first()).toBeVisible()
    // Agent cards should be visible
    const cards = page.locator('main a[href^="/agents/"]')
    await expect(cards.first()).toBeVisible({ timeout: 10000 })
  })

  test('agents page mobile filter button visible on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/agents')
    await page.waitForTimeout(500)
    // On mobile, the filter icon button (SlidersHorizontal) should be visible
    // It's a SheetTrigger with lg:hidden class
    const filterButton = page.locator('button.lg\\:hidden')
    await expect(filterButton.first()).toBeVisible()
  })
})
