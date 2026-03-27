import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load and display hero section', async ({ page }) => {
    await page.goto('/')
    // Hero section has h1 with "AgentHub" inside a span with gradient
    const heroH1 = page.locator('section h1')
    await expect(heroH1.first()).toContainText('AgentHub')
    // Hero subtitle mentions "Discover"
    await expect(page.locator('text=Discover').first()).toBeVisible()
  })

  test('should display stats section with agent counts', async ({ page }) => {
    await page.goto('/')
    // StatsSection renders StatCards with labels: Total Agents, Categories, Contributors, Verified Agents
    await expect(page.locator('text=Total Agents')).toBeVisible()
    await expect(page.locator('text=Categories')).toBeVisible()
    await expect(page.locator('text=Contributors')).toBeVisible()
    await expect(page.locator('p:has-text("Platforms")')).toBeVisible()
  })

  test('should display featured agents section', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Featured Agents')).toBeVisible()
    // Featured section has agent cards (links to /agents/<slug>)
    const featuredCards = page.locator('main a[href^="/agents/"]')
    const count = await featuredCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should display recently added section', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Recently Added')).toBeVisible()
  })

  test('should display top agents ranking section', async ({ page }) => {
    await page.goto('/')
    // Supports both old (RankingSection) and new (CompactRanking) layouts
    const ranking = page.locator('text=Top by Stars').or(page.locator('text=Top Agents by Stars'))
    await expect(ranking.first()).toBeVisible()
    const rankingRows = page.locator('table tbody tr')
    const count = await rankingRows.count()
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThanOrEqual(10)
  })

  test('should have platform filter tabs in compact ranking', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('button:has-text("All")')).toBeVisible()
    await expect(page.locator('button:has-text("claude")')).toBeVisible()
  })

  test('should display 2-column ranking and recent agents layout', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Top by Stars')).toBeVisible()
    const recentCards = page.locator('section .grid h3:has-text("Recently Added")')
    await expect(recentCards.first()).toBeVisible()
  })

  test('should display category section', async ({ page }) => {
    await page.goto('/')
    // CategoriesSection heading and category labels (plural form: Orchestrators, Specialists, Workers, Analysts)
    await expect(page.locator('text=Browse by Category')).toBeVisible()
    await expect(page.locator('h3:has-text("Orchestrators")')).toBeVisible()
    await expect(page.locator('h3:has-text("Specialists")')).toBeVisible()
    await expect(page.locator('h3:has-text("Workers")')).toBeVisible()
    await expect(page.locator('h3:has-text("Analysts")')).toBeVisible()
  })

  test('should have working navigation links in header', async ({ page }) => {
    await page.goto('/')
    // Desktop nav links in header
    await expect(page.locator('header nav a[href="/agents"]')).toBeVisible()
    await expect(page.locator('header nav a[href="/submit"]')).toBeVisible()
    await expect(page.locator('header nav a[href="/about"]')).toBeVisible()
  })

  test('should have search input on hero', async ({ page }) => {
    await page.goto('/')
    const searchInput = page.locator('input[placeholder="Search agents..."]')
    await expect(searchInput.first()).toBeVisible()
  })

  test('should have Browse Agents and Submit Yours buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('a:has-text("Browse Agents")')).toBeVisible()
    await expect(page.locator('a:has-text("Submit Yours")')).toBeVisible()
  })
})
