import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { requireAdminUser } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/errors";
import { claimLegacyClientsIfNeeded } from "@/lib/admin/clients";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  assistantName: z.string().min(2).max(80).optional(),
  canTakeAppointments: z.boolean().optional(),
  requireProfiling: z.boolean().optional(),
  systemPrompt: z.string().max(2000).optional(),
});

const updateSchema = createSchema.extend({
  id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const { user, denied } = await requireAdminUser(request);
  if (denied) return denied;
  await claimLegacyClientsIfNeeded(user.id);

  const clients = await prismaAdmin.client.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  const { user, denied } = await requireAdminUser(request);
  if (denied) return denied;
  await claimLegacyClientsIfNeeded(user.id);

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Payload non valido", 400);
  const totalClients = await prismaAdmin.client.count({ where: { ownerId: user.id } });
  if (totalClients >= 3) {
    return jsonError("Limite raggiunto: massimo 3 client.", 400);
  }

  let client;
  try {
    client = await prismaAdmin.client.create({
      data: {
        ...parsed.data,
        ownerId: user.id,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Slug gia esistente. Scegline uno diverso.", 409);
    }
    throw error;
  }
  return NextResponse.json(client, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { user, denied } = await requireAdminUser(request);
  if (denied) return denied;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Payload non valido", 400);

  const { id, ...data } = parsed.data;
  const found = await prismaAdmin.client.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true },
  });
  if (!found) return jsonError("Client non trovato", 404);

  let client;
  try {
    client = await prismaAdmin.client.update({ where: { id }, data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Slug gia esistente. Scegline uno diverso.", 409);
    }
    throw error;
  }
  return NextResponse.json(client);
}

export async function DELETE(request: NextRequest) {
  const { user, denied } = await requireAdminUser(request);
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonError("id mancante", 400);

  const found = await prismaAdmin.client.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true },
  });
  if (!found) return jsonError("Client non trovato", 404);

  await prismaAdmin.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
