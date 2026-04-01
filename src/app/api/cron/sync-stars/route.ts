import { NextRequest, NextResponse } from 'next/server';
import { githubApiUrl } from '@/lib/github-api';
import { getDb } from '@/db';

interface RepoStats {
  stargazers_count: number;
  forks_count: number;
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

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const sql = getDb();

  try {
    // 1. Get unique repos from DB
    const repoRows = await sql`
      SELECT DISTINCT substring(github_url from 'github\\.com/([^/]+/[^/]+)') as repo_key
      FROM agents
      WHERE github_url != '' AND github_url IS NOT NULL
    `;

    const repoKeys = repoRows
      .map(r => r.repo_key as string)
      .filter(Boolean);

    // 2. Fetch stars/forks for each unique repo
    const repoStats = new Map<string, { stars: number; forks: number }>();
    const notFoundKeys = new Set<string>();

    for (const repoKey of repoKeys) {
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

    // 3. Fetch contributor counts for each unique repo
    const repoContributors: Record<string, { contributors: number }> = {};
    for (const repoKey of repoKeys) {
      if (notFoundKeys.has(repoKey)) continue;
      const count = await fetchContributorCount(repoKey, headers);
      repoContributors[repoKey] = { contributors: count };
    }

    // 4. Update agents in DB
    let updated = 0;
    const notFound: string[] = [];

    for (const [repoKey, stats] of repoStats) {
      const pattern = `%github.com/${repoKey}%`;
      await sql`
        UPDATE agents SET stars = ${stats.stars}, forks = ${stats.forks}, updated_at = NOW()
        WHERE github_url LIKE ${pattern}
      `;
      updated++;
    }

    // Clear 404 repos
    for (const repoKey of notFoundKeys) {
      notFound.push(repoKey);
      const pattern = `%github.com/${repoKey}%`;
      await sql`
        UPDATE agents SET github_url = '', stars = 0, forks = 0, updated_at = NOW()
        WHERE github_url LIKE ${pattern}
      `;
    }

    // 5. Commit repo-stats.json via GitHub Contents API (keep for contributor stats)
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

    return NextResponse.json({
      message: 'Synced successfully',
      repos: repoKeys.length,
      updated,
      notFound,
    });
  } catch {
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
