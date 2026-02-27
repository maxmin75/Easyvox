export function embeddingToVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
