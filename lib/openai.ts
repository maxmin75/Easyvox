import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY non configurata.");
  }

  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

export const chatModel = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
export const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
