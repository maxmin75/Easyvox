import { NextRequest } from "next/server";
import { jsonError } from "@/lib/api/errors";

export function requireAdmin(request: NextRequest) {
  const providedSecret = request.headers.get("x-admin-secret");

  if (!process.env.ADMIN_SECRET) {
    return jsonError("ADMIN_SECRET non configurato", 500);
  }

  if (!providedSecret || providedSecret !== process.env.ADMIN_SECRET) {
    return jsonError("Non autorizzato", 401);
  }

  return null;
}
