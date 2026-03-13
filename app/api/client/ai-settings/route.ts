import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";

export async function GET() {
  return jsonError("Area cliente disattivata. Usa il pannello admin.", 410);
}

export async function PUT() {
  return jsonError("Area cliente disattivata. Usa il pannello admin.", 410);
}
