import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { requireAdminUser } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/errors";
import { claimLegacyClientsIfNeeded } from "@/lib/admin/clients";

export const runtime = "nodejs";

const querySchema = z.object({
  clientId: z.string().uuid().optional(),
});

type ContactAggregate = {
  clientId: string;
  clientName: string;
  clientSlug: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  lastMessage: string | null;
  interactionCount: number;
  sessionsCount: number;
  firstInteractionAt: string;
  lastInteractionAt: string;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function contactKey(row: {
  clientId: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
}) {
  const email = normalize(row.email);
  const phone = normalize(row.phone);
  const website = normalize(row.website);
  const name = normalize(row.name);
  return [row.clientId, email || "-", phone || "-", website || "-", name || "-"].join("|");
}

export async function GET(request: NextRequest) {
  const { user, denied, isEasyVoxAdmin } = await requireAdminUser(request);
  if (denied) return denied;
  await claimLegacyClientsIfNeeded(user.id);

  const parsed = querySchema.safeParse({
    clientId: request.nextUrl.searchParams.get("clientId") ?? undefined,
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
  if (ownedClientIds.length === 0) {
    return NextResponse.json({ filters: { clientId: parsed.data.clientId ?? null }, contacts: [] });
  }

  const leads = await prismaAdmin.lead.findMany({
    where: { clientId: { in: ownedClientIds } },
    orderBy: { createdAt: "desc" },
    select: {
      clientId: true,
      sessionId: true,
      name: true,
      email: true,
      phone: true,
      website: true,
      message: true,
      createdAt: true,
    },
  });

  const clientById = new Map(ownedClients.map((client) => [client.id, client] as const));
  const byKey = new Map<string, ContactAggregate & { sessionIds: Set<string> }>();

  for (const lead of leads) {
    const client = clientById.get(lead.clientId);
    if (!client) continue;

    const key = contactKey(lead);
    const createdAtIso = lead.createdAt.toISOString();
    const current = byKey.get(key);

    if (!current) {
      byKey.set(key, {
        clientId: lead.clientId,
        clientName: client.name,
        clientSlug: client.slug,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        website: lead.website,
        lastMessage: lead.message ?? null,
        interactionCount: 1,
        sessionsCount: lead.sessionId ? 1 : 0,
        firstInteractionAt: createdAtIso,
        lastInteractionAt: createdAtIso,
        sessionIds: new Set(lead.sessionId ? [lead.sessionId] : []),
      });
      continue;
    }

    current.interactionCount += 1;
    if (lead.sessionId) current.sessionIds.add(lead.sessionId);
    current.sessionsCount = current.sessionIds.size;
    if (createdAtIso > current.lastInteractionAt) {
      current.lastInteractionAt = createdAtIso;
      current.lastMessage = lead.message ?? current.lastMessage;
    }
    if (createdAtIso < current.firstInteractionAt) current.firstInteractionAt = createdAtIso;

    if (!current.email && lead.email) current.email = lead.email;
    if (!current.phone && lead.phone) current.phone = lead.phone;
    if (!current.website && lead.website) current.website = lead.website;
  }

  const contacts: ContactAggregate[] = [];
  for (const aggregate of byKey.values()) {
    contacts.push({
      clientId: aggregate.clientId,
      clientName: aggregate.clientName,
      clientSlug: aggregate.clientSlug,
      name: aggregate.name,
      email: aggregate.email,
      phone: aggregate.phone,
      website: aggregate.website,
      lastMessage: aggregate.lastMessage,
      interactionCount: aggregate.interactionCount,
      sessionsCount: aggregate.sessionsCount,
      firstInteractionAt: aggregate.firstInteractionAt,
      lastInteractionAt: aggregate.lastInteractionAt,
    });
  }
  contacts.sort((a, b) => b.lastInteractionAt.localeCompare(a.lastInteractionAt));

  return NextResponse.json({
    filters: { clientId: parsed.data.clientId ?? null },
    contacts,
  });
}
