import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applySessionCookie, createAuthSession, verifyPassword } from "@/lib/auth";
import { prismaAdmin } from "@/lib/prisma-admin";
import { getTenantAccess, resolveTenantFromRequest, touchTenantMembership } from "@/lib/tenant-users";
import { sendChatAccessNotificationEmail } from "@/lib/email/chat-access";

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
  if (tenant.isSuspended) {
    return NextResponse.json({ error: "Tenant sospeso. Accesso chat temporaneamente disabilitato." }, { status: 423 });
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
      name: true,
      emailVerified: true,
      passwordHash: true,
    },
  });

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
  }
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "Devi confermare la tua email prima di accedere alla chat." },
      { status: 403 },
    );
  }

  const access = await getTenantAccess(tenant.id, user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: "Utente non abilitato per questo tenant" }, { status: 403 });
  }

  await touchTenantMembership(tenant.id, user.id, access.isOwner);
  void sendChatAccessNotificationEmail({
    customerName: user.name?.trim() || user.email.split("@")[0] || "Utente chat",
    customerEmail: user.email,
    accessedAt: new Date(),
    tenantSlug: tenant.slug,
    source: "login",
  }).catch((error) => {
    console.error("chat_access_login_notification_failed", {
      email: user.email,
      tenantSlug: tenant.slug,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  });
  const token = await createAuthSession(user.id);
  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email },
    tenant: { id: tenant.id, slug: tenant.slug },
  });
  applySessionCookie(response, token);
  return response;
}
