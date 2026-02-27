import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const clientId = request.nextUrl.searchParams.get("clientId") ?? undefined;
  const where = clientId ? { clientId } : undefined;

  const [conversations, leads, feedback, documents, chunks] = await Promise.all([
    prisma.conversation.count({ where }),
    prisma.lead.count({ where }),
    prisma.feedback.count({ where }),
    prisma.document.count({ where }),
    prisma.chunk.count({ where }),
  ]);

  return NextResponse.json({
    filters: { clientId: clientId ?? null },
    totals: { conversations, leads, feedback, documents, chunks },
  });
}
