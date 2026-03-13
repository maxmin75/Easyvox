import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";

export async function GET() {
  return jsonError("Area cliente disattivata. Usa gli strumenti chat dall'admin.", 410);
}
