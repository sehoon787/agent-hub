import { test, expect } from '@playwright/test'

test.describe('Agents Browse Page', () => {
  test('should load agents page with title', async ({ page }) => {
    await page.goto('/agents')
    await expect(page).toHaveTitle(/Browse Agents|AgentHub/)
  })

  test('should display page heading', async ({ page }) => {
    await page.goto('/agents')
    await expect(page.locator('h1:has-text("Agents")')).toBeVisible()
  })

  test('should display agent cards', async ({ page }) => {
    await page.goto('/agents')
    // Agent cards are <a> links to /agents/<slug>
    const cards = page.locator('a[href^="/agents/"]')
    await expect(cards.first()).toBeVisible({ timeout: 10000 })
    const count = await cards.count()
    // Should show at least 6 agents (default page=12, but nav links also match)
    expect(count).toBeGreaterThan(5)
  })

  test('should have search input', async ({ page }) => {
    await page.goto('/agents')
    const searchInput = page.locator('input[placeholder="Search agents..."]')
    await expect(searchInput.first()).toBeVisible()
  })

  test('should filter agents by search query', async ({ page }) => {
    await page.goto('/agents')
    const searchInput = page.locator('input[placeholder="Search agents..."]')
    await searchInput.first().fill('security')
    // Wait for debounce (400ms)
    await page.waitForTimeout(600)
    // "Showing X of Y agents" text should update
    await expect(page.locator('text=Showing')).toBeVisible()
    // Should still have results
    const cards = page.locator('main a[href^="/agents/"]')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should have category filter with correct labels', async ({ page }) => {
    await page.goto('/agents')
    // Filter sidebar (desktop, visible on lg+) has Category section
    // The filter buttons have labels: Orchestrator, Specialist, Worker, Analyst
    await expect(page.locator('aside button:has-text("Orchestrator")')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('aside button:has-text("Specialist")')).toBeVisible()
    await expect(page.locator('aside button:has-text("Worker")')).toBeVisible()
    await expect(page.locator('aside button:has-text("Analyst")')).toBeVisible()
  })

  test('should have platform filter with correct labels', async ({ page }) => {
    await page.goto('/agents')
    await expect(page.locator('aside button:has-text("Claude")')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('aside button', { hasText: /^Gemini$/ })).toBeVisible()
    await expect(page.locator('aside button:has-text("Codex")')).toBeVisible()
    await expect(page.locator('aside button:has-text("Universal")')).toBeVisible()
  })

  test('should have model filter with correct labels', async ({ page }) => {
    await page.goto('/agents')
    await expect(page.locator('aside button:has-text("Sonnet (Coding)")')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('aside button:has-text("Opus (Deep Reasoning)")')).toBeVisible()
    await expect(page.locator('aside button:has-text("Gemini 2.5 Pro")')).toBeVisible()
    await expect(page.locator('aside button:has-text("GPT-5.4")')).toBeVisible()
  })

  test('should show platform badges on cards', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForTimeout(500)
    // Agent cards have platform badges using data-slot="badge"
    const platformBadge = page.locator('main [data-slot="badge"]:has-text("claude")')
    await expect(platformBadge.first()).toBeVisible({ timeout: 5000 })
  })

  test('should show "Showing X of Y agents" count', async ({ page }) => {
    await page.goto('/agents')
    const showingText = page.locator('text=Showing')
    await expect(showingText).toBeVisible()
  })

  test('should have pagination when more than 12 agents', async ({ page }) => {
    await page.goto('/agents')
    // With 93 agents and 12 per page, pagination should exist
    // Pagination buttons are <button> elements with page numbers
    const paginationButtons = page.locator('button:has-text("2")')
    await expect(paginationButtons.first()).toBeVisible({ timeout: 5000 })
  })

  test('should have sort dropdown', async ({ page }) => {
    await page.goto('/agents')
    const sortSelect = page.locator('select')
    await expect(sortSelect).toBeVisible()
    // Should contain sort options
    await expect(sortSelect.locator('option:has-text("Most Popular")')).toBeAttached()
    await expect(sortSelect.locator('option:has-text("Recently Added")')).toBeAttached()
    await expect(sortSelect.locator('option:has-text("Name A-Z")')).toBeAttached()
  })

  test('should have stage filter with correct labels', async ({ page }) => {
    await page.goto('/agents')
    await expect(page.locator('aside button:has-text("Discover")')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('aside button:has-text("Plan")')).toBeVisible()
    await expect(page.locator('aside button:has-text("Implement")')).toBeVisible()
    await expect(page.locator('aside button:has-text("Review")')).toBeVisible()
    await expect(page.locator('aside button:has-text("Verify")')).toBeVisible()
    await expect(page.locator('aside button:has-text("Debug")')).toBeVisible()
    await expect(page.locator('aside button:has-text("Operate")')).toBeVisible()
  })

  test('should filter agents when stage is selected', async ({ page }) => {
    await page.goto('/agents')
    const showingText = page.locator('text=Showing')
    await expect(showingText).toBeVisible()
    const initialText = await showingText.textContent()

    // Click a stage filter button
    await page.locator('aside button:has-text("Implement")').click()
    await page.waitForTimeout(300)

    // Result count should change (likely fewer agents)
    const filteredText = await showingText.textContent()
    expect(filteredText).not.toEqual(initialText)
  })

  test('should show stage badges on agent cards', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForTimeout(500)
    // At least some agent cards should have stage badges
    const stageBadges = page.locator('main [data-slot="badge"]')
    const count = await stageBadges.count()
    expect(count).toBeGreaterThan(5)
  })

})
