import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { agentSubmissionSchema } from '@/lib/validation';
import { checkMaliciousContent } from '@/lib/security';
import { githubApiUrl, getGithubHeaders } from '@/lib/github-api';

interface AgentEntry {
  slug: string;
  name: string;
  displayName: string;
  description: string;
  longDescription?: string;
  category: string;
  model: string;
  platform: string;
  source: string;
  author: string;
  githubUrl?: string;
  capabilities?: string[];
  tools?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

async function readAgentsJson(): Promise<{ agents: AgentEntry[]; fileSha: string } | null> {
  const res = await fetch(
    githubApiUrl('contents/src/lib/data/agents.json?ref=master'),
    { headers: getGithubHeaders() }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { agents: JSON.parse(content), fileSha: data.sha };
}

async function createBranchAndPR(
  slug: string,
  displayName: string,
  updatedAgents: AgentEntry[],
  fileSha: string,
  login: string,
  action: 'edit' | 'remove'
): Promise<{ success: boolean; prUrl?: string; error?: string }> {
  // Get master ref SHA
  const refRes = await fetch(
    githubApiUrl('git/ref/heads/master'),
    { headers: getGithubHeaders() }
  );
  if (!refRes.ok) {
    return { success: false, error: 'Failed to get master ref' };
  }
  const refData = await refRes.json();
  const masterSha = refData.object.sha;

  // Create new branch
  const branchName = `${action}-agent/${slug}/${Date.now()}`;
  const branchRes = await fetch(
    githubApiUrl('git/refs'),
    {
      method: 'POST',
      headers: getGithubHeaders(),
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: masterSha }),
    }
  );
  if (!branchRes.ok) {
    return { success: false, error: 'Failed to create branch' };
  }

  // Update agents.json on the branch
  const commitMessage = action === 'edit'
    ? `feat: edit agent "${slug}" by @${login}`
    : `feat: remove agent "${slug}" by @${login}`;

  const updateRes = await fetch(
    githubApiUrl('contents/src/lib/data/agents.json'),
    {
      method: 'PUT',
      headers: getGithubHeaders(),
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(JSON.stringify(updatedAgents, null, 2) + '\n').toString('base64'),
        sha: fileSha,
        branch: branchName,
      }),
    }
  );
  if (!updateRes.ok) {
    return { success: false, error: 'Failed to update agents.json' };
  }

  // Create PR
  const prTitle = action === 'edit'
    ? `[Agent Edit] ${displayName}`
    : `[Agent Remove] ${displayName}`;
  const prBody = action === 'edit'
    ? `Modifies community agent \`${slug}\`.\n\n**Requested by:** @${login}\n\n> This PR was auto-generated from the My Submissions dashboard.`
    : `Removes community agent \`${slug}\`.\n\n**Requested by:** @${login}\n\n> This PR was auto-generated from the My Submissions dashboard.`;

  const prRes = await fetch(
    githubApiUrl('pulls'),
    {
      method: 'POST',
      headers: getGithubHeaders(),
      body: JSON.stringify({
        title: prTitle,
        body: prBody,
        head: branchName,
        base: 'master',
      }),
    }
  );
  if (!prRes.ok) {
    return { success: false, error: 'Failed to create pull request' };
  }

  const prData = await prRes.json();
  return { success: true, prUrl: prData.html_url };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;
  if (!/^\d+$/.test(number)) {
    return NextResponse.json({ error: 'Invalid issue number' }, { status: 400 });
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

  const { slug, ...rest } = body as { slug: string; [key: string]: unknown };
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

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

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ error: 'GitHub integration not configured' }, { status: 503 });
  }

  const result = await readAgentsJson();
  if (!result) {
    return NextResponse.json({ error: 'Failed to read agents.json' }, { status: 502 });
  }

  const { agents, fileSha } = result;
  const agentIndex = agents.findIndex((a) => a.slug === slug);
  if (agentIndex === -1) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const agent = agents[agentIndex];
  if (agent.author !== session.user.login || agent.source === 'official') {
    return NextResponse.json({ error: 'Not authorized to edit this agent' }, { status: 403 });
  }

  // Re-verify githubUrl ownership if changed
  if (data.githubUrl && data.githubUrl !== agent.githubUrl) {
    const { getAccessToken } = await import('@/lib/github-api');
    const accessToken = await getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: 'GitHub token expired. Please sign out and sign back in.' }, { status: 401 });
    }
    const { validateGithubUrlOwnership } = await import('@/lib/github-ownership');
    const ownership = await validateGithubUrlOwnership(data.githubUrl, session.user.login!, accessToken);
    if (!ownership.valid) {
      return NextResponse.json(
        { error: ownership.reason, details: { githubUrl: [ownership.reason!] } },
        { status: 403 }
      );
    }
  }

  // Merge updated fields
  const updatedAgent: AgentEntry = {
    ...agent,
    name: data.name,
    displayName: data.displayName,
    description: data.description,
    longDescription: data.longDescription ?? agent.longDescription,
    category: data.category,
    model: data.model,
    platform: data.platform,
    author: agent.author,  // Never allow author change via edit
    githubUrl: data.githubUrl ?? agent.githubUrl,
    capabilities: data.capabilities ? data.capabilities.split(',').map((s: string) => s.trim()) : agent.capabilities,
    tools: data.tools ? data.tools.split(',').map((s: string) => s.trim()) : agent.tools,
    tags: data.tags ? data.tags.split(',').map((s: string) => s.trim()) : agent.tags,
    updatedAt: new Date().toISOString().split('T')[0],
  };

  const updatedAgents = [...agents];
  updatedAgents[agentIndex] = updatedAgent;

  const prResult = await createBranchAndPR(
    slug,
    data.displayName,
    updatedAgents,
    fileSha,
    session.user.login ?? session.user.name ?? 'unknown',
    'edit'
  );

  if (!prResult.success) {
    return NextResponse.json({ error: prResult.error }, { status: 502 });
  }

  return NextResponse.json({ success: true, prUrl: prResult.prUrl });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;
  if (!/^\d+$/.test(number)) {
    return NextResponse.json({ error: 'Invalid issue number' }, { status: 400 });
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
    // Try to get slug from request body first
    let slug: string | undefined;
    try {
      const body = await request.json();
      slug = (body as { slug?: string }).slug;
    } catch {
      // No body is OK — we'll extract slug from issue
    }

    // If no slug from client, extract from issue body
    if (!slug) {
      const issueRes = await fetch(
        githubApiUrl(`issues/${number}`),
        { headers: getGithubHeaders() }
      );
      if (!issueRes.ok) {
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
      }
      const issue = await issueRes.json();
      const slugMatch = ((issue as { body?: string }).body ?? '').match(/\*\*slug:\*\*\s*(\S+)/);
      slug = slugMatch?.[1];

      // Fallback: derive slug from name field
      if (!slug) {
        const nameMatch = ((issue as { body?: string }).body ?? '').match(/\*\*name:\*\*\s*(\S+)/);
        if (nameMatch) {
          slug = nameMatch[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
      }
    }

    if (!slug) {
      return NextResponse.json({ error: 'Could not determine agent slug from submission' }, { status: 400 });
    }

    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json({ error: 'GitHub integration not configured' }, { status: 503 });
    }

    const result = await readAgentsJson();
    if (!result) {
      return NextResponse.json({ error: 'Failed to read agents.json' }, { status: 502 });
    }

    const { agents, fileSha } = result;
    const agentIndex = agents.findIndex((a) => a.slug === slug);
    if (agentIndex === -1) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const agent = agents[agentIndex];
    if (agent.author !== session.user.login || agent.source === 'official') {
      return NextResponse.json({ error: 'Not authorized to remove this agent' }, { status: 403 });
    }

    const displayName = agent.displayName;
    const updatedAgents = agents.filter((a) => a.slug !== slug);

    const prResult = await createBranchAndPR(
      slug,
      displayName,
      updatedAgents,
      fileSha,
      session.user.login ?? session.user.name ?? 'unknown',
      'remove'
    );

    if (!prResult.success) {
      return NextResponse.json({ error: prResult.error }, { status: 502 });
    }

    return NextResponse.json({ success: true, prUrl: prResult.prUrl });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
