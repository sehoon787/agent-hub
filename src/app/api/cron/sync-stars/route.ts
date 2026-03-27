import { NextRequest, NextResponse } from 'next/server';
import { githubApiUrl } from '@/lib/github-api';

interface RepoStats {
  stargazers_count: number;
  forks_count: number;
}

interface AgentEntry {
  slug: string;
  githubUrl: string;
  stars: number;
  forks: number;
  [key: string]: unknown;
}

function parseOwnerRepo(githubUrl: string): { owner: string; repo: string } | null {
  const match = githubUrl.match(/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

export async function GET(request: NextRequest) {
  // Verify Vercel Cron authorization
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'GITHUB_TOKEN not configured' }, { status: 503 });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
  };

  try {
    // 1. Read current agents.json from GitHub
    const fileRes = await fetch(
      githubApiUrl('contents/src/lib/data/agents.json'),
      { headers, cache: 'no-store' }
    );
    if (!fileRes.ok) {
      return NextResponse.json({ error: 'Failed to read agents.json' }, { status: 502 });
    }
    const fileData = await fileRes.json() as { content: string; sha: string };
    const agents: AgentEntry[] = JSON.parse(
      Buffer.from(fileData.content, 'base64').toString('utf-8')
    );

    // 2. Collect unique githubUrls
    const urlSet = new Set<string>();
    for (const agent of agents) {
      if (agent.githubUrl) urlSet.add(agent.githubUrl);
    }

    // 3. Fetch stars/forks for each unique repo
    const repoStats = new Map<string, { stars: number; forks: number }>();
    const notFound: string[] = [];

    for (const url of urlSet) {
      const parsed = parseOwnerRepo(url);
      if (!parsed) continue;

      const res = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
        { headers, cache: 'no-store' }
      );

      if (res.status === 404) {
        notFound.push(url);
        continue;
      }
      if (!res.ok) continue;

      const data: RepoStats = await res.json();
      repoStats.set(url, {
        stars: data.stargazers_count,
        forks: data.forks_count,
      });
    }

    // 4. Update agents with real data
    let changed = false;
    for (const agent of agents) {
      // Clear 404 URLs
      if (notFound.includes(agent.githubUrl)) {
        agent.githubUrl = '';
        agent.stars = 0;
        agent.forks = 0;
        changed = true;
        continue;
      }

      const stats = repoStats.get(agent.githubUrl);
      if (stats && (agent.stars !== stats.stars || agent.forks !== stats.forks)) {
        agent.stars = stats.stars;
        agent.forks = stats.forks;
        changed = true;
      }
    }

    if (!changed) {
      return NextResponse.json({ message: 'No changes needed', repos: urlSet.size });
    }

    // 5. Commit updated agents.json back to GitHub
    const updatedContent = Buffer.from(
      JSON.stringify(agents, null, 2) + '\n'
    ).toString('base64');

    const commitRes = await fetch(
      githubApiUrl('contents/src/lib/data/agents.json'),
      {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'chore: sync GitHub stars and forks',
          content: updatedContent,
          sha: fileData.sha,
        }),
      }
    );

    if (!commitRes.ok) {
      return NextResponse.json({ error: 'Failed to commit changes' }, { status: 502 });
    }

    return NextResponse.json({
      message: 'Synced successfully',
      repos: urlSet.size,
      updated: changed,
      notFound,
    });
  } catch {
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
