import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { applySessionCookie, createAuthSession, verifyPassword } from "@/lib/auth";

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
  const user = await prismaAdmin.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, createdAt: true },
  });

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
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
