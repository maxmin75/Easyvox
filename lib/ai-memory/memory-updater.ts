import { CrmEventType, MemoryKind, type Prisma } from "@prisma/client";
import { MAX_FACTS_PER_UPDATE } from "@/lib/ai-memory/constants";
import type { MemoryCandidate, MemoryUpdateResult, ProfileUpdate } from "@/lib/ai-memory/types";
import { clampScore, compactWhitespace, maybeStringArray } from "@/lib/ai-memory/utils";
import { generateJsonFromOpenAI } from "@/lib/ai-memory/openai-json";
import { trackCrmEvent } from "@/lib/ai-memory/crm-event-tracker";

type ExtractedPayload = {
  profile?: Record<string, unknown> | null;
  memories?: Array<Record<string, unknown>>;
  crmEvents?: Array<Record<string, unknown>>;
};

type MemoryUpdaterInput = {
  tx: Prisma.TransactionClient;
  runtime: {
    provider: string;
    openaiApiKey: string | null;
  };
  clientId: string;
  customerId: string;
  sessionId: string;
  conversationId: string;
  userMessage: string;
  assistantMessage: string;
  customerEmail?: string | null;
};

function buildHeuristicMemories(userMessage: string, customerEmail?: string | null): MemoryUpdateResult {
  const memories: MemoryCandidate[] = [];
  const crmEvents: MemoryUpdateResult["crmEvents"] = [];
  const normalizedMessage = compactWhitespace(userMessage);

  if (customerEmail) {
    memories.push({
      kind: MemoryKind.PROFILE,
      content: `Email cliente: ${customerEmail}`,
      importanceScore: 0.95,
      source: "chat",
    });
  }

  if (/mi chiamo|sono\s+[A-ZÀ-ÖØ-Ý]/i.test(userMessage)) {
    memories.push({
      kind: MemoryKind.PROFILE,
      content: normalizedMessage,
      importanceScore: 0.82,
      source: "chat",
    });
  }

  if (/obiettivo|vorrei|cerco|mi serve|ci serve|sto cercando/i.test(userMessage)) {
    memories.push({
      kind: MemoryKind.LONG_TERM,
      content: normalizedMessage,
      importanceScore: 0.78,
      source: "chat",
    });
    crmEvents.push({
      type: CrmEventType.LEAD_CAPTURED,
      title: "Intento rilevato da chat",
      description: normalizedMessage.slice(0, 300),
      payload: { source: "heuristic" },
    });
  }

  return {
    memories: memories.slice(0, MAX_FACTS_PER_UPDATE),
    profile: customerEmail ? { profileSummary: `Contatto noto via email ${customerEmail}` } : null,
    crmEvents,
  };
}

function toProfileUpdate(raw: Record<string, unknown> | null | undefined): ProfileUpdate | null {
  if (!raw) return null;

  const profile: ProfileUpdate = {
    preferredLanguage: typeof raw.preferredLanguage === "string" ? compactWhitespace(raw.preferredLanguage) : null,
    timezone: typeof raw.timezone === "string" ? compactWhitespace(raw.timezone) : null,
    company: typeof raw.company === "string" ? compactWhitespace(raw.company) : null,
    jobTitle: typeof raw.jobTitle === "string" ? compactWhitespace(raw.jobTitle) : null,
    stage: typeof raw.stage === "string" ? compactWhitespace(raw.stage) : null,
    communicationStyle:
      typeof raw.communicationStyle === "string" ? compactWhitespace(raw.communicationStyle) : null,
    profileSummary: typeof raw.profileSummary === "string" ? compactWhitespace(raw.profileSummary) : null,
    goals: maybeStringArray(raw.goals),
    painPoints: maybeStringArray(raw.painPoints),
    traits: maybeStringArray(raw.traits),
  };

  if (Object.values(profile).every((value) => value == null || (Array.isArray(value) && value.length === 0))) {
    return null;
  }

  return profile;
}

function toMemoryCandidates(raw: Array<Record<string, unknown>> | undefined): MemoryCandidate[] {
  if (!raw) return [];
  const candidates = raw
    .map((entry) => {
      const kind =
        entry.kind === MemoryKind.SHORT_TERM ||
        entry.kind === MemoryKind.LONG_TERM ||
        entry.kind === MemoryKind.PROFILE
          ? entry.kind
          : null;
      const content = typeof entry.content === "string" ? compactWhitespace(entry.content) : "";
      if (!kind || !content) return null;
      return {
        kind,
        content,
        summary: typeof entry.summary === "string" ? compactWhitespace(entry.summary) : null,
        importanceScore: clampScore(Number(entry.importanceScore), 0.6),
        source: typeof entry.source === "string" ? compactWhitespace(entry.source) : "chat",
        metadata:
          entry.metadata && typeof entry.metadata === "object"
            ? (entry.metadata as Prisma.InputJsonValue)
            : null,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return candidates.slice(0, MAX_FACTS_PER_UPDATE);
}

export async function deriveMemoryUpdates(input: MemoryUpdaterInput): Promise<MemoryUpdateResult> {
  if (input.runtime.provider !== "openai" || !input.runtime.openaiApiKey) {
    return buildHeuristicMemories(input.userMessage, input.customerEmail);
  }

  const parsed = await generateJsonFromOpenAI<ExtractedPayload>(
    input.runtime.openaiApiKey,
    [
      "Estrai memoria cliente persistente da una conversazione SaaS CRM.",
      "Restituisci solo JSON valido con chiavi: profile, memories, crmEvents.",
      "memories: array di oggetti {kind, content, summary, importanceScore, source, metadata}.",
      "kind deve essere SHORT_TERM, LONG_TERM o PROFILE.",
      "crmEvents: array di oggetti {type, title, description, payload}.",
      "type deve essere CHAT_MESSAGE, PROFILE_UPDATED, MEMORY_CAPTURED, SUMMARY_UPDATED o LEAD_CAPTURED.",
      "Salva solo fatti utili a conversazioni future.",
    ].join("\n"),
    `Utente: ${input.userMessage}\nAssistente: ${input.assistantMessage}\nEmail nota: ${input.customerEmail ?? "n/a"}`,
  );

  if (!parsed) {
    return buildHeuristicMemories(input.userMessage, input.customerEmail);
  }

  const profile = toProfileUpdate(parsed.profile ?? null);
  const memories = toMemoryCandidates(parsed.memories);
  const crmEvents =
    Array.isArray(parsed.crmEvents)
      ? parsed.crmEvents
          .map((entry) => {
            const type = entry.type;
            if (
              type !== CrmEventType.CHAT_MESSAGE &&
              type !== CrmEventType.PROFILE_UPDATED &&
              type !== CrmEventType.MEMORY_CAPTURED &&
              type !== CrmEventType.SUMMARY_UPDATED &&
              type !== CrmEventType.LEAD_CAPTURED
            ) {
              return null;
            }
            return {
              type,
              title: typeof entry.title === "string" ? compactWhitespace(entry.title) : "Evento CRM",
              description:
                typeof entry.description === "string" ? compactWhitespace(entry.description) : null,
              payload:
                entry.payload && typeof entry.payload === "object"
                  ? (entry.payload as Prisma.InputJsonValue)
                  : null,
            };
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      : [];

  return {
    memories,
    profile,
    crmEvents,
  };
}

export async function persistMemoryUpdates(
  tx: Prisma.TransactionClient,
  input: MemoryUpdaterInput & {
    result: MemoryUpdateResult;
  },
) {
  if (input.result.profile) {
    const existing = await tx.customerProfile.findUnique({
      where: { customerId: input.customerId },
    });

    const goals = input.result.profile.goals?.length ? input.result.profile.goals : undefined;
    const painPoints =
      input.result.profile.painPoints?.length ? input.result.profile.painPoints : undefined;
    const traits = input.result.profile.traits?.length ? input.result.profile.traits : undefined;

    await tx.customerProfile.upsert({
      where: { customerId: input.customerId },
      create: {
        clientId: input.clientId,
        customerId: input.customerId,
        preferredLanguage: input.result.profile.preferredLanguage ?? null,
        timezone: input.result.profile.timezone ?? null,
        company: input.result.profile.company ?? null,
        jobTitle: input.result.profile.jobTitle ?? null,
        stage: input.result.profile.stage ?? null,
        communicationStyle: input.result.profile.communicationStyle ?? null,
        profileSummary: input.result.profile.profileSummary ?? null,
        goals,
        painPoints,
        traits,
      },
      update: {
        preferredLanguage: input.result.profile.preferredLanguage ?? existing?.preferredLanguage ?? null,
        timezone: input.result.profile.timezone ?? existing?.timezone ?? null,
        company: input.result.profile.company ?? existing?.company ?? null,
        jobTitle: input.result.profile.jobTitle ?? existing?.jobTitle ?? null,
        stage: input.result.profile.stage ?? existing?.stage ?? null,
        communicationStyle:
          input.result.profile.communicationStyle ?? existing?.communicationStyle ?? null,
        profileSummary: input.result.profile.profileSummary ?? existing?.profileSummary ?? null,
        goals: goals ?? existing?.goals ?? undefined,
        painPoints: painPoints ?? existing?.painPoints ?? undefined,
        traits: traits ?? existing?.traits ?? undefined,
      },
    });

    await trackCrmEvent(tx, {
      clientId: input.clientId,
      customerId: input.customerId,
      sessionId: input.sessionId,
      type: CrmEventType.PROFILE_UPDATED,
      title: "Profilo cliente aggiornato",
      payload: input.result.profile as Prisma.InputJsonValue,
    });
  }

  for (const memory of input.result.memories) {
    await tx.memoryEntry.create({
      data: {
        clientId: input.clientId,
        customerId: input.customerId,
        conversationId: input.conversationId,
        kind: memory.kind,
        content: memory.content,
        summary: memory.summary ?? null,
        importanceScore: memory.importanceScore,
        source: memory.source ?? "chat",
        metadata: memory.metadata ?? undefined,
        lastUsedAt: new Date(),
      },
    });
  }

  if (input.result.memories.length > 0) {
    await trackCrmEvent(tx, {
      clientId: input.clientId,
      customerId: input.customerId,
      sessionId: input.sessionId,
      type: CrmEventType.MEMORY_CAPTURED,
      title: "Memoria cliente aggiornata",
      payload: {
        memories: input.result.memories.map((memory) => ({
          kind: memory.kind,
          content: memory.content,
          importanceScore: memory.importanceScore,
        })),
      },
    });
  }

  for (const crmEvent of input.result.crmEvents) {
    await trackCrmEvent(tx, {
      clientId: input.clientId,
      customerId: input.customerId,
      sessionId: input.sessionId,
      type: crmEvent.type,
      title: crmEvent.title,
      description: crmEvent.description ?? null,
      payload: crmEvent.payload ?? null,
    });
  }
}
