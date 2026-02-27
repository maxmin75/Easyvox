import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenant } from "@/lib/db/tenant";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  message: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const clientId = request.headers.get("x-client-id");
  if (!clientId) return jsonError("clientId mancante", 400);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Payload non valido", 400);

  const lead = await withTenant(clientId, (tx) =>
    tx.lead.create({
      data: {
        clientId,
        ...parsed.data,
      },
    }),
  );

  return NextResponse.json({ id: lead.id, createdAt: lead.createdAt }, { status: 201 });
}
