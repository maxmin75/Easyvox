import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { requireAdminUser } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/errors";
import { claimLegacyClientsIfNeeded } from "@/lib/admin/clients";

export const runtime = "nodejs";

const querySchema = z.object({
  clientId: z.string().uuid().optional(),
  sessionLimit: z.coerce.number().int().min(1).max(100).optional(),
});

type SessionAggregate = {
  clientId: string;
  clientName: string;
  clientSlug: string;
  sessionId: string;
  startedAt: string;
  lastMessageAt: string;
  messages: Array<{
    id: string;
    createdAt: string;
    userMessage: string;
    assistantMessage: string;
  }>;
  files: Array<{
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }>;
  appointments: Array<{
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    scheduledFor: string;
    createdAt: string;
  }>;
  crmContacts: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    createdAt: string;
  }>;
};

export async function GET(request: NextRequest) {
  const { user, denied, isEasyVoxAdmin } = await requireAdminUser(request);
  if (denied) return denied;
  await claimLegacyClientsIfNeeded(user.id);

  const parsed = querySchema.safeParse({
    clientId: request.nextUrl.searchParams.get("clientId") ?? undefined,
    sessionLimit: request.nextUrl.searchParams.get("sessionLimit") ?? undefined,
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
    return NextResponse.json({ filters: { clientId: parsed.data.clientId ?? null }, sessions: [] });
  }

  const rows = await prismaAdmin.conversation.findMany({
    where: { clientId: { in: ownedClientIds } },
    orderBy: { createdAt: "desc" },
    take: 1500,
    select: {
      id: true,
      clientId: true,
      sessionId: true,
      userMessage: true,
      assistantMessage: true,
      createdAt: true,
    },
  });

  const clientById = new Map(ownedClients.map((client) => [client.id, client] as const));
  const sessionsMap = new Map<string, SessionAggregate>();

  for (const row of rows) {
    const key = `${row.clientId}:${row.sessionId}`;
    const client = clientById.get(row.clientId);
    if (!client) continue;

    const current = sessionsMap.get(key);
    const createdAtIso = row.createdAt.toISOString();
    if (!current) {
      sessionsMap.set(key, {
        clientId: row.clientId,
        clientName: client.name,
        clientSlug: client.slug,
        sessionId: row.sessionId,
        startedAt: createdAtIso,
        lastMessageAt: createdAtIso,
        messages: [
          {
            id: row.id,
            createdAt: createdAtIso,
            userMessage: row.userMessage,
            assistantMessage: row.assistantMessage,
          },
        ],
        files: [],
        appointments: [],
        crmContacts: [],
      });
      continue;
    }

    current.messages.push({
      id: row.id,
      createdAt: createdAtIso,
      userMessage: row.userMessage,
      assistantMessage: row.assistantMessage,
    });
    if (createdAtIso > current.lastMessageAt) current.lastMessageAt = createdAtIso;
    if (createdAtIso < current.startedAt) current.startedAt = createdAtIso;
  }

  const allSessions = [...sessionsMap.values()];
  for (const session of allSessions) {
    session.messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  allSessions.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  const limitedSessions = allSessions.slice(0, parsed.data.sessionLimit ?? 30);

  if (limitedSessions.length === 0) {
    return NextResponse.json({ filters: { clientId: parsed.data.clientId ?? null }, sessions: [] });
  }

  const sessionIds = [...new Set(limitedSessions.map((session) => session.sessionId))];
  const limitedClientIds = [...new Set(limitedSessions.map((session) => session.clientId))];

  const [files, appointments, crmContacts] = await Promise.all([
    prismaAdmin.fileAsset.findMany({
      where: { clientId: { in: limitedClientIds }, sessionId: { in: sessionIds } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        clientId: true,
        sessionId: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    }),
    prismaAdmin.appointment.findMany({
      where: { clientId: { in: limitedClientIds }, sessionId: { in: sessionIds } },
      orderBy: { scheduledFor: "asc" },
      select: {
        id: true,
        clientId: true,
        sessionId: true,
        fullName: true,
        email: true,
        phone: true,
        scheduledFor: true,
        createdAt: true,
      },
    }),
    prismaAdmin.lead.findMany({
      where: { clientId: { in: limitedClientIds }, sessionId: { in: sessionIds } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        clientId: true,
        sessionId: true,
        name: true,
        email: true,
        phone: true,
        website: true,
        createdAt: true,
      },
    }),
  ]);

  const byKey = new Map(limitedSessions.map((session) => [`${session.clientId}:${session.sessionId}`, session]));
  for (const file of files) {
    if (!file.sessionId) continue;
    byKey.get(`${file.clientId}:${file.sessionId}`)?.files.push({
      id: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      createdAt: file.createdAt.toISOString(),
    });
  }
  for (const appointment of appointments) {
    if (!appointment.sessionId) continue;
    byKey.get(`${appointment.clientId}:${appointment.sessionId}`)?.appointments.push({
      id: appointment.id,
      fullName: appointment.fullName,
      email: appointment.email,
      phone: appointment.phone,
      scheduledFor: appointment.scheduledFor.toISOString(),
      createdAt: appointment.createdAt.toISOString(),
    });
  }
  for (const contact of crmContacts) {
    if (!contact.sessionId) continue;
    byKey.get(`${contact.clientId}:${contact.sessionId}`)?.crmContacts.push({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      website: contact.website,
      createdAt: contact.createdAt.toISOString(),
    });
  }

  return NextResponse.json({
    filters: { clientId: parsed.data.clientId ?? null },
    sessions: limitedSessions,
  });
}
