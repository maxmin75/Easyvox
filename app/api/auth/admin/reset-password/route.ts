import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { EASYVOX_ADMIN_EMAIL } from "@/lib/admin/access";
import { hashPassword } from "@/lib/auth";

export const runtime = "nodejs";

const RESET_IDENTIFIER = "easyvox-admin-password-reset";

const schema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(120),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const tokenHash = hashToken(parsed.data.token);
  const verification = await prismaAdmin.verificationToken.findUnique({
    where: { token: tokenHash },
  });

  if (!verification || verification.identifier !== RESET_IDENTIFIER || verification.expires.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Link di recupero non valido o scaduto." }, { status: 400 });
  }

  const user = await prismaAdmin.user.upsert({
    where: { email: EASYVOX_ADMIN_EMAIL },
    create: {
      email: EASYVOX_ADMIN_EMAIL,
      passwordHash: hashPassword(parsed.data.password),
    },
    update: {
      passwordHash: hashPassword(parsed.data.password),
    },
    select: { id: true },
  });

  await prismaAdmin.verificationToken.deleteMany({
    where: {
      OR: [{ token: tokenHash }, { identifier: RESET_IDENTIFIER }],
    },
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
