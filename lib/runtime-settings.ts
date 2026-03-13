import { prisma } from "@/lib/prisma";
import { prismaAdmin } from "@/lib/prisma-admin";
import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_OPENAI_PROMPT_ID,
  DEFAULT_OLLAMA_CHAT_MODEL,
  DEFAULT_OLLAMA_EMBEDDING_MODEL,
} from "@/lib/openai";
import type { AiProvider } from "@/lib/ai/provider";

type RuntimeSettings = {
  provider: AiProvider;
  openaiApiKey: string | null;
  openaiChatModel: string;
  openaiPromptId: string | null;
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
  const normalized = value.trim();
  if (normalized === "openai" || normalized === "ollama" || normalized === "local") {
    return normalized;
  }
  return null;
}

function normalizeText(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
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
  const resolvedOllamaBaseUrl =
    normalizeText(process.env.OLLAMA_BASE_URL) ?? normalizeText(setting?.ollamaBaseUrl);
  const provider = envProvider ?? dbProvider ?? (resolvedOllamaBaseUrl ? "ollama" : "openai");

  return {
    provider,
    openaiApiKey: normalizeText(process.env.OPENAI_API_KEY) ?? normalizeText(setting?.openaiApiKey),
    openaiChatModel:
      normalizeText(process.env.OPENAI_CHAT_MODEL) ??
      normalizeText(setting?.openaiChatModel) ??
      DEFAULT_CHAT_MODEL,
    openaiPromptId:
      normalizeText(process.env.OPENAI_PROMPT_ID) ?? DEFAULT_OPENAI_PROMPT_ID,
    openaiEmbeddingModel:
      normalizeText(process.env.OPENAI_EMBEDDING_MODEL) ??
      normalizeText(setting?.openaiEmbeddingModel) ??
      DEFAULT_EMBEDDING_MODEL,
    ollamaBaseUrl: resolvedOllamaBaseUrl ?? null,
    ollamaChatModel:
      normalizeText(process.env.OLLAMA_CHAT_MODEL) ??
      normalizeText(setting?.ollamaChatModel) ??
      DEFAULT_OLLAMA_CHAT_MODEL,
    ollamaEmbeddingModel:
      normalizeText(process.env.OLLAMA_EMBEDDING_MODEL) ??
      normalizeText(setting?.ollamaEmbeddingModel) ??
      DEFAULT_OLLAMA_EMBEDDING_MODEL,
    appBaseUrl: normalizeText(process.env.APP_BASE_URL) ?? normalizeText(setting?.appBaseUrl),
    easyvoxSystemPrompt: normalizeText(setting?.easyvoxSystemPrompt),
    blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  };
}

type RuntimeSettingsOverrides = {
  provider?: AiProvider | null;
  openaiApiKey?: string | null;
  openaiChatModel?: string | null;
  openaiPromptId?: string | null;
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
    openaiApiKey: normalizeText(overrides.openaiApiKey) ?? base.openaiApiKey,
    openaiChatModel: normalizeText(overrides.openaiChatModel) ?? base.openaiChatModel,
    openaiPromptId: normalizeText(overrides.openaiPromptId) ?? base.openaiPromptId,
    openaiEmbeddingModel: normalizeText(overrides.openaiEmbeddingModel) ?? base.openaiEmbeddingModel,
    ollamaBaseUrl: normalizeText(overrides.ollamaBaseUrl) ?? base.ollamaBaseUrl,
    ollamaChatModel: normalizeText(overrides.ollamaChatModel) ?? base.ollamaChatModel,
    ollamaEmbeddingModel: normalizeText(overrides.ollamaEmbeddingModel) ?? base.ollamaEmbeddingModel,
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
    openaiPromptId: base.openaiPromptId,
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
    openaiPromptId: Boolean(process.env.OPENAI_PROMPT_ID),
    openaiEmbeddingModel: Boolean(process.env.OPENAI_EMBEDDING_MODEL),
    ollamaBaseUrl: Boolean(process.env.OLLAMA_BASE_URL),
    ollamaChatModel: Boolean(process.env.OLLAMA_CHAT_MODEL),
    ollamaEmbeddingModel: Boolean(process.env.OLLAMA_EMBEDDING_MODEL),
    appBaseUrl: Boolean(process.env.APP_BASE_URL),
  };
}
