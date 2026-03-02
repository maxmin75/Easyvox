import { NextRequest, NextResponse } from "next/server";

const TENANT_SCOPED_PREFIXES = ["/api/chat", "/api/lead", "/api/feedback", "/api/ingest", "/api/files"];
const SLUG_REGEX = /^[a-z0-9-]{2,80}$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveTenant(request: NextRequest, tenant: { clientId?: string; clientSlug?: string }) {
  const url = new URL("/api/internal/client-exists", request.url);
  if (tenant.clientId) {
    url.searchParams.set("clientId", tenant.clientId);
  } else if (tenant.clientSlug) {
    url.searchParams.set("clientSlug", tenant.clientSlug);
  }

  const response = await fetch(url.toString(), {
    headers: {
      "x-middleware-request": "1",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return { exists: false, clientId: null, clientSlug: null };
  }

  const body = (await response.json()) as { exists?: boolean; clientId?: string | null; clientSlug?: string | null };
  return {
    exists: body.exists === true,
    clientId: body.clientId ?? null,
    clientSlug: body.clientSlug ?? null,
  };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiresTenant = TENANT_SCOPED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!requiresTenant) {
    return NextResponse.next();
  }

  const headerClientId = request.headers.get("x-client-id");
  const headerClientSlug = request.headers.get("x-client-slug");
  const queryClientId = request.nextUrl.searchParams.get("clientId");
  const queryClientSlug =
    request.nextUrl.searchParams.get("clientSlug") ??
    request.nextUrl.searchParams.get("username") ??
    request.nextUrl.searchParams.get("ditta");
  const tenantIdentifier = (headerClientId ?? queryClientId ?? headerClientSlug ?? queryClientSlug)?.trim();

  if (!tenantIdentifier && pathname.startsWith("/api/chat")) {
    return NextResponse.next();
  }

  if (!tenantIdentifier) {
    return NextResponse.json({ error: "clientId o username obbligatorio" }, { status: 400 });
  }

  const tenant = UUID_REGEX.test(tenantIdentifier)
    ? { clientId: tenantIdentifier }
    : { clientSlug: tenantIdentifier.toLowerCase() };

  if (tenant.clientSlug && !SLUG_REGEX.test(tenant.clientSlug)) {
    return NextResponse.json({ error: "username non valido" }, { status: 400 });
  }

  const resolved = await resolveTenant(request, tenant);

  if (!resolved.exists || !resolved.clientId) {
    return NextResponse.json({ error: "tenant non trovato" }, { status: 404 });
  }

  const headers = new Headers(request.headers);
  headers.set("x-client-id", resolved.clientId);
  if (resolved.clientSlug) headers.set("x-client-slug", resolved.clientSlug);

  return NextResponse.next({
    request: {
      headers,
    },
  });
}

export const config = {
  matcher: ["/api/:path*"],
};
