import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applySessionCookie, createAuthSession, verifyPassword } from "@/lib/auth";
import { prismaAdmin } from "@/lib/prisma-admin";
import { getTenantAccess, resolveTenantFromRequest, touchTenantMembership } from "@/lib/tenant-users";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email().max(190),
  password: z.string().min(8).max(120),
});

export async function POST(request: NextRequest) {
  const tenant = await resolveTenantFromRequest(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant non trovato" }, { status: 404 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prismaAdmin.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
  }

  const access = await getTenantAccess(tenant.id, user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: "Utente non abilitato per questo tenant" }, { status: 403 });
  }

  await touchTenantMembership(tenant.id, user.id, access.isOwner);
  const token = await createAuthSession(user.id);
  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email },
    tenant: { id: tenant.id, slug: tenant.slug },
  });
  applySessionCookie(response, token);
  return response;
}
