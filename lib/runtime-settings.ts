import { prisma } from "@/lib/prisma";
import { DEFAULT_CHAT_MODEL, DEFAULT_EMBEDDING_MODEL } from "@/lib/openai";

type RuntimeSettings = {
  openaiApiKey: string | null;
  openaiChatModel: string;
  openaiEmbeddingModel: string;
  appBaseUrl: string | null;
};

export async function getRuntimeSettings(): Promise<RuntimeSettings> {
  const setting = await prisma.appSetting.findUnique({
    where: { singleton: "default" },
    select: {
      openaiApiKey: true,
      openaiChatModel: true,
      openaiEmbeddingModel: true,
      appBaseUrl: true,
    },
  });

  return {
    openaiApiKey: process.env.OPENAI_API_KEY ?? setting?.openaiApiKey ?? null,
    openaiChatModel:
      process.env.OPENAI_CHAT_MODEL ?? setting?.openaiChatModel ?? DEFAULT_CHAT_MODEL,
    openaiEmbeddingModel:
      process.env.OPENAI_EMBEDDING_MODEL ??
      setting?.openaiEmbeddingModel ??
      DEFAULT_EMBEDDING_MODEL,
    appBaseUrl: process.env.APP_BASE_URL ?? setting?.appBaseUrl ?? null,
  };
}

export function envOverridesRuntimeSettings() {
  return {
    openaiApiKey: Boolean(process.env.OPENAI_API_KEY),
    openaiChatModel: Boolean(process.env.OPENAI_CHAT_MODEL),
    openaiEmbeddingModel: Boolean(process.env.OPENAI_EMBEDDING_MODEL),
    appBaseUrl: Boolean(process.env.APP_BASE_URL),
  };
}
