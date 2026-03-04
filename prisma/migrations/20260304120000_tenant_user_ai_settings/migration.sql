-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientUserRole') THEN
    CREATE TYPE "ClientUserRole" AS ENUM ('OWNER', 'MEMBER');
  END IF;
END $$;

-- AlterTable
ALTER TABLE "clients"
ADD COLUMN IF NOT EXISTS "require_user_auth_for_chat" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "client_users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "client_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" "ClientUserRole" NOT NULL DEFAULT 'MEMBER',
  "last_chat_login_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "client_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_ai_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "client_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "ai_provider" TEXT,
  "openai_api_key" TEXT,
  "openai_chat_model" TEXT,
  "openai_embedding_model" TEXT,
  "ollama_base_url" TEXT,
  "ollama_chat_model" TEXT,
  "ollama_embedding_model" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_ai_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "client_users_client_id_user_id_key" ON "client_users"("client_id", "user_id");
CREATE INDEX IF NOT EXISTS "client_users_user_id_idx" ON "client_users"("user_id");
CREATE INDEX IF NOT EXISTS "client_users_client_id_role_idx" ON "client_users"("client_id", "role");

CREATE UNIQUE INDEX IF NOT EXISTS "user_ai_settings_client_id_user_id_key" ON "user_ai_settings"("client_id", "user_id");
CREATE INDEX IF NOT EXISTS "user_ai_settings_user_id_idx" ON "user_ai_settings"("user_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_users_client_id_fkey'
  ) THEN
    ALTER TABLE "client_users"
      ADD CONSTRAINT "client_users_client_id_fkey"
      FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_users_user_id_fkey'
  ) THEN
    ALTER TABLE "client_users"
      ADD CONSTRAINT "client_users_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_ai_settings_client_id_fkey'
  ) THEN
    ALTER TABLE "user_ai_settings"
      ADD CONSTRAINT "user_ai_settings_client_id_fkey"
      FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_ai_settings_user_id_fkey'
  ) THEN
    ALTER TABLE "user_ai_settings"
      ADD CONSTRAINT "user_ai_settings_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
