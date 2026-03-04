import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenant } from "@/lib/db/tenant";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";

const schema = z.object({
  sessionId: z.string().min(3).max(200).optional(),
  name: z.string().min(1).max(120),
  email: z.string().email().optional(),
  phone: z.string().min(5).max(40).optional(),
  website: z.string().url().max(300).optional(),
  message: z.string().max(2000).optional(),
}).refine((data) => Boolean(data.email || data.phone || data.website), {
  message: "Inserisci almeno email, telefono o sito web",
  path: ["email"],
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
