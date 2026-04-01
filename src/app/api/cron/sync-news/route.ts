import { NextRequest, NextResponse } from 'next/server';
import { githubApiUrl } from '@/lib/github-api';

export const maxDuration = 60;

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

interface TagEntry {
  name: string;
  commit: { sha: string; url: string };
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
    // 1. Get unique repo URLs from DB
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { getDb } = await import('@/db');
    const sql = getDb();

    const repoRows = await sql`
      SELECT DISTINCT substring(github_url from 'github\\.com/([^/]+/[^/]+)') as repo_key
      FROM agents
      WHERE github_url != '' AND github_url IS NOT NULL
    `;

    const repoSet = new Map<string, string>();
    for (const r of repoRows) {
      const key = r.repo_key as string;
      if (key) {
        repoSet.set(key, `https://github.com/${key}`);
      }
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
    const errors: string[] = [];

    const repoEntries = [...repoSet.entries()];
    const BATCH_SIZE = 10;

    for (let i = 0; i < repoEntries.length; i += BATCH_SIZE) {
      const batch = repoEntries.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async ([repoKey, repoUrl]) => {
          const releasesRes = await fetch(
            `https://api.github.com/repos/${repoKey}/releases?per_page=5`,
            { headers, cache: 'no-store' }
          );

          if (!releasesRes.ok) {
            errors.push(`${repoKey}: releases HTTP ${releasesRes.status}`);
            return;
          }

          const releases: ReleaseEntry[] = await releasesRes.json();

          // If no releases, try tags as fallback
          if (releases.length === 0) {
            const tagsRes = await fetch(
              `https://api.github.com/repos/${repoKey}/tags?per_page=5`,
              { headers, cache: 'no-store' }
            );
            if (tagsRes.ok) {
              const tags: TagEntry[] = await tagsRes.json();
              for (const tag of tags) {
                const id = `${repoKey}:${tag.name}`;
                if (existingIds.has(id)) continue;
                newItems.push({
                  id,
                  repo: repoKey,
                  repoUrl,
                  tagName: tag.name,
                  title: tag.name,
                  body: '',
                  publishedAt: new Date().toISOString(),
                  url: `https://github.com/${repoKey}/releases/tag/${tag.name}`,
                });
                existingIds.add(id);
              }
            }
            return;
          }

          for (const release of releases) {
            const id = `${repoKey}:${release.tag_name}`;
            if (existingIds.has(id)) continue;
            newItems.push({
              id,
              repo: repoKey,
              repoUrl,
              tagName: release.tag_name,
              title: release.name || release.tag_name,
              body: (release.body || '').slice(0, 200),
              publishedAt: release.published_at,
              url: release.html_url,
            });
            existingIds.add(id);
          }
        })
      );

      // Collect errors from rejected promises
      for (const result of results) {
        if (result.status === 'rejected') {
          errors.push(String(result.reason));
        }
      }
    }

    if (newItems.length === 0) {
      return NextResponse.json({
        message: 'No new releases found',
        repos: repoSet.size,
        repoKeys: [...repoSet.keys()],
        errors,
      });
    }

    // 4. Merge, sort by date, keep max 100
    const merged = [...existingNews, ...newItems]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 100);

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
      const detail = await commitRes.text();
      return NextResponse.json(
        { error: 'Failed to commit news.json', status: commitRes.status, detail },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message: 'Synced successfully',
      repos: repoSet.size,
      newReleases: newItems.length,
      total: merged.length,
      errors,
    });
  } catch (err) {
    return NextResponse.json({ error: 'News sync failed', detail: String(err) }, { status: 500 });
  }
}
