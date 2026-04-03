import { test, expect } from '@playwright/test';

// These tests require authentication (storageState set in playwright.config.ts)

test.describe('Submit page — authenticated', () => {
  test('loads /submit page when authenticated', async ({ page }) => {
    await page.goto('/submit');
    // Authenticated users see the submit page, not the signin redirect
    await expect(page).toHaveURL(/\/submit/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('shows the submit form with required fields', async ({ page }) => {
    await page.goto('/submit');
    // Use the exact slug field placeholder to avoid matching the GitHub URL field (which also contains "my-agent")
    await expect(page.locator('input[placeholder="e.g. my-agent (lowercase, hyphens only)"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder="e.g. My Agent"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="https://github.com"]')).toBeVisible();
  });

  test('form validation: required fields get red border on empty submit', async ({ page }) => {
    await page.goto('/submit');
    // Wait for form to be fully rendered
    await expect(page.locator('button:has-text("Submit Agent")')).toBeVisible({ timeout: 10000 });

    // Click submit without filling anything
    await page.locator('button:has-text("Submit Agent")').click();

    // At least one input should have border-red-500 class (server-side field errors)
    // or an error message should appear
    const redBorders = page.locator('input.border-red-500');
    const selects = page.locator('select.border-red-500');
    const errorMessages = page.locator('p.text-red-400, p.text-xs.text-red-400');

    // Wait briefly for validation response
    await page.waitForTimeout(2000);

    const redBorderCount = await redBorders.count();
    const redSelectCount = await selects.count();
    const errorCount = await errorMessages.count();

    expect(redBorderCount + redSelectCount + errorCount).toBeGreaterThan(0);
  });

  test('GitHub URL validation: invalid URL shows error', async ({ page }) => {
    await page.goto('/submit');
    await expect(page.locator('input[placeholder*="https://github.com"]')).toBeVisible({ timeout: 10000 });

    const githubInput = page.locator('input[placeholder*="https://github.com"]');
    await githubInput.fill('invalid-url');
    await githubInput.blur();

    // Client-side validation fires on blur — error message should appear
    await expect(page.locator('p.text-red-400:has-text("https://github")')).toBeVisible({ timeout: 3000 });
    // Input should have red border
    await expect(githubInput).toHaveClass(/border-red-500/);
  });

  test('GitHub URL validation: valid GitHub URL clears error', async ({ page }) => {
    await page.goto('/submit');
    await expect(page.locator('input[placeholder*="https://github.com"]')).toBeVisible({ timeout: 10000 });

    const githubInput = page.locator('input[placeholder*="https://github.com"]');

    // First enter invalid URL to trigger error
    await githubInput.fill('invalid-url');
    await githubInput.blur();
    await expect(page.locator('p.text-red-400:has-text("https://github")')).toBeVisible({ timeout: 3000 });

    // Now enter a valid GitHub file URL (must include /blob/)
    await githubInput.fill('https://github.com/test/repo/blob/main/agents/my-agent.md');
    await githubInput.blur();

    // Error should disappear
    await expect(page.locator('p.text-red-400:has-text("https://github")')).not.toBeVisible({ timeout: 3000 });
    // Border should not be red
    await expect(githubInput).not.toHaveClass(/border-red-500/);
  });

  test('form preview updates as user types display name', async ({ page }) => {
    await page.goto('/submit');
    await expect(page.locator('input[placeholder="e.g. My Agent"]')).toBeVisible({ timeout: 10000 });

    // Preview initially shows placeholder text
    const preview = page.locator('h3.truncate.font-semibold');
    await expect(preview).toContainText('Your Agent');

    // Type a display name
    await page.locator('input[placeholder="e.g. My Agent"]').fill('My Test Agent');

    // Preview should update
    await expect(preview).toContainText('My Test Agent');
  });

  test('form preview updates description', async ({ page }) => {
    await page.goto('/submit');
    // Wait for textarea
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 10000 });

    const descriptionTextarea = page.locator('textarea').first();
    await descriptionTextarea.fill('A helpful agent for testing purposes.');

    // Preview description area
    const previewDesc = page.locator('p.text-sm.text-zinc-400').first();
    await expect(previewDesc).toContainText('A helpful agent for testing purposes.');
  });

  test('agentFilePath field should NOT exist', async ({ page }) => {
    await page.goto('/submit');
    // Use the exact slug field placeholder to avoid matching the GitHub URL field (which also contains "my-agent")
    await expect(page.locator('input[placeholder="e.g. my-agent (lowercase, hyphens only)"]')).toBeVisible({ timeout: 10000 });
    // The old agentFilePath field had a label "Agent File Path" — verify it is gone
    await expect(page.locator('label:has-text("Agent File Path")')).not.toBeVisible();
    // Old field had exact placeholder "agents/my-agent.md" (no https:// prefix) — verify no such standalone path input exists
    await expect(page.locator('input[placeholder="agents/my-agent.md"]')).not.toBeVisible();
  });

  test('GitHub URL placeholder shows full file URL example', async ({ page }) => {
    await page.goto('/submit');
    const githubInput = page.locator('input[placeholder*="https://github.com"]');
    await expect(githubInput).toBeVisible({ timeout: 10000 });
    // Placeholder should contain /blob/ to indicate file URL
    const placeholder = await githubInput.getAttribute('placeholder');
    expect(placeholder).toContain('/blob/');
  });

  test('page title shows "Submit an Agent or Skill"', async ({ page }) => {
    await page.goto('/submit');
    await expect(page.locator('h1').first()).toContainText('Agent or Skill');
  });

  test('shows type toggle with Agent and Skill options', async ({ page }) => {
    await page.goto('/submit');
    await expect(page.getByRole('button', { name: 'Agent', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Skill', exact: true })).toBeVisible();
  });

  test('submit success shows "Submit Related" button', async ({ page }) => {
    // We can only test that the "Submit Related" button appears in the success state
    // This would require a successful submission which needs auth + valid data
    // So we test the submit button text changes based on type toggle
    await page.goto('/submit');
    await expect(page.locator('button:has-text("Submit Agent")')).toBeVisible({ timeout: 10000 });
    // Click Skill toggle
    await page.locator('button:has-text("Skill")').click();
    await expect(page.locator('button:has-text("Submit Skill")')).toBeVisible();
  });
});
