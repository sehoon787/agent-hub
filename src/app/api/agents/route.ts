import { NextRequest, NextResponse } from 'next/server';
import { getAgents, getAgent } from '@/lib/data';
import { auth } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { agentSubmissionSchema } from '@/lib/validation';
import { checkMaliciousContent } from '@/lib/security';
import { githubApiUrl, getGithubHeaders, getAccessToken } from '@/lib/github-api';

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

  const rateLimitKey = session.user.email || getClientIp(request);
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

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ error: 'GitHub integration not configured' }, { status: 503 });
  }

  function sanitizeLine(val: string): string {
    return val.replace(/[\r\n]+/g, ' ').trim();
  }

  const issueBody = `## Agent Submission

**name:** ${sanitizeLine(data.name)}
**displayName:** ${sanitizeLine(data.displayName)}
**slug:** ${sanitizeLine(slug)}
**description:** ${sanitizeLine(data.description)}
**longDescription:** ${sanitizeLine(data.longDescription ?? '')}
**category:** ${sanitizeLine(data.category)}
**model:** ${sanitizeLine(data.model)}
**platform:** ${sanitizeLine(data.platform)}
**author:** ${sanitizeLine(session.user.login || data.author)}
**githubUrl:** ${sanitizeLine(data.githubUrl ?? '')}
**capabilities:** ${sanitizeLine(data.capabilities ?? '')}
**tools:** ${sanitizeLine(data.tools ?? '')}
**tags:** ${sanitizeLine(data.tags ?? '')}
**submittedBy:** ${sanitizeLine(session.user.login ?? session.user.email ?? session.user.name ?? 'unknown')}`;

  const ghRes = await fetch(githubApiUrl('issues'), {
    method: 'POST',
    headers: getGithubHeaders(),
    body: JSON.stringify({
      title: `[Agent Submission] ${data.displayName} (${data.platform})`,
      body: issueBody,
      labels: ['agent-submission'],
    }),
  });

  if (!ghRes.ok) {
    return NextResponse.json({ error: 'Failed to create submission. Please try again.' }, { status: 502 });
  }

  const ghData = await ghRes.json() as { html_url: string };
  return NextResponse.json(
    {
      success: true,
      slug,
      issueUrl: ghData.html_url,
      message: 'Submitted successfully. Your agent will be reviewed.',
    },
    { status: 201 }
  );
}
