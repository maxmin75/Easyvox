import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/db/tenant";
import { jsonError } from "@/lib/api/errors";
import { downloadPrivateBlob } from "@/lib/blob/server";

export const runtime = "nodejs";

async function resolveClientId(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId")?.trim();
  if (clientId) return clientId;

  const clientSlug = request.nextUrl.searchParams.get("clientSlug")?.trim().toLowerCase();
  if (!clientSlug) return null;

  const client = await prisma.client.findUnique({
    where: { slug: clientSlug },
    select: { id: true },
  });
  return client?.id ?? null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const clientId = await resolveClientId(request);
    if (!clientId) return jsonError("clientId mancante", 400);

    const { id } = await context.params;

    const file = await withTenant(clientId, (tx) =>
      tx.fileAsset.findFirst({
        where: { id, clientId },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          blobPath: true,
        },
      }),
    );

    if (!file) return jsonError("File non trovato", 404);

    const blobResult = await downloadPrivateBlob(file.blobPath);
    if (!blobResult) return jsonError("Blob non trovato", 404);

    let stream: ReadableStream<Uint8Array> | null = null;
    if (blobResult.downloadUrl) {
      stream = await fetch(blobResult.downloadUrl, { cache: "no-store" }).then((response) => response.body);
    } else if (blobResult.data) {
      stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(blobResult.data as Uint8Array);
          controller.close();
        },
      });
    }

    if (!stream) return jsonError("Download file non disponibile", 500);

    return new NextResponse(stream, {
      headers: {
        "content-type": file.mimeType,
        "content-disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
        "cache-control": "public, max-age=60",
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Errore download file", 500);
  }
}
