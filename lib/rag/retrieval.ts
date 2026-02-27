import { Prisma } from "@prisma/client";
import { embeddingToVectorLiteral } from "@/lib/rag/embeddings";

export type RetrievedChunk = {
  id: string;
  content: string;
  documentId: string;
  score: number;
};

export async function retrieveTopChunks(
  tx: Prisma.TransactionClient,
  clientId: string,
  embedding: number[],
  topK: number,
): Promise<RetrievedChunk[]> {
  const vector = embeddingToVectorLiteral(embedding);

  const rows = await tx.$queryRaw<RetrievedChunk[]>`
    SELECT
      id,
      content,
      document_id AS "documentId",
      (1 - (embedding <=> ${vector}::vector))::float8 AS score
    FROM chunks
    WHERE client_id = ${clientId}::uuid
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${topK}
  `;

  return rows;
}
