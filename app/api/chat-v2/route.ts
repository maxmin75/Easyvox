import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenant } from "@/lib/db/tenant";
import { getAuthUserFromRequest } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { getRuntimeSettingsForUser } from "@/lib/runtime-settings";
import { getTenantAccess } from "@/lib/tenant-users";
import { runMemoryChat } from "@/lib/ai-memory/chat-service";
import { DEFAULT_CHAT_MODEL } from "@/lib/openai";

export const runtime = "nodejs";
const DEFAULT_V2_OPENAI_CHAT_MODEL = process.env.OPENAI_MEMORY_CHAT_MODEL ?? "gpt-5.4";

const schema = z.object({
  sessionId: z.string().min(3).max(120),
  message: z.string().min(1).max(6000),
  customerName: z.string().trim().min(1).max(120).optional(),
  customerEmail: z.string().email().max(190).optional(),
});

async function resolveClient(request: NextRequest, authUserId?: string | null) {
  let clientId = request.headers.get("x-client-id");
  const clientSlug = request.headers.get("x-client-slug")?.trim().toLowerCase() ?? "";

  if (!clientId && clientSlug) {
    const client = await prisma.client.findUnique({
      where: { slug: clientSlug },
      select: { id: true },
    });
    clientId = client?.id ?? null;
  }

  if (!clientId && authUserId) {
    const defaultClient = await prisma.client.findFirst({
      where: { ownerId: authUserId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    clientId = defaultClient?.id ?? null;
  }

  if (!clientId) {
    return null;
  }

  return prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      assistantName: true,
      systemPrompt: true,
      requireUserAuthForChat: true,
      isSuspended: true,
    },
  });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUserFromRequest(request);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Payload non valido", 400);
  }

  const client = await resolveClient(request, authUser?.id);
  if (!client) {
    return jsonError("Tenant non trovato", 404);
  }
  if (client.isSuspended) {
    return jsonError("Tenant sospeso. Chat temporaneamente non disponibile.", 423);
  }

  const access = authUser ? await getTenantAccess(client.id, authUser.id) : null;
  if (client.requireUserAuthForChat && !authUser) {
    return jsonError("Accesso richiesto: effettua login.", 401);
  }
  if (client.requireUserAuthForChat && !access?.hasAccess) {
    return jsonError("Non autorizzato per questo tenant.", 403);
  }
  const effectiveCustomerEmail =
    client.requireUserAuthForChat && authUser?.email
      ? authUser.email.trim().toLowerCase()
      : parsed.data.customerEmail;
  const effectiveCustomerName =
    client.requireUserAuthForChat && authUser?.email
      ? parsed.data.customerName?.trim() ||
        authUser.name?.trim() ||
        authUser.email.split("@")[0]?.replace(/[._-]+/g, " ").trim() ||
        "Cliente"
      : parsed.data.customerName;

  const runtimeSettings = await getRuntimeSettingsForUser(client.id, authUser?.id);
  const runtimeConfig = {
    ...runtimeSettings,
    openaiChatModel:
      runtimeSettings.provider === "openai"
        ? runtimeSettings.openaiChatModel === DEFAULT_CHAT_MODEL
          ? DEFAULT_V2_OPENAI_CHAT_MODEL
          : runtimeSettings.openaiChatModel
        : runtimeSettings.openaiChatModel,
  };
  if (runtimeConfig.provider === "openai" && !runtimeConfig.openaiApiKey) {
    return jsonError("OPENAI_API_KEY non configurata", 500);
  }

  const result = await withTenant(client.id, (tx) =>
    runMemoryChat({
      tx,
      client,
      runtime: runtimeConfig,
      sessionId: parsed.data.sessionId,
      message: parsed.data.message,
      customerName: effectiveCustomerName,
      customerEmail: effectiveCustomerEmail,
    }),
  );

  return NextResponse.json(result);
}
