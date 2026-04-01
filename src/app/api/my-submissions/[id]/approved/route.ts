import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { agentSubmissionSchema } from '@/lib/validation';
import { checkMaliciousContent } from '@/lib/security';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid submission id' }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitKey = session.user.login || session.user.email || 'anonymous';
  const { allowed } = rateLimit(rateLimitKey, 3, 3600000);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { getDb } = await import("@/db");
  const sql = getDb();
  const userLogin = session.user.login ?? '';

  // Check submission ownership and status
  const rows = await sql`
    SELECT s.id, s.slug, s.status
    FROM submissions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ${Number(id)} AND u.login = ${userLogin}
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Submission not found or not owned by you' }, { status: 404 });
  }

  const submission = rows[0];
  if (submission.status !== 'approved') {
    return NextResponse.json({ error: 'Only approved submissions can be edited via this endpoint' }, { status: 403 });
  }

  const slug = submission.slug as string;

  // Check agent exists in agents table and belongs to user
  const agentRows = await sql`SELECT * FROM agents WHERE slug = ${slug}`;
  if (agentRows.length === 0) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  const agent = agentRows[0];
  if (agent.author !== userLogin || agent.source === 'official') {
    return NextResponse.json({ error: 'Not authorized to edit this agent' }, { status: 403 });
  }

  const { slug: _bodySlug, ...rest } = body as { slug?: string; [key: string]: unknown };
  void _bodySlug;

  const parsed = agentSubmissionSchema.safeParse(rest);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(issue.message);
    }
    return NextResponse.json({ error: 'Validation failed', details: fieldErrors }, { status: 400 });
  }

  const data = parsed.data;
  const securityCheck = checkMaliciousContent(data as Record<string, unknown>);
  if (!securityCheck.safe) {
    return NextResponse.json({ error: 'Submission contains disallowed content' }, { status: 400 });
  }

  // Re-verify githubUrl ownership if changed
  if (data.githubUrl && data.githubUrl !== agent.github_url) {
    const { getAccessToken } = await import('@/lib/github-api');
    const accessToken = await getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: 'GitHub token expired. Please sign out and sign back in.' }, { status: 401 });
    }
    const { validateGithubUrlOwnership } = await import('@/lib/github-ownership');
    const ownership = await validateGithubUrlOwnership(data.githubUrl, userLogin, accessToken);
    if (!ownership.valid) {
      return NextResponse.json(
        { error: ownership.reason, details: { githubUrl: [ownership.reason!] } },
        { status: 403 }
      );
    }
  }

  // Parse comma-separated strings to arrays
  const capabilities = data.capabilities ? data.capabilities.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const tools = data.tools ? data.tools.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const tags = data.tags ? data.tags.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

  // Update agents table
  await sql`
    UPDATE agents SET
      name = ${data.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')},
      display_name = ${data.displayName},
      description = ${data.description},
      long_description = ${data.longDescription ?? ''},
      category = ${data.category},
      model = ${data.model},
      platform = ${data.platform},
      github_url = ${data.githubUrl ?? agent.github_url},
      capabilities = ${capabilities},
      tools = ${tools},
      tags = ${tags},
      updated_at = NOW()
    WHERE slug = ${slug}
  `;

  // Also update submission record
  await sql`
    UPDATE submissions SET
      name = ${data.name},
      display_name = ${data.displayName},
      description = ${data.description},
      long_description = ${data.longDescription ?? ''},
      category = ${data.category},
      model = ${data.model},
      platform = ${data.platform},
      github_url = ${data.githubUrl ?? ''},
      capabilities = ${data.capabilities ?? ''},
      tools = ${data.tools ?? ''},
      tags = ${data.tags ?? ''},
      updated_at = NOW()
    WHERE id = ${Number(id)}
  `;

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid submission id' }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitKey = session.user.login || session.user.email || 'anonymous';
  const { allowed } = rateLimit(rateLimitKey, 3, 3600000);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { getDb } = await import("@/db");
    const sql = getDb();
    const userLogin = session.user.login ?? '';

    const rows = await sql`
      SELECT s.id, s.slug, s.status
      FROM submissions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${Number(id)} AND u.login = ${userLogin}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Submission not found or not owned by you' }, { status: 404 });
    }

    const submission = rows[0];
    if (submission.status !== 'approved') {
      return NextResponse.json({ error: 'Only approved submissions can be removed via this endpoint' }, { status: 403 });
    }

    const slug = submission.slug as string;

    // Check ownership before delete
    const agentRows = await sql`SELECT author, source FROM agents WHERE slug = ${slug}`;
    if (agentRows.length > 0) {
      const agent = agentRows[0];
      if (agent.author !== userLogin || agent.source === 'official') {
        return NextResponse.json({ error: 'Not authorized to remove this agent' }, { status: 403 });
      }
      // Delete from agents table
      await sql`DELETE FROM agents WHERE slug = ${slug}`;
    }

    // Update submission status
    await sql`UPDATE submissions SET status = 'removed', updated_at = NOW() WHERE id = ${Number(id)}`;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
