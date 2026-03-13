import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";

export async function GET() {
  return jsonError("Area cliente disattivata. Gestisci gli utenti chat da admin.", 410);
}

export async function POST() {
  return jsonError("Area cliente disattivata. Gestisci gli utenti chat da admin.", 410);
}
