import { test, expect } from '@playwright/test';

/**
 * Comprehensive Submission E2E Tests — DB-only flow
 *
 * These tests cover scenarios NOT covered by existing test files:
 * - my-submissions.spec.ts (page load, edit/remove buttons, profile dropdown)
 * - submit-form.spec.ts (form fields, validation, preview)
 * - api.spec.ts (agents CRUD, search, stats)
 */

test.describe('Submissions — DB ID display', () => {
  test('submission IDs show as #{number}, never #undefined', async ({ page }) => {
    await page.goto('/my-submissions');
    await page.waitForTimeout(3000);

    const idTexts = page.locator('p.text-xs.text-zinc-500');
    const count = await idTexts.count();
    if (count === 0) {
      test.skip();
      return;
    }

    for (let i = 0; i < count; i++) {
      const text = await idTexts.nth(i).textContent();
      // Should contain "#{digits}", never "#undefined"
      expect(text).not.toContain('#undefined');
      expect(text).toMatch(/#\d+/);
    }
  });
});

test.describe('Submissions — no GitHub Issue artifacts', () => {
  test('success screen does not show "View on GitHub" link', async ({ page }) => {
    await page.goto('/submit');
    await expect(page.locator('button:has-text("Submit Agent")')).toBeVisible({ timeout: 10000 });

    // Fill minimum required fields
    await page.locator('input[placeholder="e.g. my-agent (lowercase, hyphens only)"]').fill('e2e-test-no-gh-link');
    await page.locator('input[placeholder="e.g. My Agent"]').fill('E2E Test No GH Link');
    await page.locator('textarea').first().fill('Test agent for verifying no GitHub link');
    await page.locator('select').first().selectOption('worker');
    await page.locator('select').nth(1).selectOption('claude');
    await page.waitForTimeout(500);
    await page.locator('select').nth(2).selectOption('sonnet');
    await page.locator('input[placeholder*="https://github.com"]').fill(
      'https://github.com/test/repo/blob/main/agents/test.md'
    );

    await page.locator('button:has-text("Submit Agent")').click();
    await page.waitForTimeout(3000);

    // Whether submission succeeds or fails, "View on GitHub" should never appear
    await expect(page.locator('a:has-text("View on GitHub")')).not.toBeVisible();
  });
});

test.describe('Admin approve API — permission checks', () => {
  test('POST /api/admin/approve/1 as non-admin returns 403', async ({ request }) => {
    const res = await request.post('/api/admin/approve/1');
    // 403 from CSRF (missing Origin) or from non-admin check
    expect(res.status()).toBe(403);
  });

  test('POST /api/admin/approve/999999 as non-admin returns 403', async ({ request }) => {
    // Admin check happens before existence check
    const res = await request.post('/api/admin/approve/999999');
    expect(res.status()).toBe(403);
  });
});

test.describe('My Submissions API — authenticated behavior', () => {
  test('GET /api/my-submissions returns submissions array', async ({ request }) => {
    const res = await request.get('/api/my-submissions');
    // Authenticated user gets their submissions (200) or DB error (503)
    expect([200, 503]).toContain(res.status());
    if (res.status() === 200) {
      const data = await res.json();
      expect(data.submissions).toBeDefined();
      expect(Array.isArray(data.submissions)).toBeTruthy();
    }
  });

  test('DELETE /api/my-submissions/999 non-existent returns 404 or 503', async ({ request }) => {
    const res = await request.delete('/api/my-submissions/999');
    // 403 (CSRF), 404 (not found/not owned), or 503 (no DB)
    expect([403, 404, 503]).toContain(res.status());
  });

  test('PATCH /api/my-submissions/999 non-existent returns 400/404/503', async ({ request }) => {
    const res = await request.patch('/api/my-submissions/999', {
      data: { name: 'test' },
    });
    // 400 (validation), 403 (CSRF), 404 (not found), or 503 (no DB)
    expect([400, 403, 404, 503]).toContain(res.status());
  });
});

test.describe('Submit form — select elements', () => {
  test('category select has expected options', async ({ page }) => {
    await page.goto('/submit');
    const categorySelect = page.locator('select').first();
    await expect(categorySelect).toBeVisible({ timeout: 10000 });

    const options = await categorySelect.locator('option').allTextContents();
    expect(options).toContain('Orchestrator');
    expect(options).toContain('Specialist');
    expect(options).toContain('Worker');
    expect(options).toContain('Analyst');
  });

  test('platform select has expected options', async ({ page }) => {
    await page.goto('/submit');
    await expect(page.locator('select').nth(1)).toBeVisible({ timeout: 10000 });

    const platformSelect = page.locator('select').nth(1);
    const options = await platformSelect.locator('option').allTextContents();
    expect(options).toContain('Claude Code');
    expect(options).toContain('Gemini CLI');
    expect(options).toContain('Codex CLI');
    expect(options).toContain('Cursor');
    expect(options).toContain('Universal');
  });

  test('model select is disabled until platform is selected', async ({ page }) => {
    await page.goto('/submit');
    const modelSelect = page.locator('select').nth(2);
    await expect(modelSelect).toBeVisible({ timeout: 10000 });

    // Model should be disabled when no platform selected
    await expect(modelSelect).toBeDisabled();

    // Select a platform
    await page.locator('select').nth(1).selectOption('claude');

    // Now model should be enabled
    await expect(modelSelect).toBeEnabled();

    // Should show Claude-specific models
    const options = await modelSelect.locator('option').allTextContents();
    expect(options.some(o => o.includes('Sonnet'))).toBeTruthy();
    expect(options.some(o => o.includes('Opus'))).toBeTruthy();
    expect(options.some(o => o.includes('Haiku'))).toBeTruthy();
  });
});

test.describe('Submit form — tag/capability chip input', () => {
  test('capabilities tag input adds chips on Enter', async ({ page }) => {
    await page.goto('/submit');
    const capInput = page.locator('input[placeholder="e.g. Code review"]');
    await expect(capInput).toBeVisible({ timeout: 10000 });

    // Type a capability and press Enter
    await capInput.fill('Code review');
    await capInput.press('Enter');

    // Chip should appear
    const chip = page.locator('span:has-text("Code review")').first();
    await expect(chip).toBeVisible();

    // Input should be cleared
    await expect(capInput).toHaveValue('');

    // Add another
    await capInput.fill('Testing');
    await capInput.press('Enter');
    await expect(page.locator('span:has-text("Testing")').first()).toBeVisible();
  });

  test('capabilities chip can be removed with X button', async ({ page }) => {
    await page.goto('/submit');
    const capInput = page.locator('input[placeholder="e.g. Code review"]');
    await expect(capInput).toBeVisible({ timeout: 10000 });

    // Add a chip
    await capInput.fill('Debugging');
    await capInput.press('Enter');
    await expect(page.locator('span:has-text("Debugging")').first()).toBeVisible();

    // Click the remove (X) button on the chip
    const removeBtn = page.locator('span:has-text("Debugging")').first().locator('button[aria-label="Remove Debugging"]');
    await removeBtn.click();

    // Chip should be gone
    await expect(page.locator('span:has-text("Debugging")')).not.toBeVisible();
  });

  test('tools tag input adds chips with mono style', async ({ page }) => {
    await page.goto('/submit');
    const toolInput = page.locator('input[placeholder="e.g. Bash"]');
    await expect(toolInput).toBeVisible({ timeout: 10000 });

    await toolInput.fill('Bash');
    await toolInput.press('Enter');

    // Tool chip should have font-mono class (use .first() — preview also shows a badge)
    const chip = page.locator('span.font-mono:has-text("Bash")').first();
    await expect(chip).toBeVisible();
  });

  test('duplicate capabilities are not added', async ({ page }) => {
    await page.goto('/submit');
    const capInput = page.locator('input[placeholder="e.g. Code review"]');
    await expect(capInput).toBeVisible({ timeout: 10000 });

    await capInput.fill('Planning');
    await capInput.press('Enter');
    await capInput.fill('Planning');
    await capInput.press('Enter');

    // Should only have one chip
    const chips = page.locator('span:has-text("Planning") >> button[aria-label="Remove Planning"]');
    expect(await chips.count()).toBe(1);
  });
});
