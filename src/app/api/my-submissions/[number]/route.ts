import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { agentSubmissionSchema } from '@/lib/validation';
import { checkMaliciousContent } from '@/lib/security';
import { isSubmissionOwner } from '@/lib/ownership';
import { githubApiUrl, getGithubHeaders, getAccessToken } from '@/lib/github-api';

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  body: string;
  labels: { name: string }[];
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
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

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ error: 'GitHub integration not configured' }, { status: 503 });
  }

  const { number } = await params;
  if (!/^\d+$/.test(number)) {
    return NextResponse.json({ error: 'Invalid issue number' }, { status: 400 });
  }

  const issueRes = await fetch(
    githubApiUrl(`issues/${number}`),
    { headers: getGithubHeaders() }
  );
  if (!issueRes.ok) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  const issue: GitHubIssue = await issueRes.json();
  const labelNames = issue.labels.map((l) => l.name);

  if (!labelNames.includes('agent-submission')) {
    return NextResponse.json({ error: 'Not an agent submission' }, { status: 403 });
  }
  if (issue.state !== 'open') {
    return NextResponse.json({ error: 'Submission is not open' }, { status: 403 });
  }
  if (labelNames.includes('approved')) {
    return NextResponse.json({ error: 'Submission already approved' }, { status: 403 });
  }

  if (!isSubmissionOwner(issue.body ?? '', session.user)) {
    return NextResponse.json({ error: 'Not the owner of this submission' }, { status: 403 });
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
  const existingAgent = getAgent(slug);
  if (existingAgent) {
    return NextResponse.json(
      { error: `Agent with slug "${slug}" already exists`, details: { name: [`An agent already uses the slug "${slug}"`] } },
      { status: 409 }
    );
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
**author:** ${sanitizeLine(data.author)}
**githubUrl:** ${sanitizeLine(data.githubUrl ?? '')}
**capabilities:** ${sanitizeLine(data.capabilities ?? '')}
**tools:** ${sanitizeLine(data.tools ?? '')}
**tags:** ${sanitizeLine(data.tags ?? '')}
**submittedBy:** ${sanitizeLine(session.user.login ?? session.user.email ?? session.user.name ?? 'unknown')}`;

  const updateRes = await fetch(
    githubApiUrl(`issues/${number}`),
    {
      method: 'PATCH',
      headers: getGithubHeaders(),
      body: JSON.stringify({
        title: `[Agent Submission] ${data.displayName} (${data.platform})`,
        body: issueBody,
      }),
    }
  );

  if (!updateRes.ok) {
    return NextResponse.json({ error: 'Failed to update submission. Please try again.' }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
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
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json({ error: 'GitHub integration not configured' }, { status: 503 });
    }

    const { number } = await params;
    if (!/^\d+$/.test(number)) {
      return NextResponse.json({ error: 'Invalid issue number' }, { status: 400 });
    }

    const issueRes = await fetch(
      githubApiUrl(`issues/${number}`),
      { headers: getGithubHeaders() }
    );
    if (!issueRes.ok) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const issue: GitHubIssue = await issueRes.json();
    const labelNames = issue.labels.map((l) => l.name);

    if (!labelNames.includes('agent-submission')) {
      return NextResponse.json({ error: 'Not an agent submission' }, { status: 403 });
    }
    if (!isSubmissionOwner(issue.body ?? '', session.user)) {
      return NextResponse.json({ error: 'Not the owner of this submission' }, { status: 403 });
    }

    if (issue.state !== 'open') {
      // Add user-removed label to hide from list
      const labelRes = await fetch(
        githubApiUrl(`issues/${number}/labels`),
        {
          method: 'POST',
          headers: getGithubHeaders(),
          body: JSON.stringify({ labels: ['user-removed'] }),
        }
      );
      if (!labelRes.ok) {
        return NextResponse.json({ error: 'Failed to remove submission' }, { status: 502 });
      }
      return NextResponse.json({ success: true });
    }

    const closeRes = await fetch(
      githubApiUrl(`issues/${number}`),
      {
        method: 'PATCH',
        headers: getGithubHeaders(),
        body: JSON.stringify({ state: 'closed' }),
      }
    );

    if (!closeRes.ok) {
      return NextResponse.json({ error: 'Failed to close submission. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
