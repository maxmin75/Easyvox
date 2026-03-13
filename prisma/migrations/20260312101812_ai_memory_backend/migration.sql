CREATE TYPE "MemoryKind" AS ENUM ('SHORT_TERM', 'LONG_TERM', 'PROFILE');
CREATE TYPE "CrmEventType" AS ENUM ('CHAT_MESSAGE', 'PROFILE_UPDATED', 'MEMORY_CAPTURED', 'SUMMARY_UPDATED', 'LEAD_CAPTURED');

CREATE TABLE "customer_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "preferred_language" TEXT,
    "timezone" TEXT,
    "company" TEXT,
    "job_title" TEXT,
    "stage" TEXT,
    "goals" JSONB,
    "pain_points" JSONB,
    "traits" JSONB,
    "communication_style" TEXT,
    "profile_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "memory_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "conversation_id" UUID,
    "kind" "MemoryKind" NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "importance_score" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "source" TEXT,
    "metadata" JSONB,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversation_summaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "customer_id" UUID,
    "session_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "key_facts" JSONB,
    "open_loops" JSONB,
    "source_message_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_summaries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "customer_id" UUID,
    "session_id" TEXT,
    "type" "CrmEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "payload" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_profiles_customer_id_key" ON "customer_profiles"("customer_id");
CREATE INDEX "customer_profiles_client_id_idx" ON "customer_profiles"("client_id");
CREATE INDEX "memory_entries_client_id_customer_id_kind_idx" ON "memory_entries"("client_id", "customer_id", "kind");
CREATE INDEX "memory_entries_client_id_last_used_at_idx" ON "memory_entries"("client_id", "last_used_at");
CREATE INDEX "memory_entries_conversation_id_idx" ON "memory_entries"("conversation_id");
CREATE UNIQUE INDEX "conversation_summaries_client_id_session_id_key" ON "conversation_summaries"("client_id", "session_id");
CREATE INDEX "conversation_summaries_client_id_customer_id_idx" ON "conversation_summaries"("client_id", "customer_id");
CREATE INDEX "crm_events_client_id_occurred_at_idx" ON "crm_events"("client_id", "occurred_at");
CREATE INDEX "crm_events_client_id_customer_id_type_idx" ON "crm_events"("client_id", "customer_id", "type");

ALTER TABLE "customer_profiles"
    ADD CONSTRAINT "customer_profiles_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_profiles"
    ADD CONSTRAINT "customer_profiles_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "chat_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "memory_entries"
    ADD CONSTRAINT "memory_entries_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "memory_entries"
    ADD CONSTRAINT "memory_entries_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "chat_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "memory_entries"
    ADD CONSTRAINT "memory_entries_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "conversation_summaries"
    ADD CONSTRAINT "conversation_summaries_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversation_summaries"
    ADD CONSTRAINT "conversation_summaries_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "chat_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_events"
    ADD CONSTRAINT "crm_events_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_events"
    ADD CONSTRAINT "crm_events_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "chat_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
