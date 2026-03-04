import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { requireAdminUser } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/errors";
import { claimLegacyClientsIfNeeded } from "@/lib/admin/clients";

export const runtime = "nodejs";

const querySchema = z.object({
  clientId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export async function GET(request: NextRequest) {
  const { user, denied } = await requireAdminUser(request);
  if (denied) return denied;
  await claimLegacyClientsIfNeeded(user.id);

  const parsed = querySchema.safeParse({
    clientId: request.nextUrl.searchParams.get("clientId") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) return jsonError("Query non valida", 400);

  const ownedClients = await prismaAdmin.client.findMany({
    where: { ownerId: user.id, ...(parsed.data.clientId ? { id: parsed.data.clientId } : {}) },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "desc" },
  });
  const ownedClientIds = ownedClients.map((client) => client.id);

  if (parsed.data.clientId && !ownedClientIds.includes(parsed.data.clientId)) {
    return jsonError("Client non trovato", 404);
  }

  const appointments = await prismaAdmin.appointment.findMany({
    where: { clientId: { in: ownedClientIds } },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
    take: parsed.data.limit ?? 100,
    select: {
      id: true,
      clientId: true,
      sessionId: true,
      fullName: true,
      email: true,
      phone: true,
      scheduledFor: true,
      timezone: true,
      notes: true,
      createdAt: true,
    },
  });

  const byId = new Map(ownedClients.map((client) => [client.id, client] as const));

  return NextResponse.json({
    filters: { clientId: parsed.data.clientId ?? null },
    appointments: appointments.map((item) => ({
      ...item,
      clientName: byId.get(item.clientId)?.name ?? "",
      clientSlug: byId.get(item.clientId)?.slug ?? "",
    })),
  });
}
