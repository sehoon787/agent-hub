import { test, expect } from '@playwright/test'

test.describe('Sign In Page', () => {
  test('should load signin page', async ({ page }) => {
    await page.goto('/signin')
    await expect(page.locator('h1:has-text("Sign in to AgentHub")')).toBeVisible()
  })

  test('should have GitHub OAuth button', async ({ page }) => {
    await page.goto('/signin')
    const githubButton = page.locator('button:has-text("Continue with GitHub")')
    await expect(githubButton).toBeVisible()
  })

  test('should show descriptive text', async ({ page }) => {
    await page.goto('/signin')
    await expect(page.locator('text=Sign in with your GitHub account')).toBeVisible()
  })
})
