import { createOpenAIClient } from "@/lib/openai";
import { MEMORY_CHAT_MODEL } from "@/lib/ai-memory/constants";
import { extractJsonObject } from "@/lib/ai-memory/utils";

export async function generateJsonFromOpenAI<T>(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<T | null> {
  const openai = createOpenAIClient(apiKey);
  const response = await openai.responses.create({
    model: MEMORY_CHAT_MODEL,
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return extractJsonObject<T>(response.output_text);
}
