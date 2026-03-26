import type { Agent, AgentStage, Stats, SearchResult } from './types';
import { inferStages } from './stage-classifier';
import agentsData from './data/agents.json';

const agents: Agent[] = (agentsData as Omit<Agent, 'stages'>[]).map((a) => ({
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
  sort?: string;
  page?: number;
  limit?: number;
}): { items: Agent[]; total: number } {
  let filtered = [...agents];
  const { q, category, model, source, platform, stage, sort, page = 1, limit = 12 } = options ?? {};

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

  if (sort === 'name') {
    filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
  } else if (sort === 'recent') {
    filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } else {
    filtered.sort((a, b) => b.downloads - a.downloads);
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

// --- Stats ---

export function getStats(): Stats {
  const categories = new Set(agents.map((a) => a.category));
  const contributors = new Set(agents.map((a) => a.author));
  return {
    totalAgents: agents.length,
    totalCategories: categories.size,
    totalContributors: contributors.size,
    totalPlatforms: new Set(agents.map((a) => a.platform)).size,
    totalStages: 7,
  };
}
