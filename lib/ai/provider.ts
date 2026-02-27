import { createOpenAIClient } from "@/lib/openai";

export type AiProvider = "openai" | "ollama";

export type AiRuntimeConfig = {
  provider: AiProvider;
  openaiApiKey: string | null;
  openaiChatModel: string;
  openaiEmbeddingModel: string;
  ollamaBaseUrl: string | null;
  ollamaChatModel: string;
  ollamaEmbeddingModel: string;
};

type ChatInput = {
  systemPrompt: string;
  userPrompt: string;
};

export type ChatOutput = {
  reply: string;
  usageEstimate: {
    inputTokens: number | null;
    outputTokens: number | null;
  };
};

const TARGET_EMBEDDING_DIMENSION = 1536;

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

async function callOllama<T>(
  baseUrl: string,
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${endpoint}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.OLLAMA_API_KEY
        ? { authorization: `Bearer ${process.env.OLLAMA_API_KEY}` }
        : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Ollama error ${response.status}: ${detail}`);
  }

  return (await response.json()) as T;
}

export async function createEmbeddingWithProvider(
  text: string,
  config: AiRuntimeConfig,
): Promise<number[]> {
  if (config.provider === "openai") {
    if (!config.openaiApiKey) {
      throw new Error("OPENAI_API_KEY non configurata");
    }

    const openai = createOpenAIClient(config.openaiApiKey);
    const result = await openai.embeddings.create({
      model: config.openaiEmbeddingModel,
      input: text,
    });

    return normalizeEmbeddingSize(result.data[0].embedding);
  }

  if (!config.ollamaBaseUrl) {
    throw new Error("OLLAMA_BASE_URL non configurata");
  }

  try {
    const result = await callOllama<{ embeddings?: number[][]; embedding?: number[] }>(
      config.ollamaBaseUrl,
      "/api/embed",
      {
        model: config.ollamaEmbeddingModel,
        input: text,
      },
    );

    const embedding = result.embeddings?.[0] ?? result.embedding;
    if (!embedding) throw new Error("Embeddings non presenti nella risposta Ollama");
    return normalizeEmbeddingSize(embedding);
  } catch {
    const fallback = await callOllama<{ embedding?: number[] }>(
      config.ollamaBaseUrl,
      "/api/embeddings",
      {
        model: config.ollamaEmbeddingModel,
        prompt: text,
      },
    );

    if (!fallback.embedding) {
      throw new Error("Embedding non disponibile da Ollama");
    }

    return normalizeEmbeddingSize(fallback.embedding);
  }
}

function normalizeEmbeddingSize(values: number[]): number[] {
  if (values.length === TARGET_EMBEDDING_DIMENSION) {
    return values;
  }

  if (values.length > TARGET_EMBEDDING_DIMENSION) {
    return values.slice(0, TARGET_EMBEDDING_DIMENSION);
  }

  return [...values, ...new Array(TARGET_EMBEDDING_DIMENSION - values.length).fill(0)];
}

export async function completeChatWithProvider(
  input: ChatInput,
  config: AiRuntimeConfig,
): Promise<ChatOutput> {
  if (config.provider === "openai") {
    if (!config.openaiApiKey) {
      throw new Error("OPENAI_API_KEY non configurata");
    }

    const openai = createOpenAIClient(config.openaiApiKey);
    const completion = await openai.responses.create({
      model: config.openaiChatModel,
      input: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt },
      ],
    });

    return {
      reply: completion.output_text || "Non sono riuscito a generare una risposta in questo momento.",
      usageEstimate: {
        inputTokens: completion.usage?.input_tokens ?? null,
        outputTokens: completion.usage?.output_tokens ?? null,
      },
    };
  }

  if (!config.ollamaBaseUrl) {
    throw new Error("OLLAMA_BASE_URL non configurata");
  }

  const response = await callOllama<{
    message?: { content?: string };
    prompt_eval_count?: number;
    eval_count?: number;
  }>(config.ollamaBaseUrl, "/api/chat", {
    model: config.ollamaChatModel,
    stream: false,
    messages: [
      { role: "system", content: input.systemPrompt },
      { role: "user", content: input.userPrompt },
    ],
  });

  return {
    reply: response.message?.content ?? "Non sono riuscito a generare una risposta in questo momento.",
    usageEstimate: {
      inputTokens: response.prompt_eval_count ?? null,
      outputTokens: response.eval_count ?? null,
    },
  };
}
