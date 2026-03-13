CREATE TABLE "quotes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "client_id" UUID NOT NULL,
  "session_id" TEXT,
  "customer_name" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "support" TEXT NOT NULL,
  "ai_type" TEXT NOT NULL,
  "training" TEXT NOT NULL,
  "customizations" TEXT,
  "setup_initial" INTEGER NOT NULL,
  "monthly_cost" INTEGER NOT NULL,
  "training_cost" INTEGER NOT NULL,
  "email_sent_to_customer" BOOLEAN NOT NULL DEFAULT false,
  "email_sent_to_internal" BOOLEAN NOT NULL DEFAULT false,
  "email_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "quotes_client_id_idx" ON "quotes"("client_id");
CREATE INDEX "quotes_client_id_session_id_idx" ON "quotes"("client_id", "session_id");

ALTER TABLE "quotes"
ADD CONSTRAINT "quotes_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
