CREATE TABLE IF NOT EXISTS file_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  blob_url TEXT NOT NULL,
  blob_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_assets_client_id ON file_assets(client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON file_assets TO app_user;

ALTER TABLE file_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_assets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS file_assets_tenant_policy ON file_assets;
CREATE POLICY file_assets_tenant_policy ON file_assets
  FOR ALL
  USING (client_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (client_id = current_setting('app.tenant_id', true)::uuid);
