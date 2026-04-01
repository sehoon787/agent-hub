import { test as teardown } from '@playwright/test';

teardown('cleanup test submissions', async () => {
  const { neon } = await import('@neondatabase/serverless');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('⚠ DATABASE_URL not set, skipping DB teardown');
    return;
  }

  const sql = neon(databaseUrl);
  const result = await sql`DELETE FROM submissions WHERE slug LIKE 'e2e-%' RETURNING id, slug`;
  if (result.length > 0) {
    console.log('✓ Cleaned up', result.length, 'test submission(s):', result.map(r => r.slug).join(', '));
  } else {
    console.log('✓ No test submissions to clean up');
  }
});
