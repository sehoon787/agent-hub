import { test, expect } from '@playwright/test'

test.describe('Search', () => {
  test('should show search results for valid query', async ({ page }) => {
    await page.goto('/search?q=security')
    await page.waitForTimeout(500)
    // SearchResults renders result items as links
    const results = page.locator('a[href^="/agents/"]')
    const count = await results.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should show result count text', async ({ page }) => {
    await page.goto('/search?q=security')
    await page.waitForTimeout(500)
    // Shows "X result(s) for" text
    await expect(page.locator('p').filter({ hasText: /\d+ results? for/ })).toBeVisible()
  })

  test('should show no results for nonsense query', async ({ page }) => {
    await page.goto('/search?q=xyznonexistent12345')
    await page.waitForTimeout(500)
    // Shows "No results found" message
    await expect(page.locator('text=No results found')).toBeVisible()
  })

  test('should show prompt when no query', async ({ page }) => {
    await page.goto('/search')
    await expect(page.locator('text=Type to search agents')).toBeVisible()
  })

  test('should search for Gemini agents', async ({ page }) => {
    await page.goto('/search?q=gemini')
    await page.waitForTimeout(500)
    const results = page.locator('a[href^="/agents/"]')
    const count = await results.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should have search input on search page', async ({ page }) => {
    await page.goto('/search?q=debug')
    await expect(page.locator('input[placeholder="Search agents..."]')).toBeVisible()
  })
})
