import { NextRequest } from "next/server";
import { jsonError } from "@/lib/api/errors";
import { getAuthUserFromRequest } from "@/lib/auth";
import { isEasyVoxAdminEmail } from "@/lib/admin/access";

export async function requireAdminUser(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return { user: null, denied: jsonError("Non autorizzato", 401), isEasyVoxAdmin: false };
  }
  return { user, denied: null, isEasyVoxAdmin: isEasyVoxAdminEmail(user.email) };
}

export async function requireEasyVoxAdminUser(request: NextRequest) {
  const { user, denied } = await requireAdminUser(request);
  if (denied) return { user: null, denied, isEasyVoxAdmin: false };
  if (!user || !isEasyVoxAdminEmail(user.email)) {
    return { user: null, denied: jsonError("Area riservata all'amministratore EasyVox.", 403), isEasyVoxAdmin: false };
  }
  return { user, denied: null, isEasyVoxAdmin: true };
}
