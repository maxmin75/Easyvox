ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS purchase_email_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
  ADD COLUMN IF NOT EXISTS purchase_email_from TEXT,
  ADD COLUMN IF NOT EXISTS purchase_email_reply_to TEXT,
  ADD COLUMN IF NOT EXISTS purchase_email_subject_template TEXT,
  ADD COLUMN IF NOT EXISTS purchase_email_body_template TEXT,
  ADD COLUMN IF NOT EXISTS purchase_intent_keywords TEXT;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS purchase_intent_detected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purchase_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purchase_email_error TEXT;
