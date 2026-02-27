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

  const stream = blobResult.blob.downloadUrl
    ? await fetch(blobResult.blob.downloadUrl, { cache: "no-store" }).then((r) => r.body)
    : null;

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
