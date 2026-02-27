import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  systemPrompt: z.string().max(2000).optional(),
});

const updateSchema = createSchema.extend({
  id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Payload non valido", 400);

  const client = await prisma.client.create({ data: parsed.data });
  return NextResponse.json(client, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Payload non valido", 400);

  const { id, ...data } = parsed.data;
  const client = await prisma.client.update({ where: { id }, data });
  return NextResponse.json(client);
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonError("id mancante", 400);

  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
