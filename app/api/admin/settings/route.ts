import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api/admin";
import { envOverridesRuntimeSettings, getRuntimeSettings } from "@/lib/runtime-settings";

export const runtime = "nodejs";

const settingsSchema = z.object({
  openaiApiKey: z.string().min(20).optional(),
  clearOpenaiApiKey: z.boolean().optional(),
  openaiChatModel: z.string().min(3).max(80).optional(),
  openaiEmbeddingModel: z.string().min(3).max(80).optional(),
  appBaseUrl: z.string().url().optional(),
});

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const runtime = await getRuntimeSettings();

  return NextResponse.json({
    settings: {
      hasOpenaiApiKey: Boolean(runtime.openaiApiKey),
      openaiChatModel: runtime.openaiChatModel,
      openaiEmbeddingModel: runtime.openaiEmbeddingModel,
      appBaseUrl: runtime.appBaseUrl,
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

  await prisma.appSetting.upsert({
    where: { singleton: "default" },
    create: {
      singleton: "default",
      openaiApiKey: data.clearOpenaiApiKey ? null : (data.openaiApiKey ?? null),
      openaiChatModel: data.openaiChatModel,
      openaiEmbeddingModel: data.openaiEmbeddingModel,
      appBaseUrl: data.appBaseUrl,
    },
    update: {
      ...(data.openaiApiKey ? { openaiApiKey: data.openaiApiKey } : {}),
      ...(data.clearOpenaiApiKey ? { openaiApiKey: null } : {}),
      ...(data.openaiChatModel ? { openaiChatModel: data.openaiChatModel } : {}),
      ...(data.openaiEmbeddingModel ? { openaiEmbeddingModel: data.openaiEmbeddingModel } : {}),
      ...(data.appBaseUrl ? { appBaseUrl: data.appBaseUrl } : {}),
    },
  });

  const runtime = await getRuntimeSettings();

  return NextResponse.json({
    ok: true,
    settings: {
      hasOpenaiApiKey: Boolean(runtime.openaiApiKey),
      openaiChatModel: runtime.openaiChatModel,
      openaiEmbeddingModel: runtime.openaiEmbeddingModel,
      appBaseUrl: runtime.appBaseUrl,
    },
    envOverrides: envOverridesRuntimeSettings(),
  });
}
