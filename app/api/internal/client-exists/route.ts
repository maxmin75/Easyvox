import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/prisma-admin";
import { isValidUuid } from "@/lib/tenant";

export const runtime = "nodejs";
const SLUG_REGEX = /^[a-z0-9-]{2,80}$/;

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId");
  const clientSlug = request.nextUrl.searchParams.get("clientSlug");

  if (clientId && isValidUuid(clientId)) {
    const client = await prismaAdmin.client.findUnique({
      where: { id: clientId },
      select: { id: true, slug: true },
    });

    return NextResponse.json({ exists: Boolean(client), clientId: client?.id ?? null, clientSlug: client?.slug ?? null });
  }

  if (!clientSlug || !SLUG_REGEX.test(clientSlug)) {
    return NextResponse.json({ exists: false }, { status: 200 });
  }

  const client = await prismaAdmin.client.findUnique({
    where: { slug: clientSlug },
    select: { id: true, slug: true },
  });

  return NextResponse.json({ exists: Boolean(client), clientId: client?.id ?? null, clientSlug: client?.slug ?? null });
}
