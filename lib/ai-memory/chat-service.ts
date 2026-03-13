import { CrmEventType, type Prisma } from "@prisma/client";
import { completeChatWithProvider, createEmbeddingWithProvider } from "@/lib/ai/provider";
import { buildChatContext } from "@/lib/ai-memory/context-builder";
import { trackCrmEvent } from "@/lib/ai-memory/crm-event-tracker";
import { deriveMemoryUpdates, persistMemoryUpdates } from "@/lib/ai-memory/memory-updater";
import { summarizeConversationWindow, upsertConversationSummary } from "@/lib/ai-memory/summary-service";
import { resolveCustomer } from "@/lib/ai-memory/customer-service";
import { SUMMARY_TURN_INTERVAL } from "@/lib/ai-memory/constants";

type RuntimeConfig = {
  provider: "openai" | "ollama" | "local";
  openaiApiKey: string | null;
  openaiChatModel: string;
  openaiEmbeddingModel: string;
  ollamaBaseUrl: string | null;
  ollamaChatModel: string;
  ollamaEmbeddingModel: string;
};

type ChatServiceInput = {
  tx: Prisma.TransactionClient;
  client: {
    id: string;
    assistantName: string | null;
    systemPrompt: string | null;
    name: string;
  };
  runtime: RuntimeConfig;
  sessionId: string;
  message: string;
  customerName?: string | null;
  customerEmail?: string | null;
};

export async function runMemoryChat(input: ChatServiceInput) {
  const customer = await resolveCustomer(input.tx, {
    clientId: input.client.id,
    sessionId: input.sessionId,
    customerName: input.customerName ?? null,
    customerEmail: input.customerEmail ?? null,
  });

  const embedding = await createEmbeddingWithProvider(input.message, input.runtime);
  const assistantName = input.client.assistantName ?? `${input.client.name} AI`;

  const context = await buildChatContext({
    tx: input.tx,
    clientId: input.client.id,
    sessionId: input.sessionId,
    message: input.message,
    assistantName,
    systemPrompt: input.client.systemPrompt,
    customerId: customer?.id ?? null,
    embedding,
  });

  const completion = await completeChatWithProvider(
    {
      systemPrompt: context.systemPrompt,
      userPrompt: context.userPrompt,
    },
    input.runtime,
  );

  const conversation = await input.tx.conversation.create({
    data: {
      clientId: input.client.id,
      customerId: customer?.id ?? null,
      sessionId: input.sessionId,
      userMessage: input.message,
      assistantMessage: completion.reply,
    },
  });

  await trackCrmEvent(input.tx, {
    clientId: input.client.id,
    customerId: customer?.id ?? null,
    sessionId: input.sessionId,
    type: CrmEventType.CHAT_MESSAGE,
    title: "Nuovo turno chat",
    payload: {
      conversationId: conversation.id,
      inputTokens: completion.usageEstimate.inputTokens,
      outputTokens: completion.usageEstimate.outputTokens,
      provider: input.runtime.provider,
    },
  });

  if (customer) {
    const memoryResult = await deriveMemoryUpdates({
      tx: input.tx,
      runtime: input.runtime,
      clientId: input.client.id,
      customerId: customer.id,
      sessionId: input.sessionId,
      conversationId: conversation.id,
      userMessage: input.message,
      assistantMessage: completion.reply,
      customerEmail: input.customerEmail ?? customer.email,
    });

    await persistMemoryUpdates(input.tx, {
      tx: input.tx,
      runtime: input.runtime,
      clientId: input.client.id,
      customerId: customer.id,
      sessionId: input.sessionId,
      conversationId: conversation.id,
      userMessage: input.message,
      assistantMessage: completion.reply,
      customerEmail: input.customerEmail ?? customer.email,
      result: memoryResult,
    });
  }

  const totalTurns = await input.tx.conversation.count({
    where: { clientId: input.client.id, sessionId: input.sessionId },
  });

  let summary = null;
  if (totalTurns === 1 || totalTurns % SUMMARY_TURN_INTERVAL === 0) {
    const messages = await input.tx.conversation.findMany({
      where: { clientId: input.client.id, sessionId: input.sessionId },
      orderBy: { createdAt: "asc" },
      take: 24,
    });

    summary = await summarizeConversationWindow({
      runtime: {
        provider: input.runtime.provider,
        openaiApiKey: input.runtime.openaiApiKey,
      },
      messages,
    });

    await upsertConversationSummary(input.tx, {
      clientId: input.client.id,
      customerId: customer?.id ?? null,
      sessionId: input.sessionId,
      summary,
    });

    await trackCrmEvent(input.tx, {
      clientId: input.client.id,
      customerId: customer?.id ?? null,
      sessionId: input.sessionId,
      type: CrmEventType.SUMMARY_UPDATED,
      title: "Riassunto conversazione aggiornato",
      payload: {
        sourceMessageCount: summary.sourceMessageCount,
        keyFacts: summary.keyFacts,
        openLoops: summary.openLoops,
      },
    });
  }

  return {
    reply: completion.reply,
    assistantName,
    usageEstimate: completion.usageEstimate,
    provider: input.runtime.provider,
    customerId: customer?.id ?? null,
    sources: context.knowledge.map((item) => ({
      id: item.id,
      score: item.score,
    })),
    summaryUpdated: Boolean(summary),
  };
}
