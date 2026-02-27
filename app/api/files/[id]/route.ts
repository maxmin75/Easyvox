import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db/tenant";
import { jsonError } from "@/lib/api/errors";
import { deleteBlob, downloadPrivateBlob } from "@/lib/blob/server";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const clientId = request.headers.get("x-client-id");
  if (!clientId) return jsonError("clientId mancante", 400);

  const { id } = await context.params;

  const file = await withTenant(clientId, (tx) =>
    tx.fileAsset.findFirst({
      where: { id, clientId },
    }),
  );

  if (!file) {
    return jsonError("File non trovato", 404);
  }

  const blobResult = await downloadPrivateBlob(file.blobPath);
  if (!blobResult) {
    return jsonError("Blob non trovato", 404);
  }

  let stream: ReadableStream<Uint8Array> | null = null;
  if (blobResult.downloadUrl) {
    stream = await fetch(blobResult.downloadUrl, { cache: "no-store" }).then((r) => r.body);
  } else if (blobResult.data) {
    stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(blobResult.data as Uint8Array);
        controller.close();
      },
    });
  }

  if (!stream) {
    return jsonError("Download file non disponibile", 500);
  }

  return new NextResponse(stream, {
    headers: {
      "content-type": file.mimeType,
      "content-disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
      "cache-control": "private, no-store",
    },
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const clientId = request.headers.get("x-client-id");
  if (!clientId) return jsonError("clientId mancante", 400);

  const { id } = await context.params;

  const file = await withTenant(clientId, (tx) =>
    tx.fileAsset.findFirst({
      where: { id, clientId },
    }),
  );

  if (!file) {
    return jsonError("File non trovato", 404);
  }

  await deleteBlob(file.blobPath);

  await withTenant(clientId, (tx) =>
    tx.fileAsset.delete({
      where: { id: file.id },
    }),
  );

  return NextResponse.json({ ok: true });
}
