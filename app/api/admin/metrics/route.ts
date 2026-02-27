import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/prisma-admin";
import { requireAdmin } from "@/lib/api/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const clientId = request.nextUrl.searchParams.get("clientId") ?? undefined;
  const where = clientId ? { clientId } : undefined;

  const [conversations, leads, feedback, documents, chunks] = await Promise.all([
    prismaAdmin.conversation.count({ where }),
    prismaAdmin.lead.count({ where }),
    prismaAdmin.feedback.count({ where }),
    prismaAdmin.document.count({ where }),
    prismaAdmin.chunk.count({ where }),
  ]);

  return NextResponse.json({
    filters: { clientId: clientId ?? null },
    totals: { conversations, leads, feedback, documents, chunks },
  });
}
