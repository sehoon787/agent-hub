import { NextRequest, NextResponse } from 'next/server';
import { githubApiUrl } from '@/lib/github-api';

interface ReleaseEntry {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
}

interface NewsItem {
  id: string;
  repo: string;
  repoUrl: string;
  tagName: string;
  title: string;
  body: string;
  publishedAt: string;
  url: string;
}

interface AgentEntry {
  githubUrl: string;
  [key: string]: unknown;
}

function parseOwnerRepo(githubUrl: string): { owner: string; repo: string } | null {
  const match = githubUrl.match(/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

export async function GET(request: NextRequest) {
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
    // 1. Read agents.json to get unique repo URLs
    const agentsRes = await fetch(
      githubApiUrl('contents/src/lib/data/agents.json'),
      { headers, cache: 'no-store' }
    );
    if (!agentsRes.ok) {
      return NextResponse.json({ error: 'Failed to read agents.json' }, { status: 502 });
    }
    const agentsData = await agentsRes.json();
    const agents: AgentEntry[] = JSON.parse(
      Buffer.from(agentsData.content, 'base64').toString('utf-8')
    );

    const urlSet = new Set<string>();
    for (const agent of agents) {
      if (agent.githubUrl) urlSet.add(agent.githubUrl);
    }

    // 2. Read existing news.json
    const newsRes = await fetch(
      githubApiUrl('contents/src/lib/data/news.json'),
      { headers, cache: 'no-store' }
    );
    let existingNews: NewsItem[] = [];
    let newsSha = '';
    if (newsRes.ok) {
      const newsData = await newsRes.json();
      newsSha = newsData.sha;
      existingNews = JSON.parse(
        Buffer.from(newsData.content, 'base64').toString('utf-8')
      );
    }

    const existingIds = new Set(existingNews.map((n) => n.id));

    // 3. Fetch releases for each unique repo
    const newItems: NewsItem[] = [];

    for (const url of urlSet) {
      const parsed = parseOwnerRepo(url);
      if (!parsed) continue;

      const releasesRes = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/releases?per_page=3`,
        { headers, cache: 'no-store' }
      );
      if (!releasesRes.ok) continue;

      const releases: ReleaseEntry[] = await releasesRes.json();
      for (const release of releases) {
        const id = `${parsed.owner}/${parsed.repo}:${release.tag_name}`;
        if (existingIds.has(id)) continue;

        newItems.push({
          id,
          repo: `${parsed.owner}/${parsed.repo}`,
          repoUrl: url,
          tagName: release.tag_name,
          title: release.name || release.tag_name,
          body: (release.body || '').slice(0, 200),
          publishedAt: release.published_at,
          url: release.html_url,
        });
        existingIds.add(id);
      }
    }

    if (newItems.length === 0) {
      return NextResponse.json({ message: 'No new releases found', repos: urlSet.size });
    }

    // 4. Merge, sort by date, keep max 20
    const merged = [...existingNews, ...newItems]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 20);

    // 5. Commit news.json
    const updatedContent = Buffer.from(
      JSON.stringify(merged, null, 2) + '\n'
    ).toString('base64');

    const commitBody: Record<string, unknown> = {
      message: 'chore: sync release news',
      content: updatedContent,
    };
    if (newsSha) {
      commitBody.sha = newsSha;
    }

    const commitRes = await fetch(
      githubApiUrl('contents/src/lib/data/news.json'),
      {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(commitBody),
      }
    );

    if (!commitRes.ok) {
      return NextResponse.json({ error: 'Failed to commit news.json' }, { status: 502 });
    }

    return NextResponse.json({
      message: 'Synced successfully',
      repos: urlSet.size,
      newReleases: newItems.length,
      total: merged.length,
    });
  } catch {
    return NextResponse.json({ error: 'News sync failed' }, { status: 500 });
  }
}
