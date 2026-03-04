import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { applySessionCookie, createAuthSession, hashPassword } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email().max(190),
  password: z.string().min(8).max(120),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prismaAdmin.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Email gia registrata" }, { status: 409 });
  }

  const user = await prismaAdmin.user.create({
    data: {
      email,
      passwordHash: hashPassword(parsed.data.password),
    },
    select: { id: true, email: true, createdAt: true },
  });

  const baseSlug =
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace";
  let workspaceSlug = `${baseSlug}-workspace`;
  let suffix = 1;
  while (await prismaAdmin.client.findUnique({ where: { slug: workspaceSlug }, select: { id: true } })) {
    suffix += 1;
    workspaceSlug = `${baseSlug}-workspace-${suffix}`;
  }

  const client = await prismaAdmin.client.create({
    data: {
      ownerId: user.id,
      name: "Workspace",
      slug: workspaceSlug,
      assistantName: "Assistant",
      systemPrompt: "Rispondi in modo chiaro e utile basandoti sui documenti caricati.",
    },
    select: { id: true },
  });

  await prismaAdmin.clientUser.upsert({
    where: {
      clientId_userId: {
        clientId: client.id,
        userId: user.id,
      },
    },
    create: {
      clientId: client.id,
      userId: user.id,
      role: "OWNER",
    },
    update: {
      role: "OWNER",
    },
  });

  const token = await createAuthSession(user.id);
  const response = NextResponse.json({ ok: true, user }, { status: 201 });
  applySessionCookie(response, token);
  return response;
}
