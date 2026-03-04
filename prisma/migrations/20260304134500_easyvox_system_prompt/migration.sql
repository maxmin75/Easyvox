-- AlterTable
ALTER TABLE "app_settings"
ADD COLUMN IF NOT EXISTS "easyvox_system_prompt" TEXT;
