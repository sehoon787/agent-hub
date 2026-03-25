import { test, expect } from '@playwright/test'

test.describe('Agent Detail Page', () => {
  test('should load boss agent detail page', async ({ page }) => {
    await page.goto('/agents/boss')
    await expect(page.locator('h1')).toContainText('Boss')
  })

  test('should display agent description', async ({ page }) => {
    await page.goto('/agents/boss')
    // Boss description includes "orchestrator"
    await expect(page.locator('text=orchestrator').first()).toBeVisible()
  })

  test('should show breadcrumb navigation', async ({ page }) => {
    await page.goto('/agents/boss')
    // Breadcrumb nav is a <nav> inside main (not header nav)
    // It has a link to /agents with text "Agents" and current agent name
    const breadcrumbNav = page.locator('main nav')
    await expect(breadcrumbNav.locator('a[href="/agents"]')).toBeVisible()
    await expect(breadcrumbNav.locator('text=Boss')).toBeVisible()
  })

  test('should have install command with copy button', async ({ page }) => {
    await page.goto('/agents/boss')
    // Install section with code and copy button (aria-label="Copy command")
    await expect(page.locator('button[aria-label="Copy command"]').first()).toBeVisible()
    // Install command code element
    await expect(page.locator('code').first()).toBeVisible()
  })

  test('should show model badge (opus)', async ({ page }) => {
    await page.goto('/agents/boss')
    // Model badge is a Badge component with data-slot="badge" containing "opus"
    const badge = page.locator('[data-slot="badge"]:has-text("opus")')
    await expect(badge.first()).toBeVisible()
  })

  test('should show platform badge (claude)', async ({ page }) => {
    await page.goto('/agents/boss')
    // Platform badge is a Badge component with data-slot="badge" containing "claude"
    const badge = page.locator('[data-slot="badge"]:has-text("claude")')
    await expect(badge.first()).toBeVisible()
  })

  test('should show verified badge for verified agents', async ({ page }) => {
    await page.goto('/agents/boss')
    // BadgeCheck SVG with aria-label="Verified"
    await expect(page.locator('[aria-label="Verified"]').first()).toBeVisible()
  })

  test('should show capabilities section', async ({ page }) => {
    await page.goto('/agents/boss')
    await expect(page.locator('h2:has-text("Capabilities")')).toBeVisible()
  })

  test('should show tools section', async ({ page }) => {
    await page.goto('/agents/boss')
    await expect(page.locator('h2:has-text("Tools")')).toBeVisible()
  })

  test('should have tabs for Overview and Configuration', async ({ page }) => {
    await page.goto('/agents/boss')
    await expect(page.locator('button:has-text("Overview")')).toBeVisible()
    await expect(page.locator('button:has-text("Configuration")')).toBeVisible()
  })

  test('should show related agents', async ({ page }) => {
    await page.goto('/agents/boss')
    // RelatedAgents component should render related agents
    await expect(page.locator('text=Related').first()).toBeVisible({ timeout: 5000 })
  })

  test('should navigate from browse to detail', async ({ page }) => {
    await page.goto('/agents')
    // Click on the first agent card link in main content area
    const firstCardLink = page.locator('main a[href^="/agents/"]').first()
    await firstCardLink.click()
    // Should be on a detail page
    await expect(page).toHaveURL(/\/agents\/[a-z0-9-]+/)
    // h1 should be visible
    await expect(page.locator('h1')).toBeVisible()
  })

  test('should load Gemini agent (codebase-investigator)', async ({ page }) => {
    await page.goto('/agents/codebase-investigator')
    await expect(page.locator('h1')).toBeVisible()
    // Platform badge for gemini
    const badge = page.locator('[data-slot="badge"]:has-text("gemini")')
    await expect(badge.first()).toBeVisible()
  })

  test('should load Codex agent (codex-worker)', async ({ page }) => {
    await page.goto('/agents/codex-worker')
    await expect(page.locator('h1')).toBeVisible()
    // Platform badge for codex
    const badge = page.locator('[data-slot="badge"]:has-text("codex")')
    await expect(badge.first()).toBeVisible()
  })

  test('should show View Source link for agents with githubUrl', async ({ page }) => {
    await page.goto('/agents/boss')
    await expect(page.locator('a:has-text("View Source")')).toBeVisible()
  })

  test('should show description and long description in overview tab', async ({ page }) => {
    await page.goto('/agents/boss')
    await expect(page.locator('h2:has-text("Description")')).toBeVisible()
    // Long description text should be visible
    await expect(page.locator('text=meta-orchestrator').first()).toBeVisible()
  })
})
