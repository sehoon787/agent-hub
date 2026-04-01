import { test as setup } from '@playwright/test';

setup('seed test submission', async () => {
  // Dynamic import to avoid issues when @neondatabase/serverless isn't available
  const { neon } = await import('@neondatabase/serverless');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('⚠ DATABASE_URL not set, skipping DB seed');
    return;
  }

  const sql = neon(databaseUrl);

  // Get user id for test user
  const users = await sql`SELECT id FROM users WHERE login = 'sehoon787'`;
  if (users.length === 0) {
    console.log('⚠ Test user not found, skipping DB seed');
    return;
  }
  const userId = users[0].id;

  // Check if test submission already exists
  const existing = await sql`SELECT id FROM submissions WHERE slug = 'e2e-test-agent' AND user_id = ${userId}`;
  if (existing.length > 0) {
    console.log('✓ Test submission already exists (id:', existing[0].id, ')');
    return;
  }

  // Insert test submission
  const result = await sql`
    INSERT INTO submissions (user_id, slug, name, display_name, description, long_description, category, model, platform, author, github_url, install_command, capabilities, tools, tags, status)
    VALUES (${userId}, 'e2e-test-agent', 'e2e-test-agent', 'E2E Test Agent', 'An agent created for automated E2E testing purposes', 'This is a test agent used by Playwright E2E tests.', 'specialist', 'sonnet', 'claude', 'sehoon787', 'https://github.com/sehoon787/agent-hub/blob/master/README.md', '', 'testing,automation', 'Read,Write', 'test,e2e', 'pending')
    RETURNING id
  `;
  console.log('✓ Seeded test submission (id:', result[0].id, ')');
});
