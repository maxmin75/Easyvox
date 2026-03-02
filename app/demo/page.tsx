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
      <h1 style={{ marginBottom: 0 }}>Demo Widget</h1>
      <p className="mono" style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
        Passa `?clientId=&lt;uuid&gt;` oppure `?ditta=&lt;slug&gt;` per testare un tenant reale.
      </p>
      <ChatWidget clientId={clientId} username={username} />
      <pre
        className="card mono"
        style={{ margin: 0, padding: 14, overflowX: "auto", fontSize: 12, color: "var(--muted)" }}
      >{clientId
        ? `<ChatWidget clientId="${clientId}" apiBaseUrl="${process.env.APP_BASE_URL ?? ""}" />`
        : `<ChatWidget username="${username ?? "tenant-slug"}" apiBaseUrl="${process.env.APP_BASE_URL ?? ""}" />`}</pre>
    </main>
  );
}
