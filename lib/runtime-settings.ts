import { prisma } from "@/lib/prisma";
import { prismaAdmin } from "@/lib/prisma-admin";
import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_OLLAMA_CHAT_MODEL,
  DEFAULT_OLLAMA_EMBEDDING_MODEL,
} from "@/lib/openai";
import type { AiProvider } from "@/lib/ai/provider";

type RuntimeSettings = {
  provider: AiProvider;
  openaiApiKey: string | null;
  openaiChatModel: string;
  openaiEmbeddingModel: string;
  ollamaBaseUrl: string | null;
  ollamaChatModel: string;
  ollamaEmbeddingModel: string;
  appBaseUrl: string | null;
  easyvoxSystemPrompt: string | null;
  blobConfigured: boolean;
};

function normalizeProvider(value: string | null | undefined): AiProvider | null {
  if (!value) return null;
  if (value === "openai" || value === "ollama") return value;
  return null;
}

export async function getRuntimeSettings(): Promise<RuntimeSettings> {
  const setting = await prisma.appSetting.findUnique({
    where: { singleton: "default" },
    select: {
      aiProvider: true,
      openaiApiKey: true,
      openaiChatModel: true,
      openaiEmbeddingModel: true,
      ollamaBaseUrl: true,
      ollamaChatModel: true,
      ollamaEmbeddingModel: true,
      appBaseUrl: true,
      easyvoxSystemPrompt: true,
    },
  });

  const envProvider = normalizeProvider(process.env.AI_PROVIDER);
  const dbProvider = normalizeProvider(setting?.aiProvider);
  const resolvedOllamaBaseUrl = process.env.OLLAMA_BASE_URL ?? setting?.ollamaBaseUrl ?? null;
  const provider = envProvider ?? dbProvider ?? (resolvedOllamaBaseUrl ? "ollama" : "openai");

  return {
    provider,
    openaiApiKey: process.env.OPENAI_API_KEY ?? setting?.openaiApiKey ?? null,
    openaiChatModel:
      process.env.OPENAI_CHAT_MODEL ?? setting?.openaiChatModel ?? DEFAULT_CHAT_MODEL,
    openaiEmbeddingModel:
      process.env.OPENAI_EMBEDDING_MODEL ??
      setting?.openaiEmbeddingModel ??
      DEFAULT_EMBEDDING_MODEL,
    ollamaBaseUrl: resolvedOllamaBaseUrl,
    ollamaChatModel:
      process.env.OLLAMA_CHAT_MODEL ?? setting?.ollamaChatModel ?? DEFAULT_OLLAMA_CHAT_MODEL,
    ollamaEmbeddingModel:
      process.env.OLLAMA_EMBEDDING_MODEL ??
      setting?.ollamaEmbeddingModel ??
      DEFAULT_OLLAMA_EMBEDDING_MODEL,
    appBaseUrl: process.env.APP_BASE_URL ?? setting?.appBaseUrl ?? null,
    easyvoxSystemPrompt: setting?.easyvoxSystemPrompt ?? null,
    blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  };
}

type RuntimeSettingsOverrides = {
  provider?: AiProvider | null;
  openaiApiKey?: string | null;
  openaiChatModel?: string | null;
  openaiEmbeddingModel?: string | null;
  ollamaBaseUrl?: string | null;
  ollamaChatModel?: string | null;
  ollamaEmbeddingModel?: string | null;
};

function mergeRuntimeSettings(base: RuntimeSettings, overrides: RuntimeSettingsOverrides): RuntimeSettings {
  const provider = normalizeProvider(overrides.provider) ?? base.provider;
  return {
    ...base,
    provider,
    openaiApiKey: overrides.openaiApiKey ?? base.openaiApiKey,
    openaiChatModel: overrides.openaiChatModel ?? base.openaiChatModel,
    openaiEmbeddingModel: overrides.openaiEmbeddingModel ?? base.openaiEmbeddingModel,
    ollamaBaseUrl: overrides.ollamaBaseUrl ?? base.ollamaBaseUrl,
    ollamaChatModel: overrides.ollamaChatModel ?? base.ollamaChatModel,
    ollamaEmbeddingModel: overrides.ollamaEmbeddingModel ?? base.ollamaEmbeddingModel,
  };
}

export async function getRuntimeSettingsForUser(
  clientId: string | null | undefined,
  userId: string | null | undefined,
): Promise<RuntimeSettings> {
  const base = await getRuntimeSettings();
  if (!clientId || !userId) return base;

  const pref = await prismaAdmin.userAiSetting.findUnique({
    where: {
      clientId_userId: {
        clientId,
        userId,
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
    },
  });

  if (!pref) return base;

  return mergeRuntimeSettings(base, {
    provider: normalizeProvider(pref.aiProvider),
    openaiApiKey: pref.openaiApiKey,
    openaiChatModel: pref.openaiChatModel,
    openaiEmbeddingModel: pref.openaiEmbeddingModel,
    ollamaBaseUrl: pref.ollamaBaseUrl,
    ollamaChatModel: pref.ollamaChatModel,
    ollamaEmbeddingModel: pref.ollamaEmbeddingModel,
  });
}

export function envOverridesRuntimeSettings() {
  return {
    aiProvider: Boolean(process.env.AI_PROVIDER),
    openaiApiKey: Boolean(process.env.OPENAI_API_KEY),
    openaiChatModel: Boolean(process.env.OPENAI_CHAT_MODEL),
    openaiEmbeddingModel: Boolean(process.env.OPENAI_EMBEDDING_MODEL),
    ollamaBaseUrl: Boolean(process.env.OLLAMA_BASE_URL),
    ollamaChatModel: Boolean(process.env.OLLAMA_CHAT_MODEL),
    ollamaEmbeddingModel: Boolean(process.env.OLLAMA_EMBEDDING_MODEL),
    appBaseUrl: Boolean(process.env.APP_BASE_URL),
  };
}
