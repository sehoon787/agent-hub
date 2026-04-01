-- Migration 004: Create agents table for JSON→DB migration
-- Replaces agents.json as the source of truth for agent data

CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT DEFAULT '',
  category TEXT NOT NULL,
  model TEXT NOT NULL,
  platform TEXT NOT NULL,
  source TEXT DEFAULT 'community',
  author TEXT NOT NULL,
  github_url TEXT DEFAULT '',
  install_command TEXT DEFAULT '',
  capabilities TEXT[] DEFAULT '{}',
  tools TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category);
CREATE INDEX IF NOT EXISTS idx_agents_platform ON agents(platform);
CREATE INDEX IF NOT EXISTS idx_agents_model ON agents(model);
CREATE INDEX IF NOT EXISTS idx_agents_stars ON agents(stars DESC);
CREATE INDEX IF NOT EXISTS idx_agents_featured ON agents(featured) WHERE featured = true;
