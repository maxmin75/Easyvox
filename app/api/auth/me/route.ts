import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { isEasyVoxAdminEmail } from "@/lib/admin/access";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user, isEasyVoxAdmin: isEasyVoxAdminEmail(user.email) });
}
