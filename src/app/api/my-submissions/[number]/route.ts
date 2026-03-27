import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { agentSubmissionSchema } from '@/lib/validation';
import { checkMaliciousContent } from '@/lib/security';
import { isSubmissionOwner } from '@/lib/ownership';

const headers = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
};

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

  const rateLimitKey = session.user.login || getClientIp(request);
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

  const issueRes = await fetch(
    `https://api.github.com/repos/sehoon787/agent-hub/issues/${number}`,
    { headers }
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

  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

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
**submittedBy:** ${session.user.login ?? session.user.email ?? session.user.name ?? 'unknown'}`;

  const updateRes = await fetch(
    `https://api.github.com/repos/sehoon787/agent-hub/issues/${number}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        title: `[Agent Submission] ${data.displayName} (${data.platform})`,
        body: issueBody,
      }),
    }
  );

  if (!updateRes.ok) {
    const ghError = await updateRes.text();
    return NextResponse.json({ error: `GitHub API error: ${ghError}` }, { status: 502 });
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

  const rateLimitKey = session.user.login || getClientIp(request);
  const { allowed } = rateLimit(rateLimitKey, 10, 3600000);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ error: 'GitHub integration not configured' }, { status: 503 });
  }

  const { number } = await params;

  const issueRes = await fetch(
    `https://api.github.com/repos/sehoon787/agent-hub/issues/${number}`,
    { headers }
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

  const closeRes = await fetch(
    `https://api.github.com/repos/sehoon787/agent-hub/issues/${number}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ state: 'closed' }),
    }
  );

  if (!closeRes.ok) {
    const ghError = await closeRes.text();
    return NextResponse.json({ error: `GitHub API error: ${ghError}` }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
