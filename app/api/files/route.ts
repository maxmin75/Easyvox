import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db/tenant";
import { jsonError } from "@/lib/api/errors";
import { uploadPrivateBlob } from "@/lib/blob/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const clientId = request.headers.get("x-client-id");
  if (!clientId) return jsonError("clientId mancante", 400);
  const sessionId = request.nextUrl.searchParams.get("sessionId")?.trim() ?? "";

  const files = await withTenant(clientId, (tx) =>
    tx.fileAsset.findMany({
      where: { clientId, ...(sessionId ? { sessionId } : {}) },
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
  const sessionIdValue = form.get("sessionId");
  const sessionId =
    typeof sessionIdValue === "string" && sessionIdValue.trim().length > 0
      ? sessionIdValue.trim().slice(0, 120)
      : null;

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
        sessionId,
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
