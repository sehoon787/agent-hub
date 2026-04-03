export type AgentCategory = 'orchestrator' | 'specialist' | 'worker' | 'analyst';
export type AgentModel = 'opus' | 'sonnet' | 'haiku' | 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gpt-5.4' | 'gpt-5.4-mini' | 'custom';
export type AgentSource = 'official' | 'community' | 'plugin';
export type AgentPlatform = 'claude' | 'gemini' | 'codex' | 'cursor' | 'windsurf' | 'aider' | 'universal';
export type AgentStage = 'discover' | 'plan' | 'implement' | 'review' | 'verify' | 'debug' | 'operate';
export type ItemType = 'agent' | 'skill';

export interface Agent {
  id?: number;
  slug: string;
  type: ItemType;
  name: string;
  displayName: string;
  description: string;
  longDescription: string;
  category: AgentCategory;
  model: AgentModel;
  source: AgentSource;
  platform: AgentPlatform;
  /** Dynamically inferred by stage-classifier.ts — not stored in DB */
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
  forks: number;
  featured: boolean;
  verified: boolean;
}

/** Agent data as stored in DB (without computed fields) */
export type RawAgent = Omit<Agent, 'stages'>;

export interface SearchResult {
  type: 'agent' | 'skill';
  slug: string;
  name: string;
  displayName: string;
  description: string;
}

export interface Stats {
  totalAgents: number;
  totalSkills: number;
  totalRepositories: number;
  totalPlatforms: number;
  totalContributors: number;
}

export interface NewsItem {
  id: string;
  repo: string;
  repoUrl: string;
  tagName: string;
  title: string;
  body: string;
  publishedAt: string;
  url: string;
}

export interface RepoSummary {
  repoKey: string;       // "Yeachan-Heo/oh-my-claudecode"
  repoName: string;      // "oh-my-claudecode"
  githubUrl: string;     // "https://github.com/Yeachan-Heo/oh-my-claudecode"
  stars: number;
  forks: number;
  agentCount: number;
  platforms: AgentPlatform[];
}
