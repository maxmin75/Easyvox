import OpenAI from "openai";

export async function createEmbedding(
  text: string,
  openai: OpenAI,
  embeddingModel: string,
): Promise<number[]> {
  const result = await openai.embeddings.create({
    model: embeddingModel,
    input: text,
  });

  return result.data[0].embedding;
}

export function embeddingToVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
