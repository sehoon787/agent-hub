import { NextRequest, NextResponse } from 'next/server';

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

    // 2. Read existing releases from DB
    const existingRows = await sql`SELECT id FROM releases`;
    const existingIds = new Set(existingRows.map((r: Record<string, unknown>) => r.id as string));

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

    // 4. Insert new items into DB
    let insertedCount = 0;
    for (const item of newItems) {
      try {
        await sql`
          INSERT INTO releases (id, repo, repo_url, tag_name, title, body, published_at, url)
          VALUES (${item.id}, ${item.repo}, ${item.repoUrl}, ${item.tagName}, ${item.title}, ${item.body || ''}, ${item.publishedAt}, ${item.url})
          ON CONFLICT (id) DO NOTHING
        `;
        insertedCount++;
      } catch { /* skip individual failures */ }
    }

    return NextResponse.json({
      message: 'Synced successfully',
      repos: repoSet.size,
      newReleases: insertedCount,
      errors,
    });
  } catch (err) {
    return NextResponse.json({ error: 'News sync failed', detail: String(err) }, { status: 500 });
  }
}
