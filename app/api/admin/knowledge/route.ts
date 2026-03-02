import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { requireAdminUser } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";

const agentSchema = z.object({
  agentId: z.string().uuid(),
});

const deleteSchema = z.object({
  agentId: z.string().uuid(),
  documentId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const { user, denied } = await requireAdminUser(request);
  if (denied) return denied;

  const parsed = agentSchema.safeParse({
    agentId: request.nextUrl.searchParams.get("agentId"),
  });
  if (!parsed.success) return jsonError("agentId non valido", 400);

  const agent = await prismaAdmin.client.findFirst({
    where: {
      id: parsed.data.agentId,
      ownerId: user.id,
    },
    select: { id: true },
  });
  if (!agent) return jsonError("Agente non trovato", 404);

  const documents = await prismaAdmin.document.findMany({
    where: { clientId: agent.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      source: true,
      createdAt: true,
    },
  });

  const chunkCounts = await prismaAdmin.chunk.groupBy({
    by: ["documentId"],
    where: { clientId: agent.id },
    _count: { _all: true },
  });
  const countMap = new Map(chunkCounts.map((row) => [row.documentId, row._count._all]));

  return NextResponse.json(
    documents.map((doc) => ({
      ...doc,
      chunkCount: countMap.get(doc.id) ?? 0,
    })),
  );
}

export async function DELETE(request: NextRequest) {
  const { user, denied } = await requireAdminUser(request);
  if (denied) return denied;

  const parsed = deleteSchema.safeParse({
    agentId: request.nextUrl.searchParams.get("agentId"),
    documentId: request.nextUrl.searchParams.get("documentId"),
  });
  if (!parsed.success) return jsonError("Parametri non validi", 400);

  const agent = await prismaAdmin.client.findFirst({
    where: {
      id: parsed.data.agentId,
      ownerId: user.id,
    },
    select: { id: true },
  });
  if (!agent) return jsonError("Agente non trovato", 404);

  const removed = await prismaAdmin.document.deleteMany({
    where: {
      id: parsed.data.documentId,
      clientId: agent.id,
    },
  });

  if (removed.count === 0) return jsonError("Documento non trovato", 404);
  return NextResponse.json({ ok: true });
}
