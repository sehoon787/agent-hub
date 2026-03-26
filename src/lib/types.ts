export type AgentCategory = 'orchestrator' | 'specialist' | 'worker' | 'analyst';
export type AgentModel = 'opus' | 'sonnet' | 'haiku' | 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gpt-5.4' | 'gpt-5.4-mini' | 'custom';
export type AgentSource = 'official' | 'community' | 'plugin';
export type AgentPlatform = 'claude' | 'gemini' | 'codex' | 'cursor' | 'windsurf' | 'aider' | 'universal';
export type AgentStage = 'discover' | 'plan' | 'implement' | 'review' | 'verify' | 'debug' | 'operate';

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
  /** Dynamically inferred by stage-classifier.ts — not stored in agents.json */
  stages: AgentStage[];
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

/** Agent data as stored in agents.json (without computed fields) */
export type RawAgent = Omit<Agent, 'stages'>;

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
  totalPlatforms: number;
  totalStages: number;
}
