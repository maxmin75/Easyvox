import { ChatWidget } from "@/components/ChatWidget";

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; username?: string; ditta?: string }>;
}) {
  const params = await searchParams;
  const clientId = params.clientId;
  const username = params.username ?? params.ditta;

  return (
    <main className="container" style={{ padding: "32px 0 56px", display: "grid", gap: 18 }}>
      <h1 className="demo-title">Easyvox chat</h1>
      <p className="mono demo-subtitle">
        Chat Ai embendabile, multi-assistente, crea e forma la figura che ti serve, commerciale, gestionale,
        segreteria, statistica, etc...
      </p>
      <div className="demo-ai-tags" aria-label="Modelli AI disponibili">
        <span>GPT-4o</span>
        <span>GPT-4.1</span>
        <span>GPT-4 Turbo</span>
        <span>GPT-3.5 Turbo</span>
        <span>o3-mini (reasoning)</span>
        <span>o4-mini (reasoning)</span>
        <span>Claude 3 Opus</span>
        <span>Claude 3 Sonnet</span>
        <span>Claude 3 Haiku</span>
        <span>Llama 3 8B</span>
        <span>Llama 3 70B</span>
        <span>Claude</span>
        <span>Llama</span>
        <span>Mistral</span>
        <span>Titan (Amazon)</span>
      </div>
      <ChatWidget clientId={clientId} username={username} />
    </main>
  );
}
