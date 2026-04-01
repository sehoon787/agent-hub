import { NextRequest, NextResponse } from 'next/server';
import { getAgents, getAgent } from '@/lib/data';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { agentSubmissionSchema } from '@/lib/validation';
import { checkMaliciousContent } from '@/lib/security';
import { getAccessToken } from '@/lib/github-api';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const result = getAgents({
    q: sp.get('q') || undefined,
    category: sp.get('category') || undefined,
    model: sp.get('model') || undefined,
    source: sp.get('source') || undefined,
    platform: sp.get('platform') || undefined,
    stage: (() => {
      const s = sp.get('stage');
      const valid = new Set(['discover','plan','implement','review','verify','debug','operate']);
      return s && valid.has(s) ? s : undefined;
    })(),
    sort: sp.get('sort') || undefined,
    page: sp.get('page') ? Number(sp.get('page')) : undefined,
    limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitKey = session.user.login || session.user.email || 'anonymous';
  const { allowed } = rateLimit(rateLimitKey, 5, 3600000);
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

  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Check for duplicate slug
  const existing = getAgent(slug);
  if (existing) {
    return NextResponse.json(
      { error: 'An agent with this name already exists', details: { name: [`Agent "${existing.displayName}" already uses the slug "${slug}"`] } },
      { status: 409 }
    );
  }

  // Check for duplicate githubUrl from different authors
  const allAgents = getAgents({ limit: 100 }).items;
  const existingWithSameUrl = allAgents.filter(
    (a) => a.githubUrl === data.githubUrl && a.author !== (session.user.login || data.author)
  );
  if (existingWithSameUrl.length > 0) {
    return NextResponse.json(
      { error: 'This repository is already registered by another user', details: { githubUrl: ['Repository URL already in use by another author'] } },
      { status: 409 }
    );
  }

  // Verify GitHub URL ownership
  const accessToken = await getAccessToken(request);
  if (!accessToken) {
    return NextResponse.json(
      { error: 'GitHub token expired. Please sign out and sign back in.' },
      { status: 401 }
    );
  }
  const { validateGithubUrlOwnership } = await import('@/lib/github-ownership');
  const ownership = await validateGithubUrlOwnership(
    data.githubUrl,
    session.user.login ?? '',
    accessToken
  );
  if (!ownership.valid) {
    return NextResponse.json(
      { error: ownership.reason, details: { githubUrl: [ownership.reason!] } },
      { status: 403 }
    );
  }

  // Auto-generate install command from githubUrl (supports /blob/ file URLs)
  let installCmd = '';
  const blobMatch = data.githubUrl.match(/github\.com\/([^/]+\/[^/]+)\/blob\/([^/]+)\/(.+)/);
  if (blobMatch) {
    const repoKey = blobMatch[1].replace(/\.git$/, '');
    const branch = blobMatch[2];
    const filePath = blobMatch[3];
    installCmd = `curl -o ~/.claude/agents/${slug}.md https://raw.githubusercontent.com/${repoKey}/${branch}/${filePath}`;
  }

  // Verify file exists and has valid agent format
  if (installCmd) {
    const rawUrlMatch = installCmd.match(/https:\/\/raw\.githubusercontent\.com\/\S+/);
    if (rawUrlMatch) {
      try {
        const fileRes = await fetch(rawUrlMatch[0]);
        if (!fileRes.ok) {
          return NextResponse.json(
            { error: 'File not found at the specified URL.', details: { githubUrl: ['The .md file was not found at this URL (HTTP ' + fileRes.status + ')'] } },
            { status: 400 }
          );
        }
        const content = await fileRes.text();
        if (!content.trim()) {
          return NextResponse.json(
            { error: 'The file is empty.', details: { githubUrl: ['The .md file at this URL is empty'] } },
            { status: 400 }
          );
        }
        if (content.length > 100000) {
          return NextResponse.json(
            { error: 'File too large for an agent definition.', details: { githubUrl: ['Agent .md files should be under 100KB'] } },
            { status: 400 }
          );
        }
        const hasFrontmatter = /^---\s*\n[\s\S]*?\n---/.test(content);
        const hasHeading = /^#\s+.+/m.test(content);
        if (!hasFrontmatter && !hasHeading) {
          return NextResponse.json(
            { error: 'This file does not appear to be a valid agent definition. Agent files should have YAML frontmatter (---) or a markdown heading (#).', details: { githubUrl: ['No YAML frontmatter or markdown heading found'] } },
            { status: 400 }
          );
        }
      } catch {
        // Network error — allow submission to proceed
      }
    }
  }

  // Save to DB (primary)
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  let submissionId: number | undefined;
  try {
    const { getDb } = await import("@/db");
    const sql = getDb();
    const userLogin = session.user.login ?? '';
    const users = await sql`SELECT id FROM users WHERE login = ${userLogin}`;
    if (users.length > 0) {
      const result = await sql`
        INSERT INTO submissions (user_id, slug, name, display_name, description, long_description, category, model, platform, author, github_url, install_command, capabilities, tools, tags, status)
        VALUES (${users[0].id}, ${slug}, ${data.name}, ${data.displayName}, ${data.description}, ${data.longDescription ?? ''}, ${data.category}, ${data.model}, ${data.platform}, ${session.user.login ?? ''}, ${data.githubUrl ?? ''}, ${installCmd}, ${data.capabilities ?? ''}, ${data.tools ?? ''}, ${data.tags ?? ''}, 'pending')
        RETURNING id
      `;
      submissionId = result[0]?.id;
    }
  } catch (e) {
    console.error("Failed to save submission to DB:", e);
    return NextResponse.json({ error: 'Failed to save submission. Please try again.' }, { status: 500 });
  }

  return NextResponse.json(
    {
      success: true,
      id: submissionId,
      slug,
      message: 'Submitted successfully. Your agent will be reviewed.',
    },
    { status: 201 }
  );
}
