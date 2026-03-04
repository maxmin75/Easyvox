import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Jersey_10 } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";
import { authCookieName, getAuthUserFromNextAuthSession, getAuthUserFromToken } from "@/lib/auth";
import { prismaAdmin } from "@/lib/prisma-admin";
import TopbarAuthAction from "@/components/TopbarAuthAction";
import MobileTopbarMenu from "@/components/MobileTopbarMenu";
import TopbarLogoTypewriter from "@/components/TopbarLogoTypewriter";
import { isEasyVoxAdminEmail } from "@/lib/admin/access";
import "./globals.css";

const display = Inter({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const logo = Jersey_10({
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "EasyVox, Ai chat Hub",
  description: "Multi-tenant EasyVox, Ai chat Hub con RAG, widget embeddabile e dashboard admin.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value ?? null;
  const authUser = (await getAuthUserFromToken(token)) ?? (await getAuthUserFromNextAuthSession());
  const isAdmin = Boolean(authUser && isEasyVoxAdminEmail(authUser.email));
  const activeAgents = authUser
    ? prismaAdmin.client.findMany({
        where: { ownerId: authUser.id },
        select: { id: true, name: true, slug: true },
        orderBy: { createdAt: "desc" },
      })
    : Promise.resolve([]);
  const resolvedAgents = await activeAgents;
  const renderTopbarNav = (className?: string) => (
    <nav className={className ? `topbar-nav ${className}` : "topbar-nav"} aria-label="Aree progetto">
      <div className="topbar-dropdown">
        <Link href="/demo" className="topbar-link" aria-label="Easyvox chat" title="Easyvox chat">
          Easyvox chat
          <span className="topbar-caret" aria-hidden="true">
            ▾
          </span>
        </Link>
        <div className="topbar-menu" role="menu" aria-label="Agenti attivi">
          <p className="topbar-menu-title">Seleziona agente per test</p>
          <Link href="/demo" className="topbar-menu-item">
            Easyvox chat
          </Link>
          {resolvedAgents.length > 0 ? (
            resolvedAgents.map((agent) => (
              <Link key={agent.id} href={`/demo?ditta=${encodeURIComponent(agent.slug)}`} className="topbar-menu-item">
                {agent.name}
              </Link>
            ))
          ) : (
            <span className="topbar-menu-empty">Nessun agente attivo</span>
          )}
        </div>
      </div>
      {authUser ? (
        isAdmin ? (
          <>
            <Link href="/admin/metrics" className="topbar-link" aria-label="Metrics" title="Metrics">
              Metrics
            </Link>
            <Link href="/admin/chats" className="topbar-link" aria-label="Archivio Chat" title="Archivio Chat">
              Chat
            </Link>
            <Link href="/admin/crm" className="topbar-link" aria-label="CRM" title="CRM">
              CRM
            </Link>
            <Link
              href="/admin/appointments"
              className="topbar-link"
              aria-label="Appuntamenti"
              title="Appuntamenti"
            >
              Appuntamenti
            </Link>
          </>
        ) : (
          <Link href="/client" className="topbar-link" aria-label="Area Clienti" title="Area Clienti">
            Area clienti
          </Link>
        )
      ) : null}
    </nav>
  );

  return (
    <html lang="it">
      <body className={`${display.variable} ${mono.variable}`}>
        <header className="topbar">
          <div className="container topbar-inner">
            <div className="topbar-shell">
              <Link href="/" className={`${logo.className} topbar-brand`}>
                <TopbarLogoTypewriter />
              </Link>
              {renderTopbarNav("topbar-nav-desktop")}
              <div className="topbar-actions-desktop">
                <TopbarAuthAction
                  isAuthenticated={Boolean(authUser)}
                  className="topbar-auth topbar-auth-ghost topbar-auth-desktop-small"
                />
                {!authUser ? (
                  <Link href="/login" className="topbar-auth topbar-auth-solid topbar-auth-desktop-small">
                    Start for Free
                  </Link>
                ) : null}
              </div>
              <MobileTopbarMenu isAuthenticated={Boolean(authUser)} isAdmin={isAdmin} agents={resolvedAgents} />
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
