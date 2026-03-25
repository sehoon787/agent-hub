import { test, expect } from '@playwright/test'

test.describe('Submit Page', () => {
  test('should load submit page', async ({ page }) => {
    await page.goto('/submit')
    await expect(page).toHaveTitle(/Submit|AgentHub/)
  })

  test('should show page heading', async ({ page }) => {
    await page.goto('/submit')
    await expect(page.locator('h1:has-text("Submit an Agent")')).toBeVisible()
  })

  test('should show sign-in prompt when not authenticated', async ({ page }) => {
    await page.goto('/submit')
    // SubmitForm shows a loading state first, then "Sign in Required" when no session
    // Wait for session check to complete (may take a few seconds)
    await expect(
      page.locator('h2:has-text("Sign in Required")')
    ).toBeVisible({ timeout: 15000 })
  })

  test('should have GitHub sign-in button', async ({ page }) => {
    await page.goto('/submit')
    // Wait for session loading to finish
    const githubButton = page.locator('button:has-text("Sign in with GitHub")')
    await expect(githubButton).toBeVisible({ timeout: 15000 })
  })
})
