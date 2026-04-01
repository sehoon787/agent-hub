import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('header should have AgentHub logo link', async ({ page }) => {
    await page.goto('/')
    const logoLink = page.locator('header a[href="/"]')
    await expect(logoLink).toBeVisible()
    await expect(logoLink).toContainText('AgentHub')
  })

  test('header should have GitHub link pointing to correct repo', async ({ page }) => {
    await page.goto('/')
    const githubLink = page.locator('a[href="https://github.com/sehoon787/agent-hub"]')
    await expect(githubLink.first()).toBeVisible()
  })

  test('should navigate between all pages', async ({ page }) => {
    // Home
    await page.goto('/')
    await expect(page).toHaveURL(/agent-hub.*\/$|\/$/);

    // Agents
    await page.locator('nav a[href="/agents"]').first().click()
    await expect(page).toHaveURL(/\/agents/)
    await expect(page.locator('h1')).toBeVisible()

    // About
    await page.locator('nav a[href="/about"]').first().click()
    await expect(page).toHaveURL(/\/about/)
    await expect(page.locator('h1')).toBeVisible()

    // Submit (authenticated users stay on /submit)
    await page.locator('nav a[href="/submit"]').first().click()
    await expect(page).toHaveURL(/\/submit/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('footer should be visible and contain links', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
    // Footer has GitHub link
    await expect(footer.locator('a[href="https://github.com/sehoon787/agent-hub"]').first()).toBeVisible()
    // Footer has page links
    await expect(footer.locator('a[href="/agents"]')).toBeVisible()
    await expect(footer.locator('a[href="/submit"]')).toBeVisible()
    await expect(footer.locator('a[href="/about"]')).toBeVisible()
  })

  test('footer should have platform links', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer.locator('a[href="https://github.com/anthropics/claude-code"]')).toBeVisible()
    await expect(footer.locator('a[href="https://github.com/google-gemini/gemini-cli"]')).toBeVisible()
    await expect(footer.locator('a[href="https://github.com/openai/codex"]')).toBeVisible()
  })

  test('footer should show copyright text', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer.locator('text=AgentHub. Open source project.')).toBeVisible()
  })
})
