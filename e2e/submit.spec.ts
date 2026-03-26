import { test, expect } from '@playwright/test'

test.describe('Submit Page', () => {
  test('should redirect unauthenticated users to signin', async ({ page }) => {
    await page.goto('/submit')
    // Middleware redirects unauthenticated users to /signin
    await expect(page).toHaveURL(/\/signin/)
  })

  test('should show signin page heading after redirect', async ({ page }) => {
    await page.goto('/submit')
    await expect(page.locator('h1:has-text("Sign in to AgentHub")')).toBeVisible()
  })

  test('should show GitHub sign-in button after redirect', async ({ page }) => {
    await page.goto('/submit')
    const githubButton = page.locator('button:has-text("Continue with GitHub")')
    await expect(githubButton).toBeVisible({ timeout: 10000 })
  })
})
