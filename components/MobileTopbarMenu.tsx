"use client";

import Link from "next/link";
import { useRef } from "react";
import TopbarAuthAction from "@/components/TopbarAuthAction";
import TopbarSettingsLink from "@/components/TopbarSettingsLink";

type Agent = {
  id: string;
  name: string;
  slug: string;
};

type MobileTopbarMenuProps = {
  isAuthenticated: boolean;
  isAdmin: boolean;
  agents: Agent[];
  settingsHref: string | null;
};

export default function MobileTopbarMenu({
  isAuthenticated,
  isAdmin,
  agents,
  settingsHref,
}: MobileTopbarMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }

  return (
    <div className="topbar-mobile-controls">
      {isAuthenticated && settingsHref ? (
        <TopbarSettingsLink href={settingsHref} className="topbar-settings-link topbar-settings-tooltip" />
      ) : null}
      <TopbarAuthAction isAuthenticated={isAuthenticated} className="topbar-auth topbar-auth-ghost" />
      {!isAuthenticated ? (
        <Link href="/login" className="topbar-auth topbar-auth-solid" onClick={closeMenu}>
          Sign up
        </Link>
      ) : null}
      <details className="topbar-mobile" ref={detailsRef}>
        <summary className="topbar-mobile-toggle" aria-label="Apri menu principale">
          <span className="topbar-hamburger" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </summary>
        <nav className="topbar-nav topbar-nav-mobile" aria-label="Aree progetto">
          <div className="topbar-dropdown">
            <Link href="/demo" className="topbar-link" aria-label="Easyvox chat" title="Easyvox chat" onClick={closeMenu}>
              Easyvox chat
              <span className="topbar-caret" aria-hidden="true">
                ▾
              </span>
            </Link>
            <div className="topbar-menu" role="menu" aria-label="Agenti attivi">
              <p className="topbar-menu-title">Seleziona agente per test</p>
              <Link href="/demo" className="topbar-menu-item" onClick={closeMenu}>
                Easyvox chat
              </Link>
              {agents.length > 0 ? (
                agents.map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/demo?ditta=${encodeURIComponent(agent.slug)}`}
                    className="topbar-menu-item"
                    onClick={closeMenu}
                  >
                    {agent.name}
                  </Link>
                ))
              ) : (
                <span className="topbar-menu-empty">Nessun agente attivo</span>
              )}
            </div>
          </div>
          {isAuthenticated ? (
            isAdmin ? (
              <>
                <Link href="/admin/metrics" className="topbar-link" aria-label="Metrics" title="Metrics" onClick={closeMenu}>
                  Metrics
                </Link>
                <Link href="/admin/chats" className="topbar-link" aria-label="Archivio Chat" title="Archivio Chat" onClick={closeMenu}>
                  Chat
                </Link>
                <Link href="/admin/crm" className="topbar-link" aria-label="CRM" title="CRM" onClick={closeMenu}>
                  CRM
                </Link>
                <Link
                  href="/admin/appointments"
                  className="topbar-link"
                  aria-label="Appuntamenti"
                  title="Appuntamenti"
                  onClick={closeMenu}
                >
                  Appuntamenti
                </Link>
              </>
            ) : (
              <Link href="/client" className="topbar-link" aria-label="Area Clienti" title="Area Clienti" onClick={closeMenu}>
                Area clienti
              </Link>
            )
          ) : null}
        </nav>
      </details>
    </div>
  );
}
