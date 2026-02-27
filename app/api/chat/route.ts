import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenant } from "@/lib/db/tenant";
import { jsonError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { createOpenAIClient } from "@/lib/openai";
import { getRuntimeSettings } from "@/lib/runtime-settings";
import { createEmbedding } from "@/lib/rag/embeddings";
import { retrieveTopChunks } from "@/lib/rag/retrieval";

export const runtime = "nodejs";

const schema = z.object({
  sessionId: z.string().min(3),
  message: z.string().min(1).max(4000),
});

export async function POST(request: NextRequest) {
  const runtimeSettings = await getRuntimeSettings();
  if (!runtimeSettings.openaiApiKey) {
    return jsonError("OPENAI_API_KEY non configurata (env o impostazioni admin)", 500);
  }

  const openai = createOpenAIClient(runtimeSettings.openaiApiKey);
  const clientId = request.headers.get("x-client-id");
  if (!clientId) return jsonError("clientId mancante", 400);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Payload non valido", 400);

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, systemPrompt: true },
  });

  if (!client) return jsonError("Tenant non trovato", 404);

  const embedding = await createEmbedding(
    parsed.data.message,
    openai,
    runtimeSettings.openaiEmbeddingModel,
  );

  const result = await withTenant(clientId, async (tx) => {
    const chunks = await retrieveTopChunks(tx, clientId, embedding, 5);
    const context = chunks.map((chunk, index) => `[${index + 1}] ${chunk.content}`).join("\n\n");

    const completion = await openai.responses.create({
      model: runtimeSettings.openaiChatModel,
      input: [
        {
          role: "system",
          content: `${client.systemPrompt ?? "Rispondi in modo chiaro, accurato e conciso."}\n\nSe non sai qualcosa, dichiaralo esplicitamente.`,
        },
        {
          role: "user",
          content: `Contesto RAG:\n${context || "Nessun documento disponibile."}\n\nMessaggio utente:\n${parsed.data.message}`,
        },
      ],
    });

    const reply = completion.output_text || "Non sono riuscito a generare una risposta in questo momento.";

    await tx.conversation.create({
      data: {
        clientId,
        sessionId: parsed.data.sessionId,
        userMessage: parsed.data.message,
        assistantMessage: reply,
      },
    });

    return {
      reply,
      usageEstimate: {
        inputTokens: completion.usage?.input_tokens ?? null,
        outputTokens: completion.usage?.output_tokens ?? null,
      },
      sources: chunks.map((chunk) => ({ id: chunk.id, score: chunk.score })),
    };
  });

  return NextResponse.json(result);
}
