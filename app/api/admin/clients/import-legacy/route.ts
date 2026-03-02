import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/prisma-admin";
import { requireAdminUser } from "@/lib/api/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { user, denied } = await requireAdminUser(request);
  if (denied) return denied;

  const mine = await prismaAdmin.client.count({ where: { ownerId: user.id } });
  const remaining = Math.max(0, 3 - mine);
  if (remaining === 0) {
    return NextResponse.json({ imported: 0, message: "Limite gia raggiunto (3 client)." });
  }

  const legacy = await prismaAdmin.client.findMany({
    where: { ownerId: null },
    orderBy: { createdAt: "asc" },
    take: remaining,
    select: { id: true },
  });

  if (legacy.length === 0) {
    return NextResponse.json({ imported: 0, message: "Nessun client legacy da importare." });
  }

  const ids = legacy.map((item) => item.id);
  await prismaAdmin.client.updateMany({
    where: { id: { in: ids } },
    data: { ownerId: user.id },
  });

  return NextResponse.json({ imported: legacy.length, message: `Importati ${legacy.length} client legacy.` });
}
