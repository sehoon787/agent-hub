import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  void request;
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid submission id' }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.login) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin permission
  const adminLogins = (process.env.ADMIN_LOGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (adminLogins.length === 0) {
    return NextResponse.json({ error: 'ADMIN_LOGINS not configured' }, { status: 503 });
  }
  if (!adminLogins.includes(session.user.login)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { getDb } = await import('@/db');
  const sql = getDb();

  const rows = await sql`
    SELECT id, status FROM submissions WHERE id = ${Number(id)}
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }
  if (rows[0].status !== 'pending') {
    return NextResponse.json({ error: `Submission is already ${rows[0].status}` }, { status: 400 });
  }

  // Update submission status
  await sql`
    UPDATE submissions SET status = 'approved', updated_at = NOW() WHERE id = ${Number(id)}
  `;

  // Copy approved submission to agents table for immediate listing
  const subRows = await sql`
    SELECT slug, name, display_name, description, long_description,
           category, model, platform, author, github_url, install_command,
           capabilities, tools, tags
    FROM submissions WHERE id = ${Number(id)}
  `;
  if (subRows.length > 0) {
    const s = subRows[0];
    // Parse comma-separated strings into arrays for the agents table
    const caps = (s.capabilities as string || '').split(',').map((x: string) => x.trim()).filter(Boolean);
    const tools = (s.tools as string || '').split(',').map((x: string) => x.trim()).filter(Boolean);
    const tags = (s.tags as string || '').split(',').map((x: string) => x.trim()).filter(Boolean);

    await sql`
      INSERT INTO agents (slug, name, display_name, description, long_description,
        category, model, platform, source, author, github_url, install_command,
        capabilities, tools, tags)
      VALUES (${s.slug}, ${s.name}, ${s.display_name}, ${s.description}, ${s.long_description || ''},
        ${s.category}, ${s.model}, ${s.platform}, 'community', ${s.author},
        ${s.github_url || ''}, ${s.install_command || ''},
        ${caps}, ${tools}, ${tags})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        long_description = EXCLUDED.long_description,
        category = EXCLUDED.category,
        model = EXCLUDED.model,
        platform = EXCLUDED.platform,
        author = EXCLUDED.author,
        github_url = EXCLUDED.github_url,
        install_command = EXCLUDED.install_command,
        capabilities = EXCLUDED.capabilities,
        tools = EXCLUDED.tools,
        tags = EXCLUDED.tags,
        updated_at = NOW()
    `;
  }

  return NextResponse.json({ success: true, status: 'approved' });
}
