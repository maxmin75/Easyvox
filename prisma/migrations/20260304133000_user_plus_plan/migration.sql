-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanTier') THEN
    CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PLUS');
  END IF;
END $$;

-- AlterTable
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "plan_tier" "PlanTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN IF NOT EXISTS "plus_purchased_at" TIMESTAMP(3);
