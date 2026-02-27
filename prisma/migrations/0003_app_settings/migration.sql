CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  singleton TEXT NOT NULL UNIQUE DEFAULT 'default',
  openai_api_key TEXT,
  openai_chat_model TEXT,
  openai_embedding_model TEXT,
  app_base_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton_check CHECK (id = 1)
);

INSERT INTO app_settings (id, singleton)
VALUES (1, 'default')
ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON app_settings TO app_user;
GRANT SELECT, INSERT, UPDATE ON app_settings TO admin_user;
