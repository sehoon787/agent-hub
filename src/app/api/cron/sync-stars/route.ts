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

async function fetchContributorCount(repoKey: string, headers: Record<string, string>): Promise<number> {
  const res = await fetch(
    `https://api.github.com/repos/${repoKey}/contributors?per_page=1&anon=true`,
    { headers, cache: 'no-store' }
  );
  if (!res.ok) return 0;

  const linkHeader = res.headers.get('link');
  if (!linkHeader) {
    const data = await res.json();
    return Array.isArray(data) ? data.length : 0;
  }

  const lastMatch = linkHeader.match(/[?&]page=(\d+)>;\s*rel="last"/);
  return lastMatch ? parseInt(lastMatch[1], 10) : 1;
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

    // 2. Collect unique repos (deduplicate by owner/repo, not full URL)
    const repoMap = new Map<string, string>(); // key: "owner/repo", value: first URL
    for (const agent of agents) {
      if (!agent.githubUrl) continue;
      const parsed = parseOwnerRepo(agent.githubUrl);
      if (!parsed) continue;
      const key = `${parsed.owner}/${parsed.repo}`;
      if (!repoMap.has(key)) {
        repoMap.set(key, agent.githubUrl);
      }
    }

    // 3. Fetch stars/forks for each unique repo
    const repoStats = new Map<string, { stars: number; forks: number }>();
    const notFoundKeys = new Set<string>();

    for (const [repoKey] of repoMap) {
      const res = await fetch(
        `https://api.github.com/repos/${repoKey}`,
        { headers, cache: 'no-store' }
      );

      if (res.status === 404) {
        notFoundKeys.add(repoKey);
        continue;
      }
      if (!res.ok) continue;

      const data: RepoStats = await res.json();
      repoStats.set(repoKey, {
        stars: data.stargazers_count,
        forks: data.forks_count,
      });
    }

    // 4. Fetch contributor counts for each unique repo
    const repoContributors: Record<string, { contributors: number }> = {};
    for (const [repoKey] of repoMap) {
      if (notFoundKeys.has(repoKey)) continue;
      const count = await fetchContributorCount(repoKey, headers);
      repoContributors[repoKey] = { contributors: count };
    }

    // 5. Update agents with real data
    let changed = false;
    const notFound: string[] = [];
    for (const agent of agents) {
      if (!agent.githubUrl) continue;
      const parsed = parseOwnerRepo(agent.githubUrl);
      if (!parsed) continue;
      const key = `${parsed.owner}/${parsed.repo}`;

      // Clear 404 URLs
      if (notFoundKeys.has(key)) {
        notFound.push(agent.githubUrl);
        agent.githubUrl = '';
        agent.stars = 0;
        agent.forks = 0;
        changed = true;
        continue;
      }

      const stats = repoStats.get(key);
      if (stats && (agent.stars !== stats.stars || agent.forks !== stats.forks)) {
        agent.stars = stats.stars;
        agent.forks = stats.forks;
        changed = true;
      }
    }

    // 6. Commit repo-stats.json via GitHub Contents API
    const repoStatsRes = await fetch(
      githubApiUrl('contents/src/lib/data/repo-stats.json'),
      { headers, cache: 'no-store' }
    );
    let repoStatsSha = '';
    if (repoStatsRes.ok) {
      const d = await repoStatsRes.json() as { sha: string };
      repoStatsSha = d.sha;
    }

    const statsContent = Buffer.from(
      JSON.stringify(repoContributors, null, 2) + '\n'
    ).toString('base64');
    const statsBody: Record<string, unknown> = {
      message: 'chore: sync repo contributor counts',
      content: statsContent,
    };
    if (repoStatsSha) statsBody.sha = repoStatsSha;

    await fetch(
      githubApiUrl('contents/src/lib/data/repo-stats.json'),
      {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(statsBody),
      }
    );

    if (!changed) {
      return NextResponse.json({ message: 'No changes needed', repos: repoMap.size });
    }

    // 7. Commit updated agents.json back to GitHub
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
      const detail = await commitRes.text();
      return NextResponse.json(
        { error: 'Failed to commit changes', status: commitRes.status, detail },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message: 'Synced successfully',
      repos: repoMap.size,
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
