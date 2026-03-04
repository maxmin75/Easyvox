import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, invalidateSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  await invalidateSessionFromRequest(request);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
