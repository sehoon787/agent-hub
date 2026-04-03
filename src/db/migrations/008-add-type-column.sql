ALTER TABLE agents ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'agent' NOT NULL;
ALTER TABLE agents ADD CONSTRAINT agents_type_check CHECK (type IN ('agent', 'skill'));
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'agent' NOT NULL;
