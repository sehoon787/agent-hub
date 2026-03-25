export type AgentCategory = 'orchestrator' | 'specialist' | 'worker' | 'analyst';
export type AgentModel = 'opus' | 'sonnet' | 'haiku';
export type AgentSource = 'official' | 'community' | 'plugin';
export type AgentPlatform = 'claude' | 'gemini' | 'codex' | 'universal';

export interface Agent {
  slug: string;
  name: string;
  displayName: string;
  description: string;
  longDescription: string;
  category: AgentCategory;
  model: AgentModel;
  source: AgentSource;
  platform: AgentPlatform;
  author: string;
  githubUrl?: string;
  installCommand: string;
  capabilities: string[];
  tools: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  stars: number;
  downloads: number;
  featured: boolean;
  verified: boolean;
}

export interface SearchResult {
  type: 'agent';
  slug: string;
  name: string;
  displayName: string;
  description: string;
}

export interface Stats {
  totalAgents: number;
  totalCategories: number;
  totalContributors: number;
  totalDownloads: number;
}
