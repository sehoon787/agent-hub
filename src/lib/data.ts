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

export function getFeaturedAgents(): Agent[] {
  return agents.filter((a) => a.featured);
}

export function getRecentAgents(limit = 6): Agent[] {
  return [...agents]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
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
