import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/prisma-admin";
import { requireAdminUser } from "@/lib/api/admin";
import { claimLegacyClientsIfNeeded } from "@/lib/admin/clients";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, denied } = await requireAdminUser(request);
  if (denied) return denied;
  await claimLegacyClientsIfNeeded(user.id);

  const clientId = request.nextUrl.searchParams.get("clientId") ?? undefined;
  const ownedClients = await prismaAdmin.client.findMany({
    where: { ownerId: user.id, ...(clientId ? { id: clientId } : {}) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      canTakeAppointments: true,
      _count: {
        select: {
          conversations: true,
          leads: true,
          appointments: true,
          feedback: true,
          documents: true,
          chunks: true,
        },
      },
      appointments: {
        orderBy: { scheduledFor: "asc" },
        take: 5,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          scheduledFor: true,
        },
      },
    },
  });
  const ownedClientIds = ownedClients.map((client) => client.id);

  if (clientId) {
    if (!ownedClientIds.includes(clientId)) {
      return NextResponse.json({ error: "Client non trovato" }, { status: 404 });
    }
  }
  const totals = ownedClients.reduce(
    (acc, client) => {
      acc.conversations += client._count.conversations;
      acc.leads += client._count.leads;
      acc.appointments += client._count.appointments;
      acc.feedback += client._count.feedback;
      acc.documents += client._count.documents;
      acc.chunks += client._count.chunks;
      return acc;
    },
    {
      conversations: 0,
      leads: 0,
      appointments: 0,
      feedback: 0,
      documents: 0,
      chunks: 0,
    },
  );

  return NextResponse.json({
    filters: { clientId: clientId ?? null },
    totals,
    byClient: ownedClients.map((client) => ({
      id: client.id,
      name: client.name,
      slug: client.slug,
      canTakeAppointments: client.canTakeAppointments,
      totals: {
        conversations: client._count.conversations,
        leads: client._count.leads,
        appointments: client._count.appointments,
        feedback: client._count.feedback,
        documents: client._count.documents,
        chunks: client._count.chunks,
      },
      latestAppointments: client.appointments,
    })),
  });
}
