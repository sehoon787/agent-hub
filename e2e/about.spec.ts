import { test, expect } from '@playwright/test'

test.describe('About Page', () => {
  test('should load about page', async ({ page }) => {
    await page.goto('/about')
    await expect(page).toHaveTitle(/About|AgentHub/)
  })

  test('should show main heading', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('h1:has-text("About AgentHub")')).toBeVisible()
  })

  test('should mention supported platforms', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('h3.font-semibold:has-text("Claude Code")')).toBeVisible()
    await expect(page.locator('h3.font-semibold:has-text("Gemini CLI")')).toBeVisible()
    await expect(page.locator('h3.font-semibold:has-text("Codex CLI")')).toBeVisible()
  })

  test('should describe agent categories', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('h3:has-text("Orchestrators")')).toBeVisible()
    await expect(page.locator('h3:has-text("Specialists")')).toBeVisible()
    await expect(page.locator('h3:has-text("Workers")')).toBeVisible()
    await expect(page.locator('h3:has-text("Analysts")')).toBeVisible()
  })

  test('should mention SKILL.md standard', async ({ page }) => {
    await page.goto('/about')
    // SKILL.md text appears in the cross-platform section
    await expect(page.locator('h3:has-text("SKILL.md")')).toBeVisible()
  })

  test('should show model tiers', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('text=Model Tiers')).toBeVisible()
    await expect(page.locator('text=Gemini 2.5 Pro')).toBeVisible()
    await expect(page.getByText('GPT-5.4', { exact: true })).toBeVisible()
  })

  test('should show How Auto-Collection Works section', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('text=How Auto-Collection Works')).toBeVisible()
    await expect(page.locator('h3:has-text("1. Discover")')).toBeVisible()
    await expect(page.locator('h3:has-text("2. Parse")')).toBeVisible()
    await expect(page.locator('h3:has-text("3. Merge")')).toBeVisible()
  })

  test('should show tech stack', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('text=Tech Stack')).toBeVisible()
    await expect(page.locator('text=Next.js 15')).toBeVisible()
    await expect(page.locator('text=TypeScript')).toBeVisible()
  })

  test('should have reference links', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('text=References')).toBeVisible()
    // Reference links use specific URLs
    await expect(page.locator('main a[href="https://github.com/anthropics/claude-code"]')).toBeVisible()
    await expect(page.locator('main a[href="https://github.com/google-gemini/gemini-cli"]')).toBeVisible()
    await expect(page.locator('main a[href="https://github.com/openai/codex"]')).toBeVisible()
  })
})
