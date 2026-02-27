import OpenAI from "openai";

export const DEFAULT_CHAT_MODEL = "gpt-4o-mini";
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_OLLAMA_CHAT_MODEL = "qwen2.5:7b";
export const DEFAULT_OLLAMA_EMBEDDING_MODEL = "nomic-embed-text";

export function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}
