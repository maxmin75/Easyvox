import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db/tenant";
import { jsonError } from "@/lib/api/errors";
import { createOpenAIClient } from "@/lib/openai";
import { getRuntimeSettings } from "@/lib/runtime-settings";
import { chunkText } from "@/lib/rag/chunking";
import { createEmbedding, embeddingToVectorLiteral } from "@/lib/rag/embeddings";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const runtimeSettings = await getRuntimeSettings();
  if (!runtimeSettings.openaiApiKey) {
    return jsonError("OPENAI_API_KEY non configurata (env o impostazioni admin)", 500);
  }

  const openai = createOpenAIClient(runtimeSettings.openaiApiKey);
  const clientId = request.headers.get("x-client-id");
  if (!clientId) return jsonError("clientId mancante", 400);

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return jsonError("Invia un file .md o .txt nel campo 'file'", 400);
  }

  const isTextFile = file.name.endsWith(".md") || file.name.endsWith(".txt");
  if (!isTextFile) {
    return jsonError("Formato non supportato. Usa .md o .txt", 400);
  }

  const text = await file.text();
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    return jsonError("Documento vuoto", 400);
  }

  const inserted = await withTenant(clientId, async (tx) => {
    const document = await tx.document.create({
      data: {
        clientId,
        title: file.name,
        source: "upload",
      },
    });

    for (const chunk of chunks) {
      const embedding = await createEmbedding(chunk, openai, runtimeSettings.openaiEmbeddingModel);
      const vector = embeddingToVectorLiteral(embedding);

      await tx.$executeRaw`
        INSERT INTO chunks (client_id, document_id, content, metadata, embedding)
        VALUES (
          ${clientId}::uuid,
          ${document.id}::uuid,
          ${chunk},
          ${JSON.stringify({ source: file.name })}::jsonb,
          ${vector}::vector
        )
      `;
    }

    return { documentId: document.id, chunkCount: chunks.length };
  });

  return NextResponse.json(inserted, { status: 201 });
}
