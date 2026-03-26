import { NextRequest, NextResponse } from 'next/server';
import { getAgents } from '@/lib/data';
import { auth } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { agentSubmissionSchema } from '@/lib/validation';
import { checkMaliciousContent } from '@/lib/security';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const result = getAgents({
    q: sp.get('q') || undefined,
    category: sp.get('category') || undefined,
    model: sp.get('model') || undefined,
    source: sp.get('source') || undefined,
    platform: sp.get('platform') || undefined,
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

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ error: 'GitHub integration not configured' }, { status: 503 });
  }

  const issueBody = `## Agent Submission

**name:** ${data.name}
**displayName:** ${data.displayName}
**slug:** ${slug}
**description:** ${data.description}
**longDescription:** ${data.longDescription ?? ''}
**category:** ${data.category}
**model:** ${data.model}
**platform:** ${data.platform}
**author:** ${data.author}
**githubUrl:** ${data.githubUrl ?? ''}
**capabilities:** ${data.capabilities ?? ''}
**tools:** ${data.tools ?? ''}
**tags:** ${data.tags ?? ''}
**submittedBy:** ${session.user.email ?? session.user.name ?? 'unknown'}`;

  const ghRes = await fetch('https://api.github.com/repos/sehoon787/agent-hub/issues', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `[Agent Submission] ${data.displayName} (${data.platform})`,
      body: issueBody,
      labels: ['agent-submission'],
    }),
  });

  if (!ghRes.ok) {
    const ghError = await ghRes.text();
    return NextResponse.json({ error: `GitHub API error: ${ghError}` }, { status: 502 });
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
