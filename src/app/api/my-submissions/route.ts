import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  void request;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { getDb } = await import("@/db");
    const sql = getDb();
    const userLogin = session.user.login ?? '';

    const rows = await sql`
      SELECT s.id, s.slug, s.name, s.display_name, s.description, s.long_description,
             s.category, s.model, s.platform, s.author, s.github_url, s.install_command,
             s.capabilities, s.tools, s.tags, s.status,
             s.created_at, s.updated_at
      FROM submissions s
      JOIN users u ON s.user_id = u.id
      WHERE u.login = ${userLogin} AND s.status != 'removed'
      ORDER BY s.created_at DESC
    `;

    const submissions = rows.map((row: Record<string, unknown>) => ({
      id: row.id as number,
      slug: row.slug as string,
      title: (row.display_name as string) || (row.name as string),
      status: row.status as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      formData: {
        name: row.name as string,
        displayName: row.display_name as string,
        description: row.description as string,
        longDescription: row.long_description as string,
        category: row.category as string,
        model: row.model as string,
        platform: row.platform as string,
        author: row.author as string,
        githubUrl: row.github_url as string,
        capabilities: row.capabilities as string,
        tools: row.tools as string,
        tags: row.tags as string,
      },
    }));

    return NextResponse.json({ submissions });
  } catch (e) {
    console.error("Failed to fetch submissions:", e);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}
