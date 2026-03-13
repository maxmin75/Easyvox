import { createHash, randomBytes } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";

const CHAT_EMAIL_VERIFY_PREFIX = "easyvox-chat-email-verify";
const VERIFY_TTL_HOURS = 24;

export function hashVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildChatEmailVerificationIdentifier(userId: string, tenantId: string) {
  return `${CHAT_EMAIL_VERIFY_PREFIX}:${userId}:${tenantId}`;
}

export function parseChatEmailVerificationIdentifier(identifier: string | null | undefined) {
  if (!identifier?.startsWith(`${CHAT_EMAIL_VERIFY_PREFIX}:`)) return null;
  const [, , userId, tenantId] = identifier.split(":");
  if (!userId || !tenantId) return null;
  return { userId, tenantId };
}

export async function createChatEmailVerificationToken(userId: string, tenantId: string) {
  const token = randomBytes(32).toString("hex");
  const identifier = buildChatEmailVerificationIdentifier(userId, tenantId);
  const expires = new Date(Date.now() + VERIFY_TTL_HOURS * 60 * 60 * 1000);

  await prismaAdmin.verificationToken.deleteMany({
    where: { identifier },
  });

  await prismaAdmin.verificationToken.create({
    data: {
      identifier,
      token: hashVerificationToken(token),
      expires,
    },
  });

  return { token, identifier, expires };
}

export async function consumeChatEmailVerificationToken(token: string) {
  const tokenHash = hashVerificationToken(token);
  const verification = await prismaAdmin.verificationToken.findUnique({
    where: { token: tokenHash },
  });

  if (!verification) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const parsed = parseChatEmailVerificationIdentifier(verification.identifier);
  if (!parsed) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (verification.expires.getTime() <= Date.now()) {
    await prismaAdmin.verificationToken.deleteMany({
      where: { token: tokenHash },
    });
    return { ok: false as const, reason: "expired" as const, ...parsed };
  }

  await prismaAdmin.verificationToken.deleteMany({
    where: {
      OR: [{ token: tokenHash }, { identifier: verification.identifier }],
    },
  });

  return { ok: true as const, ...parsed };
}
