-- Migrate any existing 'approved' submissions to 'listed'
UPDATE submissions SET status = 'listed' WHERE status = 'approved';

-- Replace CHECK constraint to remove 'approved'
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_status_check;
ALTER TABLE submissions ADD CONSTRAINT submissions_status_check
  CHECK (status IN ('pending', 'listed', 'rejected', 'removed'));
