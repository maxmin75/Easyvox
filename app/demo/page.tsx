import { ChatWidget } from "@/components/ChatWidget";
import { CatalogSidebar } from "@/components/CatalogSidebar";
import { QuoteSidebar } from "@/components/QuoteSidebar";
import { Particles } from "@/components/ui/particles";

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; username?: string; ditta?: string }>;
}) {
  const params = await searchParams;
  const clientId = params.clientId;
  const username = params.username ?? params.ditta ?? (clientId ? undefined : "vox");

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <Particles quantity={150} staticity={30} ease={90} size={1.7} color="#6f8fff" />
      </div>
      <main
        className="container"
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "calc(100vh - 120px)",
          padding: "32px 0 56px",
          display: "grid",
          gap: 18,
        }}
      >
        <ChatWidget clientId={clientId} username={username} />
      </main>
      <QuoteSidebar clientId={clientId} username={username} />
      <CatalogSidebar />
    </>
  );
}
