import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/prisma-admin";
import { requireEasyVoxAdminUser } from "@/lib/api/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { denied } = await requireEasyVoxAdminUser(request);
  if (denied) return denied;

  const [users, purchases, clients] = await Promise.all([
    prismaAdmin.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        planTier: true,
        plusPurchasedAt: true,
        createdAt: true,
        _count: {
          select: {
            clients: true,
            sessions: true,
          },
        },
      },
    }),
    prismaAdmin.lead.findMany({
      where: {
        OR: [{ purchaseIntentDetectedAt: { not: null } }, { purchaseEmailSentAt: { not: null } }],
      },
      orderBy: [{ purchaseIntentDetectedAt: "desc" }, { createdAt: "desc" }],
      take: 200,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        website: true,
        message: true,
        createdAt: true,
        purchaseIntentDetectedAt: true,
        purchaseEmailSentAt: true,
        purchaseEmailError: true,
        client: {
          select: {
            id: true,
            name: true,
            slug: true,
            owner: { select: { email: true } },
          },
        },
      },
    }),
    prismaAdmin.client.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        assistantName: true,
        canTakeAppointments: true,
        requireProfiling: true,
        createdAt: true,
        owner: { select: { email: true } },
        _count: {
          select: {
            documents: true,
            chunks: true,
            conversations: true,
            leads: true,
            appointments: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    totals: {
      users: users.length,
      plusUsers: users.filter((user) => user.planTier === "PLUS").length,
      tenants: clients.length,
      purchaseIntents: purchases.length,
    },
    users,
    purchases,
    clients: clients.map((client) => ({
      ...client,
      quickLinks: {
        demoChat: `/demo?clientId=${encodeURIComponent(client.id)}`,
        adminAgents: `/admin/agents`,
      },
    })),
  });
}
