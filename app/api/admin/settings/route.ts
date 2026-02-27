import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { requireAdmin } from "@/lib/api/admin";
import { envOverridesRuntimeSettings, getRuntimeSettings } from "@/lib/runtime-settings";

export const runtime = "nodejs";

const settingsSchema = z.object({
  aiProvider: z.enum(["openai", "ollama"]).optional(),
  openaiApiKey: z.string().min(20).optional(),
  clearOpenaiApiKey: z.boolean().optional(),
  openaiChatModel: z.string().min(3).max(80).optional(),
  openaiEmbeddingModel: z.string().min(3).max(80).optional(),
  ollamaBaseUrl: z.string().url().optional(),
  ollamaChatModel: z.string().min(3).max(80).optional(),
  ollamaEmbeddingModel: z.string().min(3).max(80).optional(),
  appBaseUrl: z.string().url().optional(),
});

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const runtime = await getRuntimeSettings();

  return NextResponse.json({
    settings: {
      aiProvider: runtime.provider,
      hasOpenaiApiKey: Boolean(runtime.openaiApiKey),
      openaiChatModel: runtime.openaiChatModel,
      openaiEmbeddingModel: runtime.openaiEmbeddingModel,
      ollamaBaseUrl: runtime.ollamaBaseUrl,
      ollamaChatModel: runtime.ollamaChatModel,
      ollamaEmbeddingModel: runtime.ollamaEmbeddingModel,
      appBaseUrl: runtime.appBaseUrl,
      blobConfigured: runtime.blobConfigured,
    },
    envOverrides: envOverridesRuntimeSettings(),
  });
}

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const data = parsed.data;

  await prismaAdmin.appSetting.upsert({
    where: { singleton: "default" },
    create: {
      singleton: "default",
      aiProvider: data.aiProvider,
      openaiApiKey: data.clearOpenaiApiKey ? null : (data.openaiApiKey ?? null),
      openaiChatModel: data.openaiChatModel,
      openaiEmbeddingModel: data.openaiEmbeddingModel,
      ollamaBaseUrl: data.ollamaBaseUrl,
      ollamaChatModel: data.ollamaChatModel,
      ollamaEmbeddingModel: data.ollamaEmbeddingModel,
      appBaseUrl: data.appBaseUrl,
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
      ...(data.appBaseUrl ? { appBaseUrl: data.appBaseUrl } : {}),
    },
  });

  const runtime = await getRuntimeSettings();

  return NextResponse.json({
    ok: true,
    settings: {
      aiProvider: runtime.provider,
      hasOpenaiApiKey: Boolean(runtime.openaiApiKey),
      openaiChatModel: runtime.openaiChatModel,
      openaiEmbeddingModel: runtime.openaiEmbeddingModel,
      ollamaBaseUrl: runtime.ollamaBaseUrl,
      ollamaChatModel: runtime.ollamaChatModel,
      ollamaEmbeddingModel: runtime.ollamaEmbeddingModel,
      appBaseUrl: runtime.appBaseUrl,
      blobConfigured: runtime.blobConfigured,
    },
    envOverrides: envOverridesRuntimeSettings(),
  });
}
