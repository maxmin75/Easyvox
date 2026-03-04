import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserFromRequest, hashPassword } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { prismaAdmin } from "@/lib/prisma-admin";

export const runtime = "nodejs";

const createSchema = z.object({
  clientId: z.string().uuid(),
  email: z.string().email().max(190),
  password: z.string().min(8).max(120),
});

async function ensureOwner(clientId: string, userId: string) {
  const client = await prismaAdmin.client.findUnique({
    where: { id: clientId },
    select: { id: true, ownerId: true },
  });
  if (!client) return { client: null, denied: jsonError("Tenant non trovato", 404) };
  if (client.ownerId !== userId) return { client: null, denied: jsonError("Solo owner puo gestire utenti", 403) };
  return { client, denied: null };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return jsonError("Non autorizzato", 401);

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return jsonError("clientId mancante", 400);

  const { denied } = await ensureOwner(clientId, user.id);
  if (denied) return denied;

  const members = await prismaAdmin.clientUser.findMany({
    where: { clientId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      role: true,
      createdAt: true,
      lastChatLoginAt: true,
      user: {
        select: {
          id: true,
          email: true,
          createdAt: true,
          sessions: {
            where: { expiresAt: { gt: new Date() } },
            select: { id: true },
          },
        },
      },
    },
  });

  return NextResponse.json({
    items: members.map((member) => ({
      userId: member.user.id,
      email: member.user.email,
      role: member.role,
      addedAt: member.createdAt,
      userCreatedAt: member.user.createdAt,
      lastChatLoginAt: member.lastChatLoginAt,
      activeSessions: member.user.sessions.length,
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return jsonError("Non autorizzato", 401);

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Payload non valido", 400);

  const { clientId, email, password } = parsed.data;
  const { denied } = await ensureOwner(clientId, user.id);
  if (denied) return denied;

  const normalizedEmail = email.trim().toLowerCase();
  let memberUser = await prismaAdmin.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, passwordHash: true },
  });

  if (!memberUser) {
    memberUser = await prismaAdmin.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: hashPassword(password),
      },
      select: { id: true, passwordHash: true },
    });
  } else if (!memberUser.passwordHash) {
    memberUser = await prismaAdmin.user.update({
      where: { id: memberUser.id },
      data: { passwordHash: hashPassword(password) },
      select: { id: true, passwordHash: true },
    });
  }

  await prismaAdmin.clientUser.upsert({
    where: {
      clientId_userId: {
        clientId,
        userId: memberUser.id,
      },
    },
    create: {
      clientId,
      userId: memberUser.id,
      role: "MEMBER",
    },
    update: {
      role: "MEMBER",
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
