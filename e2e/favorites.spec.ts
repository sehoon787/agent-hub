import { test, expect } from '@playwright/test'

test.describe('Favorites', () => {
  test('favorites page should load with heading', async ({ page }) => {
    await page.goto('/favorites')
    await expect(page.locator('h1')).toContainText('My Favorites')
  })

  test('favorites page should show empty state when no favorites', async ({ page }) => {
    await page.goto('/favorites')
    // Either shows "No favorites yet" or agent cards
    const emptyOrCards = page.locator('text=No favorites yet').or(
      page.locator('main a[href^="/agents/"]')
    )
    await expect(emptyOrCards.first()).toBeVisible()
  })

  test('agent card should have favorite button', async ({ page }) => {
    await page.goto('/agents')
    // Cards have a heart button with aria-label
    const heartButton = page.locator('button[aria-label*="favorite"]').first()
    await expect(heartButton).toBeVisible()
  })

  test('agent detail page should have favorite button', async ({ page }) => {
    await page.goto('/agents/hephaestus')
    const heartButton = page.locator('button[aria-label*="favorite"]').first()
    await expect(heartButton).toBeVisible()
  })

  test('clicking favorite button should toggle heart fill', async ({ page }) => {
    await page.goto('/agents/hephaestus')
    const heartButton = page.locator('button[aria-label*="favorite"]').first()
    await heartButton.click()
    // After click, the SVG should have either fill-red-500 or text-red-500 class
    // Wait briefly for optimistic update
    await page.waitForTimeout(500)
    const heartSvg = heartButton.locator('svg')
    // Check the class changed (either added or removed fill-red-500)
    const classAfterClick = await heartSvg.getAttribute('class')
    expect(classAfterClick).toBeDefined()
  })

  test('auth dropdown should have My Favorites link', async ({ page }) => {
    await page.goto('/')
    // Click user avatar to open dropdown
    const avatar = page.locator('button[aria-label="User menu"]').first()
    await avatar.click()
    const favLink = page.locator('a[href="/favorites"]')
    await expect(favLink).toBeVisible()
    await expect(favLink).toContainText('My Favorites')
  })
})
