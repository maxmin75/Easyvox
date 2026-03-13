CREATE TABLE IF NOT EXISTS chat_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_session_id TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS chat_customers_client_id_normalized_name_key
  ON chat_customers(client_id, normalized_name);

CREATE INDEX IF NOT EXISTS idx_chat_customers_client_id
  ON chat_customers(client_id);

CREATE INDEX IF NOT EXISTS idx_chat_customers_client_email
  ON chat_customers(client_id, email);

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES chat_customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_client_customer
  ON conversations(client_id, customer_id);

CREATE OR REPLACE FUNCTION set_chat_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_customers_updated_at ON chat_customers;

CREATE TRIGGER trg_chat_customers_updated_at
BEFORE UPDATE ON chat_customers
FOR EACH ROW
EXECUTE FUNCTION set_chat_customers_updated_at();
