ALTER TABLE file_assets
  ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_file_assets_client_session
  ON file_assets(client_id, session_id);
