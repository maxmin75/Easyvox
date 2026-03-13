import type { Prisma } from "@prisma/client";
import { KNOWLEDGE_CHUNK_LIMIT, LONG_TERM_MEMORY_LIMIT, SHORT_TERM_TURNS } from "@/lib/ai-memory/constants";
import type { BuiltChatContext } from "@/lib/ai-memory/types";
import { retrieveTopChunks } from "@/lib/rag/retrieval";

type BuildContextInput = {
  tx: Prisma.TransactionClient;
  clientId: string;
  sessionId: string;
  message: string;
  assistantName: string;
  systemPrompt: string | null;
  customerId?: string | null;
  embedding: number[];
};

function formatJsonList(label: string, value: Prisma.JsonValue | null): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const items = value.filter((entry): entry is string => typeof entry === "string");
  if (items.length === 0) return null;
  return `${label}: ${items.join("; ")}`;
}

export async function buildChatContext(input: BuildContextInput): Promise<BuiltChatContext> {
  const [recentTurns, profile, summary, memories, knowledge] = await Promise.all([
    input.tx.conversation.findMany({
      where: { clientId: input.clientId, sessionId: input.sessionId },
      orderBy: { createdAt: "desc" },
      take: SHORT_TERM_TURNS,
    }),
    input.customerId
      ? input.tx.customerProfile.findUnique({ where: { customerId: input.customerId } })
      : Promise.resolve(null),
    input.tx.conversationSummary.findUnique({
      where: {
        clientId_sessionId: {
          clientId: input.clientId,
          sessionId: input.sessionId,
        },
      },
    }),
    input.customerId
      ? input.tx.memoryEntry.findMany({
          where: {
            clientId: input.clientId,
            customerId: input.customerId,
          },
          orderBy: [{ importanceScore: "desc" }, { updatedAt: "desc" }],
          take: LONG_TERM_MEMORY_LIMIT,
        })
      : Promise.resolve([]),
    retrieveTopChunks(input.tx, input.clientId, input.embedding, KNOWLEDGE_CHUNK_LIMIT),
  ]);

  const recentTranscript = recentTurns
    .reverse()
    .map((turn) => `Utente: ${turn.userMessage}\nAssistente: ${turn.assistantMessage}`)
    .join("\n\n");

  const profileLines = [
    profile?.profileSummary ? `Sintesi profilo: ${profile.profileSummary}` : null,
    profile?.company ? `Azienda: ${profile.company}` : null,
    profile?.jobTitle ? `Ruolo: ${profile.jobTitle}` : null,
    profile?.stage ? `Stage CRM: ${profile.stage}` : null,
    profile?.preferredLanguage ? `Lingua preferita: ${profile.preferredLanguage}` : null,
    profile?.timezone ? `Timezone: ${profile.timezone}` : null,
    profile?.communicationStyle ? `Stile comunicativo: ${profile.communicationStyle}` : null,
    formatJsonList("Obiettivi", profile?.goals ?? null),
    formatJsonList("Pain points", profile?.painPoints ?? null),
    formatJsonList("Tratti", profile?.traits ?? null),
  ].filter(Boolean);

  const memoryLines = memories.map((memory) => `[${memory.kind}] ${memory.content}`);
  const knowledgeLines = knowledge.map(
    (chunk, index) => `[KB ${index + 1} | score ${chunk.score.toFixed(3)}] ${chunk.content}`,
  );

  const promptSections = [
    `Assistente attivo: ${input.assistantName}`,
    "Vincoli di sistema:",
    input.systemPrompt ?? "Rispondi in modo accurato, chiaro e utile. Usa il contesto del database come memoria primaria.",
    profileLines.length > 0 ? `Profilo cliente\n${profileLines.join("\n")}` : null,
    summary?.summary ? `Riassunto sessione\n${summary.summary}` : null,
    summary?.keyFacts && Array.isArray(summary.keyFacts) && summary.keyFacts.length > 0
      ? `Fatti chiave\n${summary.keyFacts.join("\n")}`
      : null,
    memoryLines.length > 0 ? `Memoria persistente\n${memoryLines.join("\n")}` : null,
    recentTranscript ? `Memoria breve\n${recentTranscript}` : null,
    knowledgeLines.length > 0 ? `Knowledge base\n${knowledgeLines.join("\n\n")}` : null,
    `Nuovo messaggio utente\n${input.message}`,
    "Istruzioni finali: se il knowledge base non copre la risposta, dichiaralo. Non inventare dati.",
  ].filter(Boolean);

  return {
    customerId: input.customerId ?? null,
    assistantName: input.assistantName,
    systemPrompt: input.systemPrompt ?? "You are EasyVox.",
    userPrompt: promptSections.join("\n\n"),
    knowledge: knowledge.map((chunk) => ({
      id: chunk.id,
      content: chunk.content,
      score: chunk.score,
    })),
  };
}
