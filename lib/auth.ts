import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/prisma-admin";
import { getServerAuthSession } from "@/auth";

const SESSION_COOKIE = "easyvox_session";
const SESSION_TTL_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string | null | undefined): boolean {
  if (!passwordHash) return false;
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) return false;
  const candidateHash = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(candidateHash, "hex"));
}

export async function createAuthSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prismaAdmin.userSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });
  return token;
}

export function applySessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function invalidateSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return;

  await prismaAdmin.userSession.deleteMany({
    where: { tokenHash: hashToken(token) },
  });
}

export async function getAuthUserFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const legacyUser = await getAuthUserFromToken(token ?? null);
  if (legacyUser) return legacyUser;
  return getAuthUserFromNextAuthSession();
}

export async function getAuthUserFromToken(token: string | null) {
  if (!token) return null;

  const session = await prismaAdmin.userSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: { id: true, email: true, createdAt: true },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prismaAdmin.userSession.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

export async function getAuthUserFromNextAuthSession() {
  const session = await getServerAuthSession();
  if (!session?.user) return null;

  if (session.user.id) {
    const user = await prismaAdmin.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, createdAt: true },
    });
    if (user) return user;
  }

  if (!session.user.email) return null;
  return prismaAdmin.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, createdAt: true },
  });
}

export const authCookieName = SESSION_COOKIE;
