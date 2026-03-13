import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { applySessionCookie, createAuthSession, hashPassword } from "@/lib/auth";
import { sendUserRegistrationNotificationEmail } from "@/lib/email/user-registration";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(190),
  password: z.string().min(8).max(120),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existingUser = await prismaAdmin.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json({ error: "Email gia registrata" }, { status: 409 });
  }

  const user = await prismaAdmin.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      passwordHash: hashPassword(parsed.data.password),
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  const notificationResult = await sendUserRegistrationNotificationEmail({
    registeredName: user.name ?? parsed.data.name.trim(),
    registeredEmail: user.email,
    registeredAt: user.createdAt,
    source: "admin",
    tenantSlug: null,
  }).catch((error) => {
    console.error("registration_notification_failed", {
      email: user.email,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return null;
  });

  if (notificationResult?.sent) {
    console.info("registration_notification_sent", {
      email: user.email,
      id: notificationResult.id ?? null,
    });
  } else {
    console.error("registration_notification_not_sent", {
      email: user.email,
      error: notificationResult?.error ?? "unknown_error",
    });
  }

  const token = await createAuthSession(user.id);
  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    notificationEmailSent: notificationResult?.sent === true,
  });
  applySessionCookie(response, token);

  return response;
}
