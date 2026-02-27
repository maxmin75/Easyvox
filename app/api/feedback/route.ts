import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenant } from "@/lib/db/tenant";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";

const schema = z.object({
  sessionId: z.string().min(3).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1500).optional(),
});

export async function POST(request: NextRequest) {
  const clientId = request.headers.get("x-client-id");
  if (!clientId) return jsonError("clientId mancante", 400);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Payload non valido", 400);

  const feedback = await withTenant(clientId, (tx) =>
    tx.feedback.create({
      data: {
        clientId,
        ...parsed.data,
      },
    }),
  );

  return NextResponse.json({ id: feedback.id, createdAt: feedback.createdAt }, { status: 201 });
}
