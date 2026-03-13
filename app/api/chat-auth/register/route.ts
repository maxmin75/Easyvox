import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { hashPassword } from "@/lib/auth";
import { createChatEmailVerificationToken } from "@/lib/chat-email-verification";
import { resolveTenantFromRequest } from "@/lib/tenant-users";
import { sendChatEmailVerificationEmail } from "@/lib/email/chat-email-verification";
import { getRuntimeSettings } from "@/lib/runtime-settings";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(190),
  password: z.string().min(8).max(120),
});

export async function POST(request: NextRequest) {
  const tenant = await resolveTenantFromRequest(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant non trovato" }, { status: 404 });
  }
  if (tenant.isSuspended) {
    return NextResponse.json({ error: "Tenant sospeso. Accesso chat temporaneamente disabilitato." }, { status: 423 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existingUser = await prismaAdmin.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });

  if (existingUser?.emailVerified) {
    return NextResponse.json({ error: "Email gia registrata. Accedi con le tue credenziali." }, { status: 409 });
  }

  const normalizedName = parsed.data.name.trim();
  const passwordHash = hashPassword(parsed.data.password);

  const user = existingUser
    ? await prismaAdmin.user.update({
        where: { id: existingUser.id },
        data: {
          name: normalizedName,
          passwordHash,
          memberships: {
            upsert: {
              where: {
                clientId_userId: {
                  clientId: tenant.id,
                  userId: existingUser.id,
                },
              },
              create: {
                clientId: tenant.id,
                role: "MEMBER",
              },
              update: {},
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      })
    : await prismaAdmin.user.create({
        data: {
          name: normalizedName,
          email,
          passwordHash,
          memberships: {
            create: {
              clientId: tenant.id,
              role: "MEMBER",
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

  const { token } = await createChatEmailVerificationToken(user.id, tenant.id);
  const runtimeSettings = await getRuntimeSettings();
  const origin = runtimeSettings.appBaseUrl ?? request.nextUrl.origin;
  const verifyUrl = `${origin.replace(/\/$/, "")}/api/chat-auth/verify-email?token=${encodeURIComponent(token)}`;
  const verificationResult = await sendChatEmailVerificationEmail({
    to: user.email,
    customerName: user.name?.trim() || normalizedName,
    tenantName: tenant.slug,
    verifyUrl,
  }).catch((error) => {
    console.error("chat_email_verification_send_failed", {
      email: user.email,
      tenantSlug: tenant.slug,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return null;
  });

  if (!verificationResult?.sent) {
    return NextResponse.json(
      { error: verificationResult?.error ?? "Invio email di conferma fallito" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    pendingVerification: true,
    user: { id: user.id, email: user.email, name: user.name ?? null, createdAt: user.createdAt },
    tenant: { id: tenant.id, slug: tenant.slug },
  });
}
