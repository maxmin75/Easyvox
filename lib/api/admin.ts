import { NextRequest } from "next/server";
import { jsonError } from "@/lib/api/errors";
import { getAuthUserFromRequest } from "@/lib/auth";

export async function requireAdminUser(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return { user: null, denied: jsonError("Non autorizzato", 401) };
  }
  return { user, denied: null };
}
