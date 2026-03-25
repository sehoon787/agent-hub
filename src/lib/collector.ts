/**
 * Auto-collection logic for GitHub repos.
 *
 * This module fetches agent definitions from known GitHub repositories,
 * parses markdown frontmatter, normalizes data into our models, and merges
 * with existing entries (deduplicating by slug).
 *
 * For the MVP this is invocable via /api/collect but does not run on a cron.
 * To set up Vercel Cron, add a crons array to vercel.json with
 * path "/api/collect" and schedule "0 0/6 * * *" (every 6 hours).
 */

const KNOWN_REPOS = [
  { owner: 'anthropics', repo: 'claude-code', path: 'agents' },
  { owner: 'Yeachan-Heo', repo: 'oh-my-claudecode', path: 'agents' },
  { owner: 'wshobson', repo: 'agents', path: '' },
];

interface RawEntry {
  name: string;
  description: string;
  model?: string;
  category?: string;
  source: string;
  githubUrl: string;
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return fm;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Collect agent definitions from a single GitHub repo.
 * Requires GITHUB_TOKEN env var for API access.
 */
async function fetchRepoEntries(
  owner: string,
  repo: string,
  path: string
): Promise<RawEntry[]> {
  const token = process.env.GITHUB_TOKEN;
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetch(apiUrl, { headers });
  if (!res.ok) return [];

  const files = await res.json();
  if (!Array.isArray(files)) return [];

  const entries: RawEntry[] = [];

  for (const file of files) {
    if (!file.name.endsWith('.md')) continue;

    const fileRes = await fetch(file.download_url, { headers });
    if (!fileRes.ok) continue;

    const content = await fileRes.text();
    const fm = parseFrontmatter(content);
    const name = fm.name || file.name.replace('.md', '');

    entries.push({
      name,
      description: fm.description || content.split('\n').find((l: string) => l.trim().length > 0 && !l.startsWith('#') && !l.startsWith('---')) || '',
      model: fm.model,
      category: fm.category,
      source: `${owner}/${repo}`,
      githubUrl: file.html_url,
    });
  }

  return entries;
}

/**
 * Collect from all known repos and return normalized entries.
 * Existing slugs are excluded to prevent duplicates.
 */
export async function collectAgents(existingSlugs: Set<string>): Promise<RawEntry[]> {
  const allEntries: RawEntry[] = [];

  for (const { owner, repo, path } of KNOWN_REPOS) {
    try {
      const entries = await fetchRepoEntries(owner, repo, path);
      for (const entry of entries) {
        const slug = slugify(entry.name);
        if (!existingSlugs.has(slug)) {
          allEntries.push(entry);
          existingSlugs.add(slug);
        }
      }
    } catch {
      // Skip repos that fail
    }
  }

  return allEntries;
}
