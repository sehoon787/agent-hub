import { NextRequest, NextResponse } from 'next/server';
import { collectAgents } from '@/lib/collector';
import { getAllAgentSlugs } from '@/lib/data';
import { getDb } from '@/db';

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const existingSlugs = new Set(await getAllAgentSlugs());
  const collected = await collectAgents(existingSlugs);

  // Insert collected agents into DB
  const sql = getDb();
  let inserted = 0;
  for (const entry of collected) {
    try {
      const slug = entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await sql`
        INSERT INTO agents (slug, name, display_name, description, category, model, platform, source, author, github_url)
        VALUES (${slug}, ${entry.name}, ${entry.name}, ${entry.description}, ${entry.category || 'worker'}, ${entry.model || 'sonnet'}, 'claude', ${entry.source}, '', ${entry.githubUrl})
        ON CONFLICT (slug) DO NOTHING
      `;
      inserted++;
    } catch {
      // Skip individual failures
    }
  }

  return NextResponse.json({
    success: true,
    collected: collected.length,
    inserted,
  });
}
