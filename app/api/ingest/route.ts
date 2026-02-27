import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db/tenant";
import { jsonError } from "@/lib/api/errors";
import { downloadPrivateBlob } from "@/lib/blob/server";
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
  const fileAssetId = form.get("fileAssetId");
  let text = "";
  let title = "";
  let source = "upload";

  if (file instanceof File) {
    const isTextFile = file.name.endsWith(".md") || file.name.endsWith(".txt");
    if (!isTextFile) {
      return jsonError("Formato non supportato per ingest diretto. Usa .md o .txt", 400);
    }
    text = await file.text();
    title = file.name;
  } else if (typeof fileAssetId === "string" && fileAssetId) {
    const fileAsset = await withTenant(clientId, (tx) =>
      tx.fileAsset.findFirst({
        where: { id: fileAssetId, clientId },
      }),
    );

    if (!fileAsset) {
      return jsonError("fileAssetId non trovato per questo tenant", 404);
    }

    const supportedMimeTypes = ["text/plain", "text/markdown"];
    const supportedByExtension =
      fileAsset.filename.endsWith(".md") || fileAsset.filename.endsWith(".txt");

    if (!supportedByExtension && !supportedMimeTypes.includes(fileAsset.mimeType)) {
      return jsonError(
        "Questo tipo file non e ancora ingestibile automaticamente. Caricalo come testo o aggiungi OCR/parser PDF.",
        422,
      );
    }

    const blobResult = await downloadPrivateBlob(fileAsset.blobPath);
    if (!blobResult) {
      return jsonError("Blob non trovato", 404);
    }

    const downloadUrl = blobResult.blob.downloadUrl;
    if (!downloadUrl) {
      return jsonError("Download blob non disponibile", 500);
    }

    const response = await fetch(downloadUrl, { cache: "no-store" });
    if (!response.ok) {
      return jsonError("Impossibile leggere il file da Blob", 502);
    }

    text = await response.text();
    title = fileAsset.filename;
    source = "blob";
  } else {
    return jsonError("Invia 'file' oppure 'fileAssetId'", 400);
  }

  const chunks = chunkText(text);

  if (chunks.length === 0) {
    return jsonError("Documento vuoto", 400);
  }

  const inserted = await withTenant(clientId, async (tx) => {
    const document = await tx.document.create({
      data: {
        clientId,
        title,
        source,
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
          ${JSON.stringify({ source: title })}::jsonb,
          ${vector}::vector
        )
      `;
    }

    return { documentId: document.id, chunkCount: chunks.length };
  });

  return NextResponse.json(inserted, { status: 201 });
}
