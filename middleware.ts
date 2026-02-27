import { NextRequest, NextResponse } from "next/server";
import { isValidUuid } from "@/lib/tenant";

const TENANT_SCOPED_PREFIXES = ["/api/chat", "/api/lead", "/api/feedback", "/api/ingest", "/api/files"];

async function tenantExists(request: NextRequest, clientId: string) {
  const url = new URL("/api/internal/client-exists", request.url);
  url.searchParams.set("clientId", clientId);

  const response = await fetch(url.toString(), {
    headers: {
      "x-admin-secret": process.env.ADMIN_SECRET ?? "",
      "x-middleware-request": "1",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return false;
  }

  const body = (await response.json()) as { exists?: boolean };
  return body.exists === true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiresTenant = TENANT_SCOPED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!requiresTenant) {
    return NextResponse.next();
  }

  const headerClientId = request.headers.get("x-client-id");
  const queryClientId = request.nextUrl.searchParams.get("clientId");
  const clientId = headerClientId ?? queryClientId;

  if (!clientId) {
    return NextResponse.json({ error: "clientId obbligatorio" }, { status: 400 });
  }

  if (!isValidUuid(clientId)) {
    return NextResponse.json({ error: "clientId non valido" }, { status: 400 });
  }

  const exists = await tenantExists(request, clientId);

  if (!exists) {
    return NextResponse.json({ error: "clientId non trovato" }, { status: 404 });
  }

  const headers = new Headers(request.headers);
  headers.set("x-client-id", clientId);

  return NextResponse.next({
    request: {
      headers,
    },
  });
}

export const config = {
  matcher: ["/api/:path*"],
};
