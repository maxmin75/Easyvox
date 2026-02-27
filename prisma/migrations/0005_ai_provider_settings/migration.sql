ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS ai_provider TEXT,
  ADD COLUMN IF NOT EXISTS ollama_base_url TEXT,
  ADD COLUMN IF NOT EXISTS ollama_chat_model TEXT,
  ADD COLUMN IF NOT EXISTS ollama_embedding_model TEXT;
