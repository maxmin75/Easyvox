import type { NextRequest } from "next/server";
import { prismaAdmin } from "@/lib/prisma-admin";
import { isValidUuid } from "@/lib/tenant";

const SLUG_REGEX = /^[a-z0-9-]{2,80}$/;

export type ResolvedTenant = {
  id: string;
  slug: string;
  ownerId: string | null;
  requireUserAuthForChat: boolean;
};

export async function resolveTenantFromRequest(request: NextRequest): Promise<ResolvedTenant | null> {
  const headerClientId = request.headers.get("x-client-id")?.trim();
  const headerClientSlug = request.headers.get("x-client-slug")?.trim().toLowerCase();
  const queryClientId = request.nextUrl.searchParams.get("clientId")?.trim();
  const queryClientSlug =
    request.nextUrl.searchParams.get("clientSlug")?.trim().toLowerCase() ??
    request.nextUrl.searchParams.get("username")?.trim().toLowerCase() ??
    request.nextUrl.searchParams.get("ditta")?.trim().toLowerCase();

  const clientId = headerClientId || queryClientId;
  if (clientId && isValidUuid(clientId)) {
    const tenant = await prismaAdmin.client.findUnique({
      where: { id: clientId },
      select: { id: true, slug: true, ownerId: true, requireUserAuthForChat: true },
    });
    return tenant;
  }

  const clientSlug = headerClientSlug || queryClientSlug;
  if (!clientSlug || !SLUG_REGEX.test(clientSlug)) return null;

  const tenant = await prismaAdmin.client.findUnique({
    where: { slug: clientSlug },
    select: { id: true, slug: true, ownerId: true, requireUserAuthForChat: true },
  });
  return tenant;
}

export async function getTenantAccess(clientId: string, userId: string) {
  const client = await prismaAdmin.client.findUnique({
    where: { id: clientId },
    select: { ownerId: true },
  });
  if (!client) return { hasAccess: false, isOwner: false };

  const isOwner = client.ownerId === userId;
  if (isOwner) return { hasAccess: true, isOwner: true };

  const member = await prismaAdmin.clientUser.findUnique({
    where: {
      clientId_userId: {
        clientId,
        userId,
      },
    },
    select: { id: true },
  });

  return { hasAccess: Boolean(member), isOwner: false };
}

export async function touchTenantMembership(clientId: string, userId: string, isOwner: boolean) {
  await prismaAdmin.clientUser.upsert({
    where: {
      clientId_userId: {
        clientId,
        userId,
      },
    },
    create: {
      clientId,
      userId,
      role: isOwner ? "OWNER" : "MEMBER",
      lastChatLoginAt: new Date(),
    },
    update: {
      role: isOwner ? "OWNER" : "MEMBER",
      lastChatLoginAt: new Date(),
    },
  });
}
