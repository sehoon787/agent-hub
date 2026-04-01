CREATE TABLE IF NOT EXISTS repo_stats (
  repo_key TEXT PRIMARY KEY,
  contributors INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
