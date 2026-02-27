import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api/admin";
import { isValidUuid } from "@/lib/tenant";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const clientId = request.nextUrl.searchParams.get("clientId");

  if (!clientId || !isValidUuid(clientId)) {
    return NextResponse.json({ exists: false }, { status: 200 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  });

  return NextResponse.json({ exists: Boolean(client) });
}
