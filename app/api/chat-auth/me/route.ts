import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getTenantAccess, resolveTenantFromRequest, touchTenantMembership } from "@/lib/tenant-users";

export const runtime = "nodejs";
const CHAT_GOOGLE_TENANT_COOKIE = "easyvox_chat_google_tenant";

export async function GET(request: NextRequest) {
  const tenant = await resolveTenantFromRequest(request);
  if (!tenant) {
    return NextResponse.json({ user: null, tenant: null }, { status: 200 });
  }
  if (tenant.isSuspended) {
    return NextResponse.json({
      user: null,
      tenant: { id: tenant.id, slug: tenant.slug, isSuspended: true, requireUserAuthForChat: tenant.requireUserAuthForChat },
    });
  }

  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({
      user: null,
      tenant: { id: tenant.id, slug: tenant.slug, isSuspended: false, requireUserAuthForChat: tenant.requireUserAuthForChat },
    }, { status: 200 });
  }

  const access = await getTenantAccess(tenant.id, user.id);
  if (!access.hasAccess) {
    const pendingGoogleTenantId = request.cookies.get(CHAT_GOOGLE_TENANT_COOKIE)?.value ?? "";
    if (pendingGoogleTenantId && pendingGoogleTenantId === tenant.id) {
      await touchTenantMembership(tenant.id, user.id, false);
      const response = NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name ?? null },
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          requireUserAuthForChat: tenant.requireUserAuthForChat,
        },
      });
      response.cookies.set(CHAT_GOOGLE_TENANT_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    return NextResponse.json({
      user: null,
      tenant: { id: tenant.id, slug: tenant.slug, isSuspended: false, requireUserAuthForChat: tenant.requireUserAuthForChat },
    }, { status: 200 });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name ?? null },
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      requireUserAuthForChat: tenant.requireUserAuthForChat,
    },
  });
}
