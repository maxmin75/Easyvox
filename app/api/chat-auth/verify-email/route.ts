import { NextRequest, NextResponse } from "next/server";
import { applySessionCookie, createAuthSession } from "@/lib/auth";
import { consumeChatEmailVerificationToken } from "@/lib/chat-email-verification";
import { sendChatAccessNotificationEmail } from "@/lib/email/chat-access";
import { sendUserRegistrationNotificationEmail } from "@/lib/email/user-registration";
import { getRuntimeSettings } from "@/lib/runtime-settings";
import { prismaAdmin } from "@/lib/prisma-admin";
import { touchTenantMembership } from "@/lib/tenant-users";

export const runtime = "nodejs";

function buildRedirectUrl(origin: string, tenantSlug?: string | null, status?: "success" | "invalid" | "expired") {
  const url = new URL("/demo", origin);
  if (tenantSlug) {
    url.searchParams.set("ditta", tenantSlug);
  }
  if (status) {
    url.searchParams.set("chatEmailVerification", status);
  }
  return url;
}

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const runtimeSettings = await getRuntimeSettings();
  const origin = runtimeSettings.appBaseUrl ?? request.nextUrl.origin;

  if (!rawToken) {
    return NextResponse.redirect(buildRedirectUrl(origin, null, "invalid"));
  }

  const result = await consumeChatEmailVerificationToken(rawToken);
  if (!result.ok) {
    return NextResponse.redirect(buildRedirectUrl(origin, null, result.reason));
  }

  const [user, tenant] = await Promise.all([
    prismaAdmin.user.findUnique({
      where: { id: result.userId },
      select: { id: true, email: true, name: true, createdAt: true, emailVerified: true },
    }),
    prismaAdmin.client.findUnique({
      where: { id: result.tenantId },
      select: { id: true, slug: true, ownerId: true },
    }),
  ]);

  if (!user || !tenant) {
    return NextResponse.redirect(buildRedirectUrl(origin, tenant?.slug ?? null, "invalid"));
  }

  if (!user.emailVerified) {
    await prismaAdmin.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }

  await touchTenantMembership(tenant.id, user.id, tenant.ownerId === user.id);

  void sendUserRegistrationNotificationEmail({
    registeredName: user.name?.trim() || user.email.split("@")[0] || "Utente chat",
    registeredEmail: user.email,
    registeredAt: user.createdAt,
    source: "chat",
    tenantSlug: tenant.slug,
  }).catch(() => null);

  void sendChatAccessNotificationEmail({
    customerName: user.name?.trim() || user.email.split("@")[0] || "Utente chat",
    customerEmail: user.email,
    accessedAt: new Date(),
    tenantSlug: tenant.slug,
    source: "register",
  }).catch(() => null);

  const token = await createAuthSession(user.id);
  const response = NextResponse.redirect(buildRedirectUrl(origin, tenant.slug, "success"));
  applySessionCookie(response, token);
  return response;
}
