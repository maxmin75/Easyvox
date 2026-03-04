import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { prismaAdmin } from "@/lib/prisma-admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return jsonError("Non autorizzato", 401);

  const clients = await prismaAdmin.client.findMany({
    where: {
      OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      ownerId: true,
      requireUserAuthForChat: true,
    },
  });

  return NextResponse.json({
    items: clients.map((client) => ({
      id: client.id,
      name: client.name,
      slug: client.slug,
      requireUserAuthForChat: client.requireUserAuthForChat,
      isOwner: client.ownerId === user.id,
    })),
  });
}
