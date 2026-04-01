CREATE TABLE IF NOT EXISTS releases (
  id TEXT PRIMARY KEY,
  repo TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  published_at TIMESTAMPTZ NOT NULL,
  url TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_releases_published ON releases(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_releases_repo ON releases(repo);
