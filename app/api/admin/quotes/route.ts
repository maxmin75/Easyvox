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
  const { user, denied, isEasyVoxAdmin } = await requireAdminUser(request);
  if (denied) return denied;
  await claimLegacyClientsIfNeeded(user.id);

  const parsed = querySchema.safeParse({
    clientId: request.nextUrl.searchParams.get("clientId") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) return jsonError("Query non valida", 400);

  const ownedClients = await prismaAdmin.client.findMany({
    where: {
      ...(isEasyVoxAdmin ? {} : { ownerId: user.id }),
      ...(parsed.data.clientId ? { id: parsed.data.clientId } : {}),
    },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "desc" },
  });
  const ownedClientIds = ownedClients.map((client) => client.id);

  if (parsed.data.clientId && !ownedClientIds.includes(parsed.data.clientId)) {
    return jsonError("Client non trovato", 404);
  }

  const quotes = await prismaAdmin.quote.findMany({
    where: { clientId: { in: ownedClientIds } },
    orderBy: [{ createdAt: "desc" }],
    take: parsed.data.limit ?? 100,
    select: {
      id: true,
      clientId: true,
      sessionId: true,
      customerName: true,
      company: true,
      city: true,
      email: true,
      phone: true,
      support: true,
      aiType: true,
      training: true,
      customizations: true,
      setupInitial: true,
      monthlyCost: true,
      trainingCost: true,
      emailSentToCustomer: true,
      emailSentToInternal: true,
      emailError: true,
      createdAt: true,
    },
  });

  const byId = new Map(ownedClients.map((client) => [client.id, client] as const));

  return NextResponse.json({
    filters: { clientId: parsed.data.clientId ?? null },
    quotes: quotes.map((item) => ({
      ...item,
      clientName: byId.get(item.clientId)?.name ?? "",
      clientSlug: byId.get(item.clientId)?.slug ?? "",
    })),
  });
}
