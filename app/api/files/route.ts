import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db/tenant";
import { jsonError } from "@/lib/api/errors";
import { uploadPrivateBlob } from "@/lib/blob/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const clientId = request.headers.get("x-client-id");
  if (!clientId) return jsonError("clientId mancante", 400);

  const files = await withTenant(clientId, (tx) =>
    tx.fileAsset.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    }),
  );

  return NextResponse.json({ files });
}

export async function POST(request: NextRequest) {
  const clientId = request.headers.get("x-client-id");
  if (!clientId) return jsonError("clientId mancante", 400);

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return jsonError("Invia un file nel campo 'file'", 400);
  }

  if (file.size <= 0) {
    return jsonError("File vuoto", 400);
  }

  const blob = await uploadPrivateBlob(clientId, file);

  const stored = await withTenant(clientId, (tx) =>
    tx.fileAsset.create({
      data: {
        clientId,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        blobUrl: blob.url,
        blobPath: blob.pathname,
      },
    }),
  );

  return NextResponse.json({ file: stored }, { status: 201 });
}
