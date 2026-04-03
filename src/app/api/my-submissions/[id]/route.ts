import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { agentSubmissionSchema } from '@/lib/validation';
import { checkMaliciousContent } from '@/lib/security';
import { getAccessToken } from '@/lib/github-api';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitKey = session.user.login || session.user.email || 'anonymous';
  const { allowed } = rateLimit(rateLimitKey, 10, 3600000);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = agentSubmissionSchema.safeParse(body);
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

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid submission id' }, { status: 400 });
  }

  // Look up submission from DB
  const { getDb } = await import("@/db");
  const sql = getDb();
  const userLogin = session.user.login ?? '';

  const rows = await sql`
    SELECT s.id, s.user_id, s.status
    FROM submissions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ${Number(id)} AND u.login = ${userLogin}
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Submission not found or not owned by you' }, { status: 404 });
  }

  const submission = rows[0];
  if (submission.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending submissions can be edited' }, { status: 403 });
  }

  // Verify GitHub URL ownership on edit
  if (data.githubUrl) {
    const accessToken = await getAccessToken(request);
    if (!accessToken || !session.user.login) {
      return NextResponse.json(
        { error: 'GitHub token expired. Please sign out and sign back in.' },
        { status: 401 }
      );
    }
    const { validateGithubUrlOwnership } = await import('@/lib/github-ownership');
    const ownership = await validateGithubUrlOwnership(
      data.githubUrl,
      session.user.login,
      accessToken
    );
    if (!ownership.valid) {
      return NextResponse.json(
        { error: ownership.reason, details: { githubUrl: [ownership.reason!] } },
        { status: 403 }
      );
    }
  }

  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Check for slug collision on edit
  const { getAgent } = await import('@/lib/data');
  const existingAgent = await getAgent(slug);
  if (existingAgent) {
    return NextResponse.json(
      { error: `Agent with slug "${slug}" already exists`, details: { name: [`An agent already uses the slug "${slug}"`] } },
      { status: 409 }
    );
  }

  // Auto-generate install command from githubUrl
  let installCmd = '';
  const blobMatch = (data.githubUrl ?? '').match(/github\.com\/([^/]+\/[^/]+)\/blob\/([^/]+)\/(.+)/);
  if (blobMatch) {
    const repoKey = blobMatch[1].replace(/\.git$/, '');
    const branch = blobMatch[2];
    const filePath = blobMatch[3];
    const isSkill = data.type === 'skill';
    const installDir = isSkill ? `~/.claude/skills/${slug}` : `~/.claude/agents`;
    const installFile = isSkill ? 'SKILL.md' : `${slug}.md`;
    installCmd = `curl -o ${installDir}/${installFile} https://raw.githubusercontent.com/${repoKey}/${branch}/${filePath}`;
  }

  // Update DB (primary)
  try {
    await sql`
      UPDATE submissions SET
        slug = ${slug},
        name = ${data.name},
        display_name = ${data.displayName},
        description = ${data.description},
        long_description = ${data.longDescription ?? ''},
        category = ${data.category},
        model = ${data.model},
        platform = ${data.platform},
        github_url = ${data.githubUrl ?? ''},
        install_command = ${installCmd},
        capabilities = ${data.capabilities ?? ''},
        tools = ${data.tools ?? ''},
        tags = ${data.tags ?? ''},
        type = ${data.type ?? 'agent'},
        updated_at = NOW()
      WHERE id = ${Number(id)}
    `;
  } catch (e) {
    console.error("Failed to update submission in DB:", e);
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitKey = session.user.login || session.user.email || 'anonymous';
  const { allowed } = rateLimit(rateLimitKey, 10, 3600000);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { id } = await params;
    if (!/^\d+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid submission id' }, { status: 400 });
    }

    const { getDb } = await import("@/db");
    const sql = getDb();
    const userLogin = session.user.login ?? '';

    const rows = await sql`
      SELECT s.id, s.status
      FROM submissions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${Number(id)} AND u.login = ${userLogin}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Submission not found or not owned by you' }, { status: 404 });
    }

    // Update DB status to 'removed' (primary)
    await sql`
      UPDATE submissions SET status = 'removed', updated_at = NOW()
      WHERE id = ${Number(id)}
    `;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
