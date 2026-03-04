CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  session_id TEXT,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  timezone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_client_id
  ON appointments(client_id);

CREATE INDEX IF NOT EXISTS idx_appointments_client_scheduled
  ON appointments(client_id, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_appointments_client_session
  ON appointments(client_id, session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO app_user;

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointments_tenant_policy ON appointments;
CREATE POLICY appointments_tenant_policy ON appointments
  FOR ALL
  USING (client_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (client_id = current_setting('app.tenant_id', true)::uuid);
