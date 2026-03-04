import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getTenantAccess, resolveTenantFromRequest } from "@/lib/tenant-users";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const tenant = await resolveTenantFromRequest(request);
  if (!tenant) {
    return NextResponse.json({ user: null, tenant: null }, { status: 200 });
  }

  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ user: null, tenant: { id: tenant.id, slug: tenant.slug } }, { status: 200 });
  }

  const access = await getTenantAccess(tenant.id, user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ user: null, tenant: { id: tenant.id, slug: tenant.slug } }, { status: 200 });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      requireUserAuthForChat: tenant.requireUserAuthForChat,
    },
  });
}
