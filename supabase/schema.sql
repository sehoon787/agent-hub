-- Submissions table for user-submitted agents
CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT,
  category TEXT NOT NULL CHECK (category IN ('orchestrator', 'specialist', 'worker', 'analyst')),
  model TEXT NOT NULL CHECK (model IN ('opus', 'sonnet', 'haiku')),
  source TEXT NOT NULL DEFAULT 'community',
  author TEXT NOT NULL,
  github_url TEXT,
  install_command TEXT,
  capabilities TEXT[] DEFAULT '{}',
  tools TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by TEXT NOT NULL,
  submitted_by_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_category ON submissions(category);
CREATE INDEX idx_submissions_slug ON submissions(slug);

-- Enable RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read approved submissions
CREATE POLICY "approved_readable" ON submissions
  FOR SELECT USING (status = 'approved');

-- Policy: authenticated users can insert
CREATE POLICY "authenticated_insert" ON submissions
  FOR INSERT WITH CHECK (true);

-- Page views tracking
CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY DEFAULT 1,
  count BIGINT NOT NULL DEFAULT 0,
  CHECK (id = 1)
);

INSERT INTO page_views (id, count) VALUES (1, 0) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS daily_views (
  date DATE PRIMARY KEY,
  count BIGINT NOT NULL DEFAULT 0
);

-- Enable RLS for view tables
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_views ENABLE ROW LEVEL SECURITY;

-- RPC functions for atomic increment
CREATE OR REPLACE FUNCTION increment_total_views()
RETURNS void AS $$
  UPDATE page_views SET count = count + 1 WHERE id = 1;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION increment_daily_views(view_date DATE)
RETURNS void AS $$
  INSERT INTO daily_views (date, count) VALUES (view_date, 1)
  ON CONFLICT (date) DO UPDATE SET count = daily_views.count + 1;
$$ LANGUAGE sql;

-- Allow anonymous reads/writes for view counting
CREATE POLICY "public_views_read" ON page_views FOR SELECT USING (true);
CREATE POLICY "public_views_insert" ON page_views FOR UPDATE USING (true);
CREATE POLICY "public_daily_read" ON daily_views FOR SELECT USING (true);
CREATE POLICY "public_daily_insert" ON daily_views FOR INSERT WITH CHECK (true);
CREATE POLICY "public_daily_update" ON daily_views FOR UPDATE USING (true);
