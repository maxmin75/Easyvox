import { embeddingModel, getOpenAIClient } from "@/lib/openai";

export async function createEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const result = await openai.embeddings.create({
    model: embeddingModel,
    input: text,
  });

  return result.data[0].embedding;
}

export function embeddingToVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
