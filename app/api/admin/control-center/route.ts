import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/prisma-admin";
import { requireAdminUser } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/errors";
import { isEasyVoxAdminEmail } from "@/lib/admin/access";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, denied } = await requireAdminUser(request);
  if (denied) return denied;
  if (!isEasyVoxAdminEmail(user.email)) return jsonError("Area riservata all'amministratore EasyVox.", 403);

  const [users, purchases, clients] = await Promise.all([
    prismaAdmin.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
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
