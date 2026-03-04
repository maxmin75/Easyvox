ALTER TABLE leads
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_client_session
  ON leads(client_id, session_id);
