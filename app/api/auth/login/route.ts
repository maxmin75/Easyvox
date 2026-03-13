import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { applySessionCookie, createAuthSession, hashPassword, verifyPassword } from "@/lib/auth";
import { EASYVOX_ADMIN_EMAIL, EASYVOX_ADMIN_PASSWORD } from "@/lib/admin/access";

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
  if (email !== EASYVOX_ADMIN_EMAIL) {
    return NextResponse.json({ error: "Accesso admin consentito solo all'amministratore del sito" }, { status: 403 });
  }

  let user = await prismaAdmin.user.findUnique({
    where: { email: EASYVOX_ADMIN_EMAIL },
    select: { id: true, email: true, passwordHash: true, createdAt: true },
  });

  if (!user) {
    user = await prismaAdmin.user.create({
      data: {
        email: EASYVOX_ADMIN_EMAIL,
        passwordHash: hashPassword(EASYVOX_ADMIN_PASSWORD),
      },
      select: { id: true, email: true, passwordHash: true, createdAt: true },
    });
  }

  if (!user.passwordHash) {
    user = await prismaAdmin.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(EASYVOX_ADMIN_PASSWORD) },
      select: { id: true, email: true, passwordHash: true, createdAt: true },
    });
  }

  const storedPasswordMatches = verifyPassword(parsed.data.password, user.passwordHash);
  const envPasswordMatches = parsed.data.password === EASYVOX_ADMIN_PASSWORD;
  const storedHashIsEnvPassword = verifyPassword(EASYVOX_ADMIN_PASSWORD, user.passwordHash);

  if (!storedPasswordMatches && !(envPasswordMatches && storedHashIsEnvPassword)) {
    return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
  }

  const token = await createAuthSession(user.id);
  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
  });
  applySessionCookie(response, token);
  return response;
}
