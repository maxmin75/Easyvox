import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, invalidateSessionFromRequest } from "@/lib/auth";
import { prismaAdmin } from "@/lib/prisma-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  await invalidateSessionFromRequest(request);
  const authJsCookieNames = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ];
  const authJsToken = authJsCookieNames
    .map((cookieName) => request.cookies.get(cookieName)?.value)
    .find((value) => Boolean(value));
  if (authJsToken) {
    await prismaAdmin.session.deleteMany({
      where: { sessionToken: authJsToken },
    });
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  for (const cookieName of authJsCookieNames) {
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
