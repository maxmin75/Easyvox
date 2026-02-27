import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db/tenant";
import { jsonError } from "@/lib/api/errors";
import { getOpenAIClient } from "@/lib/openai";
import { chunkText } from "@/lib/rag/chunking";
import { createEmbedding, embeddingToVectorLiteral } from "@/lib/rag/embeddings";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    getOpenAIClient();
  } catch {
    return jsonError("OPENAI_API_KEY non configurata", 500);
  }

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
      const embedding = await createEmbedding(chunk);
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
