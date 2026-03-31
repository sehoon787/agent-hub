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

-- 3. Submissions metadata
CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  github_issue_number INTEGER UNIQUE,
  slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_submissions_user ON submissions(user_id);
