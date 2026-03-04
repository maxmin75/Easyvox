import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenant } from "@/lib/db/tenant";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";

const createSchema = z
  .object({
    sessionId: z.string().min(3).max(200).optional(),
    fullName: z.string().min(1).max(120),
    email: z.string().email().optional(),
    phone: z.string().min(5).max(40).optional(),
    scheduledFor: z.string().datetime({ offset: true }),
    timezone: z.string().min(2).max(80).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: "Email o telefono obbligatorio",
    path: ["email"],
  });

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sessionId: z.string().min(3).max(200).optional(),
});

export async function POST(request: NextRequest) {
  const clientId = request.headers.get("x-client-id");
  if (!clientId) return jsonError("clientId mancante", 400);

  const client = await withTenant(clientId, (tx) =>
    tx.client.findUnique({
      where: { id: clientId },
      select: { canTakeAppointments: true },
    }),
  );
  if (!client) return jsonError("Tenant non trovato", 404);
  if (!client.canTakeAppointments) {
    return jsonError("Presa appuntamenti disabilitata per questo agente", 403);
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Payload non valido", 400);

  const appointment = await withTenant(clientId, (tx) =>
    tx.appointment.create({
      data: {
        clientId,
        sessionId: parsed.data.sessionId,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        scheduledFor: new Date(parsed.data.scheduledFor),
        timezone: parsed.data.timezone,
        notes: parsed.data.notes,
      },
    }),
  );

  return NextResponse.json(
    {
      id: appointment.id,
      createdAt: appointment.createdAt,
      scheduledFor: appointment.scheduledFor,
    },
    { status: 201 },
  );
}

export async function GET(request: NextRequest) {
  const clientId = request.headers.get("x-client-id");
  if (!clientId) return jsonError("clientId mancante", 400);

  const parsed = querySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    sessionId: request.nextUrl.searchParams.get("sessionId") ?? undefined,
  });
  if (!parsed.success) return jsonError("Query non valida", 400);

  const items = await withTenant(clientId, (tx) =>
    tx.appointment.findMany({
      where: {
        clientId,
        ...(parsed.data.sessionId ? { sessionId: parsed.data.sessionId } : {}),
      },
      orderBy: { scheduledFor: "asc" },
      take: parsed.data.limit ?? 20,
      select: {
        id: true,
        sessionId: true,
        fullName: true,
        email: true,
        phone: true,
        scheduledFor: true,
        timezone: true,
        notes: true,
        createdAt: true,
      },
    }),
  );

  return NextResponse.json({ appointments: items });
}
