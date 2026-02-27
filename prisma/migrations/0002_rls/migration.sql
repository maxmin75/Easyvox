DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_user') THEN
    CREATE ROLE admin_user NOINHERIT;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO app_user, admin_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON documents, chunks, conversations, leads, feedback TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON clients TO admin_user;
GRANT SELECT ON clients TO app_user;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

ALTER TABLE documents FORCE ROW LEVEL SECURITY;
ALTER TABLE chunks FORCE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;
ALTER TABLE feedback FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_tenant_policy ON documents;
DROP POLICY IF EXISTS chunks_tenant_policy ON chunks;
DROP POLICY IF EXISTS conversations_tenant_policy ON conversations;
DROP POLICY IF EXISTS leads_tenant_policy ON leads;
DROP POLICY IF EXISTS feedback_tenant_policy ON feedback;

CREATE POLICY documents_tenant_policy ON documents
  FOR ALL
  USING (client_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (client_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY chunks_tenant_policy ON chunks
  FOR ALL
  USING (client_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (client_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY conversations_tenant_policy ON conversations
  FOR ALL
  USING (client_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (client_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY leads_tenant_policy ON leads
  FOR ALL
  USING (client_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (client_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY feedback_tenant_policy ON feedback
  FOR ALL
  USING (client_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (client_id = current_setting('app.tenant_id', true)::uuid);
