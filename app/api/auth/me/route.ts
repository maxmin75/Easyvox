import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getAccessProfile } from "@/lib/access-profile";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const profile = await getAccessProfile(user);
  return NextResponse.json({
    user,
    isEasyVoxAdmin: profile.isEasyVoxAdmin,
    isChatOnlyUser: profile.isChatOnlyUser,
  });
}
