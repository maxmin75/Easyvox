import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserFromRequest } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { prismaAdmin } from "@/lib/prisma-admin";
import { getRuntimeSettingsForUser } from "@/lib/runtime-settings";
import { getTenantAccess } from "@/lib/tenant-users";

export const runtime = "nodejs";

const settingsSchema = z.object({
  clientId: z.string().uuid(),
  aiProvider: z.enum(["openai", "ollama"]).optional(),
  openaiApiKey: z.string().min(20).optional(),
  clearOpenaiApiKey: z.boolean().optional(),
  openaiChatModel: z.string().min(3).max(80).optional(),
  openaiEmbeddingModel: z.string().min(3).max(80).optional(),
  ollamaBaseUrl: z.string().url().optional(),
  ollamaChatModel: z.string().min(3).max(80).optional(),
  ollamaEmbeddingModel: z.string().min(3).max(80).optional(),
});

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return jsonError("Non autorizzato", 401);

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return jsonError("clientId mancante", 400);

  const access = await getTenantAccess(clientId, user.id);
  if (!access.hasAccess) return jsonError("Tenant non accessibile", 403);

  const saved = await prismaAdmin.userAiSetting.findUnique({
    where: {
      clientId_userId: {
        clientId,
        userId: user.id,
      },
    },
    select: {
      aiProvider: true,
      openaiApiKey: true,
      openaiChatModel: true,
      openaiEmbeddingModel: true,
      ollamaBaseUrl: true,
      ollamaChatModel: true,
      ollamaEmbeddingModel: true,
      updatedAt: true,
    },
  });

  const effective = await getRuntimeSettingsForUser(clientId, user.id);
  return NextResponse.json({
    saved: {
      aiProvider: saved?.aiProvider ?? null,
      hasOpenaiApiKey: Boolean(saved?.openaiApiKey),
      openaiChatModel: saved?.openaiChatModel ?? null,
      openaiEmbeddingModel: saved?.openaiEmbeddingModel ?? null,
      ollamaBaseUrl: saved?.ollamaBaseUrl ?? null,
      ollamaChatModel: saved?.ollamaChatModel ?? null,
      ollamaEmbeddingModel: saved?.ollamaEmbeddingModel ?? null,
      updatedAt: saved?.updatedAt ?? null,
    },
    effective: {
      aiProvider: effective.provider,
      hasOpenaiApiKey: Boolean(effective.openaiApiKey),
      openaiChatModel: effective.openaiChatModel,
      openaiEmbeddingModel: effective.openaiEmbeddingModel,
      ollamaBaseUrl: effective.ollamaBaseUrl,
      ollamaChatModel: effective.ollamaChatModel,
      ollamaEmbeddingModel: effective.ollamaEmbeddingModel,
    },
  });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return jsonError("Non autorizzato", 401);

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Payload non valido", 400);

  const data = parsed.data;
  const access = await getTenantAccess(data.clientId, user.id);
  if (!access.hasAccess) return jsonError("Tenant non accessibile", 403);

  await prismaAdmin.userAiSetting.upsert({
    where: {
      clientId_userId: {
        clientId: data.clientId,
        userId: user.id,
      },
    },
    create: {
      clientId: data.clientId,
      userId: user.id,
      aiProvider: data.aiProvider,
      openaiApiKey: data.clearOpenaiApiKey ? null : (data.openaiApiKey ?? null),
      openaiChatModel: data.openaiChatModel,
      openaiEmbeddingModel: data.openaiEmbeddingModel,
      ollamaBaseUrl: data.ollamaBaseUrl,
      ollamaChatModel: data.ollamaChatModel,
      ollamaEmbeddingModel: data.ollamaEmbeddingModel,
    },
    update: {
      ...(data.aiProvider ? { aiProvider: data.aiProvider } : {}),
      ...(data.openaiApiKey ? { openaiApiKey: data.openaiApiKey } : {}),
      ...(data.clearOpenaiApiKey ? { openaiApiKey: null } : {}),
      ...(data.openaiChatModel ? { openaiChatModel: data.openaiChatModel } : {}),
      ...(data.openaiEmbeddingModel ? { openaiEmbeddingModel: data.openaiEmbeddingModel } : {}),
      ...(data.ollamaBaseUrl ? { ollamaBaseUrl: data.ollamaBaseUrl } : {}),
      ...(data.ollamaChatModel ? { ollamaChatModel: data.ollamaChatModel } : {}),
      ...(data.ollamaEmbeddingModel
        ? { ollamaEmbeddingModel: data.ollamaEmbeddingModel }
        : {}),
    },
  });

  const effective = await getRuntimeSettingsForUser(data.clientId, user.id);
  return NextResponse.json({
    ok: true,
    effective: {
      aiProvider: effective.provider,
      hasOpenaiApiKey: Boolean(effective.openaiApiKey),
      openaiChatModel: effective.openaiChatModel,
      openaiEmbeddingModel: effective.openaiEmbeddingModel,
      ollamaBaseUrl: effective.ollamaBaseUrl,
      ollamaChatModel: effective.ollamaChatModel,
      ollamaEmbeddingModel: effective.ollamaEmbeddingModel,
    },
  });
}
