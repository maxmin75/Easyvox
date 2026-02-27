export function chunkText(text: string, size = 800, overlap = 120): string[] {
  if (!text.trim()) return [];

  const normalized = text.replace(/\r\n/g, "\n").trim();
  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const end = Math.min(cursor + size, normalized.length);
    const slice = normalized.slice(cursor, end).trim();

    if (slice.length > 0) {
      chunks.push(slice);
    }

    if (end === normalized.length) break;
    cursor = Math.max(0, end - overlap);
  }

  return chunks;
}
