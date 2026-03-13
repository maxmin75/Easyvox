export function sanitizeChatText(text: string): string {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return cleaned || text.trim();
}
