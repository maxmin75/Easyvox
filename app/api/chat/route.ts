import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenant } from "@/lib/db/tenant";
import { jsonError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getRuntimeSettings } from "@/lib/runtime-settings";
import { createEmbeddingWithProvider, completeChatWithProvider } from "@/lib/ai/provider";
import { retrieveTopChunks } from "@/lib/rag/retrieval";

export const runtime = "nodejs";

const schema = z.object({
  sessionId: z.string().min(3),
  message: z.string().min(1).max(4000),
});

export async function POST(request: NextRequest) {
  const runtimeSettings = await getRuntimeSettings();
  const authUser = await getAuthUserFromRequest(request);
  let clientId = request.headers.get("x-client-id");

  if (!clientId) {
    if (authUser) {
      const defaultClient = await prisma.client.findFirst({
        where: { ownerId: authUser.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      clientId = defaultClient?.id ?? null;
    }
  }

  if (!clientId) {
    return jsonError("Nessuna Ditta selezionata. Passa ?ditta=<slug> oppure crea un client in Admin.", 400);
  }

  if (authUser) {
    const owned = await prisma.client.findFirst({
      where: { id: clientId, ownerId: authUser.id },
      select: { id: true },
    });
    if (!owned) return jsonError("Agente non trovato", 404);
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Payload non valido", 400);

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, assistantName: true, systemPrompt: true },
  });

  if (!client) return jsonError("Tenant non trovato", 404);

  let embedding: number[];
  try {
    embedding = await createEmbeddingWithProvider(parsed.data.message, runtimeSettings);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Errore embedding provider";
    return jsonError(detail, 500);
  }

  const resolvedClientId = clientId;
  const result = await withTenant(resolvedClientId, async (tx) => {
    const chunks = await retrieveTopChunks(tx, resolvedClientId, embedding, 5);
    const context = chunks.map((chunk, index) => `[${index + 1}] ${chunk.content}`).join("\n\n");

    const systemPrompt = `${client.systemPrompt ?? "Rispondi in modo chiaro, accurato e conciso."}\n\nSe non sai qualcosa, dichiaralo esplicitamente.`;
    const userPrompt = `Contesto RAG:\n${context || "Nessun documento disponibile."}\n\nMessaggio utente:\n${parsed.data.message}`;

    const completion = await completeChatWithProvider(
      {
        systemPrompt,
        userPrompt,
      },
      runtimeSettings,
    );

    await tx.conversation.create({
      data: {
        clientId: resolvedClientId,
        sessionId: parsed.data.sessionId,
        userMessage: parsed.data.message,
        assistantMessage: completion.reply,
      },
    });

    return {
      reply: completion.reply,
      assistantName: client.assistantName ?? "Assistant",
      usageEstimate: completion.usageEstimate,
      sources: chunks.map((chunk) => ({ id: chunk.id, score: chunk.score })),
      provider: runtimeSettings.provider,
    };
  });

  return NextResponse.json(result);
}
