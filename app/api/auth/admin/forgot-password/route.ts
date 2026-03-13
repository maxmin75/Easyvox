import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { EASYVOX_ADMIN_EMAIL } from "@/lib/admin/access";
import { sendAdminPasswordResetEmail } from "@/lib/email/admin-reset";
import { getRuntimeSettings } from "@/lib/runtime-settings";

export const runtime = "nodejs";

const RESET_TTL_MINUTES = 30;
const RESET_IDENTIFIER = "easyvox-admin-password-reset";

const schema = z.object({
  email: z.string().email().max(190),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  if (email !== EASYVOX_ADMIN_EMAIL) {
    return NextResponse.json(
      { ok: true, message: "Se l'email e corretta, riceverai un link di recupero." },
      { status: 200 },
    );
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expires = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

  await prismaAdmin.verificationToken.deleteMany({
    where: { identifier: RESET_IDENTIFIER },
  });

  await prismaAdmin.verificationToken.create({
    data: {
      identifier: RESET_IDENTIFIER,
      token: tokenHash,
      expires,
    },
  });

  const runtimeSettings = await getRuntimeSettings();
  const origin = runtimeSettings.appBaseUrl ?? request.nextUrl.origin;
  const resetUrl = `${origin.replace(/\/$/, "")}/reset-password/admin?token=${encodeURIComponent(token)}`;
  const sent = await sendAdminPasswordResetEmail({
    to: email,
    resetUrl,
  });

  if (!sent.sent) {
    return NextResponse.json({ error: sent.error ?? "Invio email fallito" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: "Se l'email e corretta, riceverai un link di recupero.",
  });
}
