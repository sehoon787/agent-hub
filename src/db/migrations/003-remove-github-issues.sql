-- Remove GitHub Issues dependency: drop github_issue_number column, add 'listed' status
ALTER TABLE submissions DROP COLUMN IF EXISTS github_issue_number;

-- Recreate status constraint to include 'listed'
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_status_check;
ALTER TABLE submissions ADD CONSTRAINT submissions_status_check CHECK (status IN ('pending', 'approved', 'listed', 'rejected', 'removed'));
