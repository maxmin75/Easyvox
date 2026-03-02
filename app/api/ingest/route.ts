import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db/tenant";
import { jsonError } from "@/lib/api/errors";
import { downloadPrivateBlob } from "@/lib/blob/server";
import { getRuntimeSettings } from "@/lib/runtime-settings";
import { createEmbeddingWithProvider } from "@/lib/ai/provider";
import { chunkText } from "@/lib/rag/chunking";
import { embeddingToVectorLiteral } from "@/lib/rag/embeddings";
import { getAuthUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const runtimeSettings = await getRuntimeSettings();
  const clientId = request.headers.get("x-client-id");
  if (!clientId) return jsonError("clientId mancante", 400);
  const authUser = await getAuthUserFromRequest(request);
  if (authUser) {
    const owned = await prisma.client.findFirst({
      where: { id: clientId, ownerId: authUser.id },
      select: { id: true },
    });
    if (!owned) return jsonError("Agente non trovato", 404);
  }

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

    if (blobResult.data) {
      text = new TextDecoder().decode(blobResult.data);
    } else {
      const downloadUrl = blobResult.downloadUrl;
      if (!downloadUrl) {
        return jsonError("Download blob non disponibile", 500);
      }

      const response = await fetch(downloadUrl, { cache: "no-store" });
      if (!response.ok) {
        return jsonError("Impossibile leggere il file da Blob", 502);
      }

      text = await response.text();
    }
    title = fileAsset.filename;
    source = "blob";
  } else {
    return jsonError("Invia 'file' oppure 'fileAssetId'", 400);
  }

  const chunks = chunkText(text);

  if (chunks.length === 0) {
    return jsonError("Documento vuoto", 400);
  }

  let inserted: { documentId: string; chunkCount: number; provider: string };
  try {
    inserted = await withTenant(clientId, async (tx) => {
      const document = await tx.document.create({
        data: {
          clientId,
          title,
          source,
        },
      });

      for (const chunk of chunks) {
        const embedding = await createEmbeddingWithProvider(chunk, runtimeSettings);
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

      return { documentId: document.id, chunkCount: chunks.length, provider: runtimeSettings.provider };
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Errore ingest provider";
    return jsonError(
      detail.includes("ECONNREFUSED")
        ? "Provider AI non raggiungibile (Ollama offline). Avvia Ollama o passa a OpenAI."
        : detail,
      500,
    );
  }

  return NextResponse.json(inserted, { status: 201 });
}
