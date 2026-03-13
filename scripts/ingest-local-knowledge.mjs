import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);

function getArg(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const rootDir = getArg("--root", "/Users/gianlucapistorello/Documents/easyVox");
const clientSlug = getArg("--client-slug", "demo");
const sourcePrefix = `local-dir:${rootDir}`;
const openaiApiKey = process.env.OPENAI_API_KEY || null;
const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

const INCLUDED_DIRS = new Set(["easyvox_codex_package", "qn35_training_pack"]);
const INCLUDED_EXTENSIONS = new Set([".txt", ".md", ".json", ".jsonl", ".csv"]);
const SKIPPED_FILES = new Set(["04_training_examples.jsonl", "01_system_prompt_qn35.txt"]);
const MAX_FILE_BYTES = 512 * 1024;
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 120;

function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  if (!text.trim()) return [];

  const normalized = text.replace(/\r\n/g, "\n").trim();
  const chunks = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const end = Math.min(cursor + size, normalized.length);
    const slice = normalized.slice(cursor, end).trim();
    if (slice) {
      chunks.push(slice);
    }
    if (end === normalized.length) break;
    cursor = Math.max(0, end - overlap);
  }

  return chunks;
}

function embeddingToVectorLiteral(values) {
  return `[${values.join(",")}]`;
}

async function walk(dir, relativeBase = "") {
  const currentDir = path.join(dir, relativeBase);
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const relativePath = path.join(relativeBase, entry.name);
    const topLevel = relativePath.split(path.sep)[0];
    if (!INCLUDED_DIRS.has(topLevel)) continue;

    if (entry.isDirectory()) {
      files.push(...(await walk(dir, relativePath)));
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!INCLUDED_EXTENSIONS.has(extension)) continue;
    if (SKIPPED_FILES.has(entry.name)) continue;

    files.push(relativePath);
  }

  return files.sort();
}

async function createEmbedding(openai, text) {
  const result = await openai.embeddings.create({
    model: embeddingModel,
    input: text,
  });

  return result.data[0].embedding;
}

async function main() {
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY non configurata");
  }

  const client = await prisma.client.findUnique({
    where: { slug: clientSlug },
    select: { id: true, name: true, slug: true },
  });

  if (!client) {
    throw new Error(`Tenant non trovato per slug '${clientSlug}'`);
  }

  const openai = new OpenAI({ apiKey: openaiApiKey });
  const relativeFiles = await walk(rootDir);

  if (relativeFiles.length === 0) {
    throw new Error(`Nessun file supportato trovato sotto ${rootDir}`);
  }

  const existingDocuments = await prisma.document.findMany({
    where: {
      clientId: client.id,
      source: {
        startsWith: sourcePrefix,
      },
    },
    select: { id: true },
  });

  if (existingDocuments.length > 0) {
    for (const document of existingDocuments) {
      await prisma.$executeRawUnsafe(`DELETE FROM chunks WHERE document_id = $1::uuid`, document.id);
    }
    await prisma.document.deleteMany({
      where: {
        id: { in: existingDocuments.map((document) => document.id) },
      },
    });
  }

  let totalChunks = 0;
  for (const relativePath of relativeFiles) {
    const absolutePath = path.join(rootDir, relativePath);
    const stat = await fs.stat(absolutePath);
    if (stat.size > MAX_FILE_BYTES) continue;

    const text = await fs.readFile(absolutePath, "utf8");
    const chunks = chunkText(text);
    if (chunks.length === 0) continue;

    const document = await prisma.document.create({
      data: {
        clientId: client.id,
        title: relativePath,
        source: `${sourcePrefix}:${relativePath}`,
      },
    });

    for (const chunk of chunks) {
      const embedding = await createEmbedding(openai, chunk);
      const vector = embeddingToVectorLiteral(embedding);

      await prisma.$executeRawUnsafe(
        `INSERT INTO chunks (client_id, document_id, content, metadata, embedding)
         VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, $5::vector)`,
        client.id,
        document.id,
        chunk,
        JSON.stringify({ source: relativePath, absolutePath }),
        vector,
      );
    }

    totalChunks += chunks.length;
    console.log(`Ingested ${relativePath} (${chunks.length} chunks)`);
  }

  console.log(
    JSON.stringify(
      {
        clientSlug: client.slug,
        clientId: client.id,
        rootDir,
        files: relativeFiles.length,
        totalChunks,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
