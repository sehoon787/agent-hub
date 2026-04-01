import type { Agent, AgentCategory, AgentModel, AgentPlatform, AgentSource, AgentStage, RepoSummary, Stats, SearchResult, NewsItem } from './types';
import { inferStages } from './stage-classifier';
import { getDb } from '@/db';
import newsData from './data/news.json';
import repoStatsData from './data/repo-stats.json';

function mapRowToAgent(row: Record<string, unknown>): Agent {
  const raw = {
    id: row.id as number,
    slug: row.slug as string,
    name: row.name as string,
    displayName: row.display_name as string,
    description: row.description as string,
    longDescription: (row.long_description as string) || '',
    category: row.category as AgentCategory,
    model: row.model as AgentModel,
    source: (row.source as AgentSource) || 'community',
    platform: row.platform as AgentPlatform,
    author: (row.author as string) || '',
    githubUrl: (row.github_url as string) || '',
    installCommand: (row.install_command as string) || '',
    capabilities: (row.capabilities as string[]) || [],
    tools: (row.tools as string[]) || [],
    tags: (row.tags as string[]) || [],
    stars: (row.stars as number) || 0,
    forks: (row.forks as number) || 0,
    featured: (row.featured as boolean) || false,
    verified: (row.verified as boolean) || false,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
  return { ...raw, stages: inferStages(raw) };
}

// --- Agents ---

export async function getAgents(options?: {
  q?: string;
  category?: string;
  model?: string;
  source?: string;
  platform?: string;
  stage?: string;
  repo?: string;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: Agent[]; total: number }> {
  if (!process.env.DATABASE_URL) return { items: [], total: 0 };

  const sql = getDb();
  const { q, category, model, source, platform, stage, repo, sort, page = 1, limit: rawLimit = 12 } = options ?? {};
  const limit = Math.min(Math.max(1, rawLimit), 100);
  const offset = (page - 1) * limit;

  const rows = await sql`SELECT * FROM agents ORDER BY stars DESC`;
  let agents = rows.map(mapRowToAgent);

  if (q) {
    const lower = q.toLowerCase();
    agents = agents.filter(
      (a) =>
        a.name.toLowerCase().includes(lower) ||
        a.displayName.toLowerCase().includes(lower) ||
        a.description.toLowerCase().includes(lower) ||
        a.tags.some((t) => t.toLowerCase().includes(lower)) ||
        a.author?.toLowerCase().includes(lower)
    );
  }
  if (category) agents = agents.filter((a) => a.category === category);
  if (model) agents = agents.filter((a) => a.model === model);
  if (source) agents = agents.filter((a) => a.source === source);
  if (platform) agents = agents.filter((a) => a.platform === platform);
  if (repo) agents = agents.filter((a) => a.githubUrl?.includes(`github.com/${repo}`));

  if (sort === 'name') {
    agents.sort((a, b) => a.displayName.localeCompare(b.displayName));
  } else if (sort === 'recent') {
    agents.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } else {
    agents.sort((a, b) => b.stars - a.stars);
  }

  if (stage) {
    const validStages = new Set(['discover', 'plan', 'implement', 'review', 'verify', 'debug', 'operate']);
    if (validStages.has(stage)) {
      agents = agents.filter((a) => a.stages.includes(stage as AgentStage));
    }
  }

  const total = agents.length;
  const items = agents.slice(offset, offset + limit);
  return { items, total };
}

export async function getAgent(slug: string): Promise<Agent | undefined> {
  if (!process.env.DATABASE_URL) return undefined;
  const sql = getDb();
  const rows = await sql`SELECT * FROM agents WHERE slug = ${slug}`;
  if (rows.length === 0) return undefined;
  return mapRowToAgent(rows[0]);
}

export async function getFeaturedAgents(limit = 6): Promise<Agent[]> {
  if (!process.env.DATABASE_URL) return [];
  const sql = getDb();
  const rows = await sql`SELECT * FROM agents ORDER BY stars DESC`;
  const agents = rows.map(mapRowToAgent);

  const FEATURED_BOOST = 50000;
  const sorted = [...agents].sort(
    (a, b) => (b.stars + (b.featured ? FEATURED_BOOST : 0)) - (a.stars + (a.featured ? FEATURED_BOOST : 0))
  );

  const result: Agent[] = [];
  const pickedSlugs = new Set<string>();
  const pickedRepos = new Set<string>();

  const getRepo = (a: Agent) =>
    a.githubUrl?.match(/github\.com\/([^/]+\/[^/]+)/)?.[1] ?? '';

  // Pass 1: pick greedily, one agent per unique repo
  for (const a of sorted) {
    if (result.length >= limit) break;
    const repo = getRepo(a);
    if (pickedRepos.has(repo)) continue;
    result.push(a);
    pickedSlugs.add(a.slug);
    if (repo) pickedRepos.add(repo);
  }

  // Pass 2: if still short, allow duplicate repos but prefer different platforms
  if (result.length < limit) {
    const pickedPlatforms = new Set(result.map((a) => a.platform));
    for (const a of sorted) {
      if (result.length >= limit) break;
      if (pickedSlugs.has(a.slug)) continue;
      if (!pickedPlatforms.has(a.platform)) {
        result.push(a);
        pickedSlugs.add(a.slug);
        pickedPlatforms.add(a.platform);
      }
    }
  }

  // Pass 3: final fallback — fill by boosted-star order
  for (const a of sorted) {
    if (result.length >= limit) break;
    if (!pickedSlugs.has(a.slug)) {
      result.push(a);
      pickedSlugs.add(a.slug);
    }
  }

  return result.slice(0, limit);
}

export async function getRecentAgents(limit = 6): Promise<Agent[]> {
  if (!process.env.DATABASE_URL) return [];
  const sql = getDb();
  const rows = await sql`SELECT * FROM agents ORDER BY created_at DESC LIMIT 50`;
  const agents = rows.map(mapRowToAgent);

  const sorted = [...agents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const result: Agent[] = [];
  const pickedSlugs = new Set<string>();
  const pickedRepos = new Set<string>();

  const getRepo = (a: Agent) =>
    a.githubUrl?.match(/github\.com\/([^/]+\/[^/]+)/)?.[1] ?? '';

  // Pass 1: most recent agent from each unique repo
  for (const a of sorted) {
    if (result.length >= limit) break;
    const repo = getRepo(a);
    if (pickedRepos.has(repo)) continue;
    result.push(a);
    pickedSlugs.add(a.slug);
    if (repo) pickedRepos.add(repo);
  }

  // Pass 2: fill remaining slots with next most recent (duplicates allowed)
  for (const a of sorted) {
    if (result.length >= limit) break;
    if (!pickedSlugs.has(a.slug)) {
      result.push(a);
      pickedSlugs.add(a.slug);
    }
  }

  return result;
}

export async function getRelatedAgents(slug: string, limit = 3): Promise<Agent[]> {
  const agent = await getAgent(slug);
  if (!agent) return [];
  if (!process.env.DATABASE_URL) return [];
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM agents
    WHERE slug != ${slug} AND (category = ${agent.category} OR model = ${agent.model})
    LIMIT ${limit}
  `;
  return rows.map(mapRowToAgent);
}

export async function getAllAgentSlugs(): Promise<string[]> {
  if (!process.env.DATABASE_URL) return [];
  const sql = getDb();
  const rows = await sql`SELECT slug FROM agents`;
  return rows.map((r) => r.slug as string);
}

export async function getTopAgentsByStars(limit = 10): Promise<Agent[]> {
  if (!process.env.DATABASE_URL) return [];
  const sql = getDb();
  const rows = await sql`SELECT * FROM agents ORDER BY stars DESC LIMIT ${limit}`;
  return rows.map(mapRowToAgent);
}

export async function getTopRepositories(limit = 10): Promise<RepoSummary[]> {
  if (!process.env.DATABASE_URL) return [];
  const sql = getDb();
  const rows = await sql`SELECT slug, display_name, github_url, stars, forks, platform FROM agents WHERE github_url != '' AND github_url IS NOT NULL`;

  const repoMap = new Map<string, { agents: { stars: number; forks: number; platform: AgentPlatform }[]; githubUrl: string }>();

  for (const r of rows) {
    const githubUrl = r.github_url as string;
    const match = githubUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    if (!match) continue;
    const key = match[1];
    if (!repoMap.has(key)) {
      repoMap.set(key, { agents: [], githubUrl: `https://github.com/${key}` });
    }
    repoMap.get(key)!.agents.push({
      stars: (r.stars as number) || 0,
      forks: (r.forks as number) || 0,
      platform: r.platform as AgentPlatform,
    });
  }

  return Array.from(repoMap.entries())
    .map(([key, { agents: repoAgents, githubUrl }]) => ({
      repoKey: key,
      repoName: key.split('/')[1],
      githubUrl,
      stars: Math.max(...repoAgents.map((a) => a.stars)),
      forks: Math.max(...repoAgents.map((a) => a.forks)),
      agentCount: repoAgents.length,
      platforms: [...new Set(repoAgents.map((a) => a.platform))] as AgentPlatform[],
    }))
    .sort((a, b) => b.stars - a.stars)
    .slice(0, limit);
}

// --- Search ---

export async function searchAll(q: string): Promise<SearchResult[]> {
  if (!process.env.DATABASE_URL) return [];
  const sql = getDb();
  const pattern = `%${q}%`;
  const rows = await sql`
    SELECT slug, name, display_name, description FROM agents
    WHERE name ILIKE ${pattern} OR display_name ILIKE ${pattern} OR description ILIKE ${pattern}
    LIMIT 50
  `;
  return rows.map((r) => ({
    type: 'agent' as const,
    slug: r.slug as string,
    name: r.name as string,
    displayName: r.display_name as string,
    description: r.description as string,
  }));
}

// --- News / Releases ---

export function getNews(): NewsItem[] {
  return (newsData as NewsItem[]).sort(
    (a, b) => b.publishedAt.localeCompare(a.publishedAt)
  );
}

export function getNewsPaginated(options?: {
  page?: number;
  limit?: number;
  maxAgeMonths?: number;
}): { items: NewsItem[]; total: number } {
  const { page = 1, limit = 20, maxAgeMonths = 6 } = options ?? {};

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - maxAgeMonths);

  const filtered = (newsData as NewsItem[])
    .filter((n) => new Date(n.publishedAt) >= cutoff)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const total = filtered.length;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return { items, total };
}

// --- Stats ---

export async function getStats(): Promise<Stats> {
  if (!process.env.DATABASE_URL) {
    return { totalAgents: 0, totalRepositories: 0, totalPlatforms: 0, totalContributors: 0 };
  }

  const sql = getDb();

  const countRows = await sql`SELECT COUNT(*) as total FROM agents`;
  const totalAgents = Number(countRows[0].total);

  const repoRows = await sql`
    SELECT COUNT(DISTINCT substring(github_url from 'github\\.com/([^/]+/[^/]+)')) as total
    FROM agents WHERE github_url != '' AND github_url IS NOT NULL
  `;
  const totalRepositories = Number(repoRows[0].total);

  const platformRows = await sql`SELECT COUNT(DISTINCT platform) as total FROM agents`;
  const totalPlatforms = Number(platformRows[0].total);

  const repoStats = repoStatsData as Record<string, { contributors: number }>;
  const totalContributors = Object.values(repoStats).reduce(
    (sum, r) => sum + (r.contributors || 0), 0
  );
  const authorRows = await sql`SELECT COUNT(DISTINCT author) as total FROM agents`;
  const contributorCount = totalContributors > 0 ? totalContributors : Number(authorRows[0].total);

  return { totalAgents, totalRepositories, totalPlatforms, totalContributors: contributorCount };
}
