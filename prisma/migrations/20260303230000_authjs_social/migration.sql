ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email_verified TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS image TEXT;

ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE IF NOT EXISTS auth_accounts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_accounts_provider_provider_account_id_key
  ON auth_accounts(provider, provider_account_id);
CREATE INDEX IF NOT EXISTS auth_accounts_user_id_idx
  ON auth_accounts(user_id);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx
  ON auth_sessions(user_id);

CREATE TABLE IF NOT EXISTS auth_verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_verification_tokens_identifier_token_key
  ON auth_verification_tokens(identifier, token);
