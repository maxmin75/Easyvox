import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import Google from "next-auth/providers/google";
import Twitter from "next-auth/providers/twitter";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prismaAdmin } from "@/lib/prisma-admin";

function buildProviders() {
  return [
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
          authorization: {
            params: {
              scope: "openid email profile",
            },
          },
          profile(profile) {
            return {
              id: String(profile.sub),
              name: profile.name ?? null,
              email: profile.email ?? null,
              image: null,
            };
          },
        })
      : null,
    process.env.AUTH_TWITTER_ID && process.env.AUTH_TWITTER_SECRET
      ? Twitter({
          clientId: process.env.AUTH_TWITTER_ID,
          clientSecret: process.env.AUTH_TWITTER_SECRET,
          version: "2.0",
        })
      : null,
  ].filter((provider) => provider !== null);
}

async function ensureDefaultWorkspace(userId: string, email: string | null | undefined) {
  const exists = await prismaAdmin.client.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });
  if (exists) return;

  const baseSlug =
    (email ?? "workspace")
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
      ownerId: userId,
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
        userId,
      },
    },
    create: {
      clientId: client.id,
      userId,
      role: "OWNER",
    },
    update: {
      role: "OWNER",
    },
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prismaAdmin),
  session: { strategy: "database" },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: buildProviders(),
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      await ensureDefaultWorkspace(user.id, user.email);
    },
  },
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
