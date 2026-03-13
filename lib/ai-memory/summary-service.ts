import type { Conversation, Prisma } from "@prisma/client";
import { compactWhitespace, maybeStringArray } from "@/lib/ai-memory/utils";
import type { ConversationSummaryResult } from "@/lib/ai-memory/types";
import { generateJsonFromOpenAI } from "@/lib/ai-memory/openai-json";

type SummaryInput = {
  runtime: {
    provider: string;
    openaiApiKey: string | null;
  };
  messages: Conversation[];
};

type SummaryPayload = {
  summary?: unknown;
  keyFacts?: unknown;
  openLoops?: unknown;
};

function fallbackSummary(messages: Conversation[]): ConversationSummaryResult {
  const lastTurns = messages.slice(-4);
  const keyFacts = lastTurns.map((message) => compactWhitespace(message.userMessage)).filter(Boolean);
  return {
    summary: compactWhitespace(
      lastTurns
        .map((message) => `Utente: ${message.userMessage}\nAssistente: ${message.assistantMessage}`)
        .join("\n"),
    ).slice(0, 1500),
    keyFacts: keyFacts.slice(0, 5),
    openLoops: [],
    sourceMessageCount: messages.length,
  };
}

export async function summarizeConversationWindow(
  input: SummaryInput,
): Promise<ConversationSummaryResult> {
  if (input.messages.length === 0) {
    return {
      summary: "",
      keyFacts: [],
      openLoops: [],
      sourceMessageCount: 0,
    };
  }

  if (input.runtime.provider !== "openai" || !input.runtime.openaiApiKey) {
    return fallbackSummary(input.messages);
  }

  const transcript = input.messages
    .map(
      (message, index) =>
        `Turn ${index + 1}\nUtente: ${message.userMessage}\nAssistente: ${message.assistantMessage}`,
    )
    .join("\n\n");

  const parsed = await generateJsonFromOpenAI<SummaryPayload>(
    input.runtime.openaiApiKey,
    [
      "Sei un summarizer CRM per una SaaS multi-tenant.",
      "Restituisci solo JSON valido con chiavi: summary, keyFacts, openLoops.",
      "summary deve essere una sintesi compatta orientata al contesto futuro.",
      "keyFacts e openLoops devono essere array di stringhe.",
    ].join("\n"),
    transcript,
  );

  if (!parsed || typeof parsed.summary !== "string") {
    return fallbackSummary(input.messages);
  }

  return {
    summary: compactWhitespace(parsed.summary).slice(0, 4000),
    keyFacts: maybeStringArray(parsed.keyFacts),
    openLoops: maybeStringArray(parsed.openLoops),
    sourceMessageCount: input.messages.length,
  };
}

export async function upsertConversationSummary(
  tx: Prisma.TransactionClient,
  input: {
    clientId: string;
    customerId?: string | null;
    sessionId: string;
    summary: ConversationSummaryResult;
  },
) {
  return tx.conversationSummary.upsert({
    where: {
      clientId_sessionId: {
        clientId: input.clientId,
        sessionId: input.sessionId,
      },
    },
    create: {
      clientId: input.clientId,
      customerId: input.customerId ?? null,
      sessionId: input.sessionId,
      summary: input.summary.summary,
      keyFacts: input.summary.keyFacts,
      openLoops: input.summary.openLoops,
      sourceMessageCount: input.summary.sourceMessageCount,
    },
    update: {
      customerId: input.customerId ?? null,
      summary: input.summary.summary,
      keyFacts: input.summary.keyFacts,
      openLoops: input.summary.openLoops,
      sourceMessageCount: input.summary.sourceMessageCount,
    },
  });
}
