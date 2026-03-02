import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";
import { authCookieName, getAuthUserFromToken } from "@/lib/auth";
import { prismaAdmin } from "@/lib/prisma-admin";
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
  const authUser = await getAuthUserFromToken(token);
  const activeAgents = authUser
    ? prismaAdmin.client.findMany({
        where: { ownerId: authUser.id },
        select: { id: true, name: true, slug: true },
        orderBy: { createdAt: "desc" },
      })
    : Promise.resolve([]);
  const resolvedAgents = await activeAgents;

  return (
    <html lang="it">
      <body className={`${display.variable} ${mono.variable}`}>
        <header className="topbar">
          <div className="container topbar-inner">
            <Link href="/" className="topbar-brand">
              EASYVOX
            </Link>
            <nav className="topbar-nav" aria-label="Aree progetto">
              <Link href="/" className="topbar-link" aria-label="Home" title="Home">
                Product
                <span className="topbar-caret" aria-hidden="true">
                  ▾
                </span>
              </Link>
              <div className="topbar-dropdown">
                <Link href="/demo?ditta=vox" className="topbar-link" aria-label="Demo Widget" title="Demo Widget">
                  Demo
                  <span className="topbar-caret" aria-hidden="true">
                    ▾
                  </span>
                </Link>
                <div className="topbar-menu" role="menu" aria-label="Agenti attivi">
                  <p className="topbar-menu-title">Seleziona agente per test</p>
                  <Link href="/demo" className="topbar-menu-item">
                    Demo generica
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
              <Link href="/admin/metrics" className="topbar-link" aria-label="Metrics" title="Metrics">
                Metrics
              </Link>
              <Link href="/admin" className="topbar-link topbar-link-accent" aria-label="Admin Dashboard" title="Admin">
                Sign in
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
