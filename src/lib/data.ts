import type { Agent, AgentPlatform, AgentStage, RawAgent, RepoSummary, Stats, SearchResult, NewsItem } from './types';
import { inferStages } from './stage-classifier';
import agentsData from './data/agents.json';
import newsData from './data/news.json';
import repoStatsData from './data/repo-stats.json';

const agents: Agent[] = (agentsData as RawAgent[]).map((a) => ({
  ...a,
  stages: inferStages(a),
}));

// --- Agents ---

export function getAgents(options?: {
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
}): { items: Agent[]; total: number } {
  let filtered = [...agents];
  const { q, category, model, source, platform, stage, repo, sort, page = 1, limit: rawLimit = 12 } = options ?? {};
  const limit = Math.min(Math.max(1, rawLimit), 100);

  if (q) {
    const lower = q.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.name.toLowerCase().includes(lower) ||
        a.displayName.toLowerCase().includes(lower) ||
        a.description.toLowerCase().includes(lower) ||
        a.tags.some((t) => t.toLowerCase().includes(lower))
    );
  }
  if (category) filtered = filtered.filter((a) => a.category === category);
  if (model) filtered = filtered.filter((a) => a.model === model);
  if (source) filtered = filtered.filter((a) => a.source === source);
  if (platform) filtered = filtered.filter((a) => a.platform === platform);
  if (stage) filtered = filtered.filter((a) => a.stages.includes(stage as AgentStage));
  if (repo) {
    filtered = filtered.filter((a) =>
      a.githubUrl?.includes(`github.com/${repo}`)
    );
  }

  if (sort === 'name') {
    filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
  } else if (sort === 'recent') {
    filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } else {
    filtered.sort((a, b) => b.stars - a.stars);
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return { items, total };
}

export function getAgent(slug: string): Agent | undefined {
  return agents.find((a) => a.slug === slug);
}

export function getFeaturedAgents(limit = 6): Agent[] {
  const FEATURED_BOOST = 50000;

  // Sort all agents: featured ones get a star boost so they rank higher
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

export function getRecentAgents(limit = 6): Agent[] {
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

export function getRelatedAgents(slug: string, limit = 3): Agent[] {
  const agent = getAgent(slug);
  if (!agent) return [];
  return agents
    .filter((a) => a.slug !== slug && (a.category === agent.category || a.model === agent.model))
    .slice(0, limit);
}

export function getAllAgentSlugs(): string[] {
  return agents.map((a) => a.slug);
}

export function getTopAgentsByStars(limit = 10): Agent[] {
  return [...agents].sort((a, b) => b.stars - a.stars).slice(0, limit);
}

export function getTopRepositories(limit = 10): RepoSummary[] {
  const repoMap = new Map<string, { agents: Agent[]; githubUrl: string }>();

  for (const a of agents) {
    if (!a.githubUrl) continue;
    const match = a.githubUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    if (!match) continue;
    const key = match[1];
    if (!repoMap.has(key)) {
      repoMap.set(key, { agents: [], githubUrl: `https://github.com/${key}` });
    }
    repoMap.get(key)!.agents.push(a);
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

export function searchAll(q: string): SearchResult[] {
  const lower = q.toLowerCase();
  return agents
    .filter(
      (a) =>
        a.name.toLowerCase().includes(lower) ||
        a.displayName.toLowerCase().includes(lower) ||
        a.description.toLowerCase().includes(lower)
    )
    .map((a) => ({
      type: 'agent' as const,
      slug: a.slug,
      name: a.name,
      displayName: a.displayName,
      description: a.description,
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

export function getStats(): Stats {
  // Count unique repos
  const repoSet = new Set<string>();
  for (const a of agents) {
    if (!a.githubUrl) continue;
    const match = a.githubUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    if (match) repoSet.add(match[1]);
  }

  // Sum contributor counts from repo-stats.json, fallback to unique authors
  const repoStats = repoStatsData as Record<string, { contributors: number }>;
  const totalContributors = Object.values(repoStats).reduce(
    (sum, r) => sum + (r.contributors || 0), 0
  );
  const contributorCount = totalContributors > 0
    ? totalContributors
    : new Set(agents.map((a) => a.author)).size;

  return {
    totalAgents: agents.length,
    totalRepositories: repoSet.size,
    totalPlatforms: new Set(agents.map((a) => a.platform)).size,
    totalContributors: contributorCount,
  };
}
