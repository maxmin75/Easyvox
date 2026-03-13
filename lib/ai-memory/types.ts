import type { CrmEventType, MemoryKind, Prisma } from "@prisma/client";

export type ChatActor = "user" | "assistant";

export type ContextMessage = {
  role: ChatActor;
  content: string;
  createdAt: string;
};

export type ContextKnowledgeItem = {
  id: string;
  content: string;
  score: number;
};

export type BuiltChatContext = {
  customerId: string | null;
  assistantName: string;
  systemPrompt: string;
  userPrompt: string;
  knowledge: ContextKnowledgeItem[];
};

export type MemoryCandidate = {
  kind: MemoryKind;
  content: string;
  summary?: string | null;
  importanceScore: number;
  source?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

export type ProfileUpdate = {
  preferredLanguage?: string | null;
  timezone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  stage?: string | null;
  communicationStyle?: string | null;
  profileSummary?: string | null;
  goals?: string[];
  painPoints?: string[];
  traits?: string[];
};

export type MemoryUpdateResult = {
  memories: MemoryCandidate[];
  profile: ProfileUpdate | null;
  crmEvents: Array<{
    type: CrmEventType;
    title: string;
    description?: string | null;
    payload?: Prisma.InputJsonValue | null;
  }>;
};

export type ConversationSummaryResult = {
  summary: string;
  keyFacts: string[];
  openLoops: string[];
  sourceMessageCount: number;
};
