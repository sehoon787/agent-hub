import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { agentSubmissionSchema } from '@/lib/validation';
import { checkMaliciousContent } from '@/lib/security';

const headers = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
};

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
    'https://api.github.com/repos/sehoon787/agent-hub/contents/src/lib/data/agents.json?ref=master',
    { headers }
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
    'https://api.github.com/repos/sehoon787/agent-hub/git/ref/heads/master',
    { headers }
  );
  if (!refRes.ok) {
    return { success: false, error: 'Failed to get master ref' };
  }
  const refData = await refRes.json();
  const masterSha = refData.object.sha;

  // Create new branch
  const branchName = `${action}-agent/${slug}/${Date.now()}`;
  const branchRes = await fetch(
    'https://api.github.com/repos/sehoon787/agent-hub/git/refs',
    {
      method: 'POST',
      headers,
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
    'https://api.github.com/repos/sehoon787/agent-hub/contents/src/lib/data/agents.json',
    {
      method: 'PUT',
      headers,
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
    'https://api.github.com/repos/sehoon787/agent-hub/pulls',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: prTitle,
        body: prBody,
        head: branchName,
        base: 'master',
      }),
    }
  );
  if (!prRes.ok) {
    const ghError = await prRes.text();
    return { success: false, error: `Failed to create PR: ${ghError}` };
  }

  const prData = await prRes.json();
  return { success: true, prUrl: prData.html_url };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  // number param unused for approved route but required by Next.js signature
  await params;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitKey = session.user.login || getClientIp(request);
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
    author: data.author,
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
  await params;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitKey = session.user.login || getClientIp(request);
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

  const { slug } = body as { slug: string };
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
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
}
