-- Migration: Expand submissions table for DB-primary conversion
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS long_description TEXT DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS author TEXT NOT NULL DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS github_url TEXT DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS install_command TEXT DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS capabilities TEXT DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tools TEXT DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '';
-- Make github_issue_number nullable (submission might exist without an issue)
ALTER TABLE submissions ALTER COLUMN github_issue_number DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_slug ON submissions(slug);
