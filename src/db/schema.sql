-- 1. Users (auto-created on GitHub OAuth login)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  github_id TEXT UNIQUE NOT NULL,
  login TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Favorites
CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  agent_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, agent_slug)
);
CREATE INDEX idx_favorites_user ON favorites(user_id);

-- 3. Submissions (DB-primary, no GitHub Issues dependency)
CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT DEFAULT '',
  category TEXT NOT NULL,
  model TEXT NOT NULL,
  platform TEXT NOT NULL,
  author TEXT NOT NULL,
  github_url TEXT DEFAULT '',
  install_command TEXT DEFAULT '',
  capabilities TEXT DEFAULT '',
  tools TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'listed', 'rejected', 'removed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_slug ON submissions(slug);

-- 4. Agents (migrated from agents.json)
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
