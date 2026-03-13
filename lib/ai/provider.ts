import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { createOpenAIClient } from "@/lib/openai";

const execFileAsync = promisify(execFile);

export type AiProvider = "openai" | "ollama" | "local";

export type AiRuntimeConfig = {
  provider: AiProvider;
  openaiApiKey: string | null;
  openaiChatModel: string;
  openaiPromptId?: string | null;
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
const OLLAMA_MAX_OUTPUT_TOKENS = 500;
const LOCAL_FINE_TUNED_PYTHON =
  process.env.LOCAL_FINE_TUNED_PYTHON ??
  "/Users/gianlucapistorello/Documents/easyVox/.venv/bin/python";
const LOCAL_FINE_TUNED_SCRIPT =
  process.env.LOCAL_FINE_TUNED_SCRIPT ??
  "/Users/gianlucapistorello/Documents/easyVox/training/test_finetuned_qwen.py";
const LOCAL_FINE_TUNED_BASE_MODEL =
  process.env.LOCAL_FINE_TUNED_BASE_MODEL ?? "Qwen/Qwen3.5-0.8B";
const LOCAL_FINE_TUNED_ADAPTER_DIR =
  process.env.LOCAL_FINE_TUNED_ADAPTER_DIR ??
  "/Users/gianlucapistorello/Documents/easyVox/training/runs/qwen35-0_8b-lora-mac";

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function normalizeFetchError(error: unknown, baseUrl: string) {
  const message = error instanceof Error ? error.message.trim() : "";
  if (message.toLowerCase() === "fetch failed") {
    return new Error(
      `Connessione al provider AI fallita (${normalizeBaseUrl(baseUrl)}). Verifica che il tunnel Ollama sia attivo oppure configura OpenAI come fallback.`,
    );
  }
  return error instanceof Error ? error : new Error("Errore di connessione al provider AI");
}

function canFallbackToOpenAI(config: AiRuntimeConfig) {
  return Boolean(config.openaiApiKey);
}

async function createOpenAIEmbedding(text: string, config: AiRuntimeConfig): Promise<number[]> {
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

async function createOpenAIChatCompletion(
  input: ChatInput,
  config: AiRuntimeConfig,
): Promise<ChatOutput> {
  if (!config.openaiApiKey) {
    throw new Error("OPENAI_API_KEY non configurata");
  }

  const openai = createOpenAIClient(config.openaiApiKey);
  const completion = await openai.responses.create({
    model: config.openaiChatModel,
    ...(config.openaiPromptId
      ? {
          prompt: {
            id: config.openaiPromptId,
          },
        }
      : {}),
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

function normalizeOllamaError(status: number, detail: string, contentType: string | null) {
  const compactDetail = detail.replace(/\s+/g, " ").trim();
  const lowerDetail = compactDetail.toLowerCase();
  const lowerContentType = contentType?.toLowerCase() ?? "";

  if (
    status === 530 &&
    (lowerDetail.includes("cloudflare tunnel error") || lowerDetail.includes("origin has been unregistered"))
  ) {
    return "Tunnel Ollama offline: riavvia cloudflared e aggiorna OLLAMA_BASE_URL se stai usando un quick tunnel trycloudflare.com.";
  }

  if (status >= 500 && lowerContentType.includes("text/html")) {
    return `Ollama upstream error ${status}: il server remoto ha risposto con una pagina HTML invece che JSON.`;
  }

  return compactDetail || `Ollama error ${status}`;
}

async function callOllama<T>(
  baseUrl: string,
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${normalizeBaseUrl(baseUrl)}${endpoint}`, {
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
  } catch (error) {
    throw normalizeFetchError(error, baseUrl);
  }

  if (!response.ok) {
    const detail = await response.text();
    const normalizedError = normalizeOllamaError(
      response.status,
      detail,
      response.headers.get("content-type"),
    );
    throw new Error(normalizedError);
  }

  return (await response.json()) as T;
}

async function createEmbeddingWithFallbackProvider(
  text: string,
  config: AiRuntimeConfig,
): Promise<number[]> {
  if (config.ollamaBaseUrl) {
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

  if (config.openaiApiKey) {
    return createOpenAIEmbedding(text, config);
  }

  throw new Error("Provider locale attivo ma nessun embedding provider configurato");
}

async function completeChatWithLocalAdapter(
  input: ChatInput,
): Promise<ChatOutput> {
  const args = [
    LOCAL_FINE_TUNED_SCRIPT,
    "--base-model",
    LOCAL_FINE_TUNED_BASE_MODEL,
    "--adapter-dir",
    LOCAL_FINE_TUNED_ADAPTER_DIR,
    "--system-prompt",
    input.systemPrompt,
    "--prompt",
    input.userPrompt,
    "--max-new-tokens",
    String(OLLAMA_MAX_OUTPUT_TOKENS),
    "--quiet",
  ];

  const { stdout } = await execFileAsync(LOCAL_FINE_TUNED_PYTHON, args, {
    maxBuffer: 1024 * 1024 * 8,
  });

  return {
    reply: stdout.trim() || "Non sono riuscito a generare una risposta in questo momento.",
    usageEstimate: {
      inputTokens: null,
      outputTokens: null,
    },
  };
}

export async function createEmbeddingWithProvider(
  text: string,
  config: AiRuntimeConfig,
): Promise<number[]> {
  if (config.provider === "local") {
    return createEmbeddingWithFallbackProvider(text, config);
  }

  if (config.provider === "openai") {
    return createOpenAIEmbedding(text, config);
  }

  if (!config.ollamaBaseUrl) {
    throw new Error("OLLAMA_BASE_URL non configurata");
  }

  try {
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
  } catch (error) {
    if (canFallbackToOpenAI(config)) {
      return createOpenAIEmbedding(text, config);
    }
    throw error;
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
  if (config.provider === "local") {
    return completeChatWithLocalAdapter(input);
  }

  if (config.provider === "openai") {
    return createOpenAIChatCompletion(input, config);
  }

  if (!config.ollamaBaseUrl) {
    throw new Error("OLLAMA_BASE_URL non configurata");
  }

  try {
    const response = await callOllama<{
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
    }>(config.ollamaBaseUrl, "/api/chat", {
      model: config.ollamaChatModel,
      stream: false,
      think: false,
      options: {
        num_predict: OLLAMA_MAX_OUTPUT_TOKENS,
      },
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
  } catch (error) {
    if (canFallbackToOpenAI(config)) {
      return createOpenAIChatCompletion(input, config);
    }
    throw error;
  }
}
