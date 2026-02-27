import OpenAI from "openai";

export const DEFAULT_CHAT_MODEL = "gpt-4o-mini";
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

export function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}
