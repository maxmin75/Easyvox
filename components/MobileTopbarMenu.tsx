"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
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
  recognizedName?: string | null;
};

export default function MobileTopbarMenu({
  isAuthenticated,
  isAdmin,
  agents,
  settingsHref,
  recognizedName,
}: MobileTopbarMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }

  useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const details = detailsRef.current;
      if (!details?.open) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (details.contains(target)) return;
      details.open = false;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const details = detailsRef.current;
      if (!details?.open) return;
      if (event.key === "Escape") details.open = false;
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="topbar-mobile-controls">
      {isAuthenticated && settingsHref ? (
        <TopbarSettingsLink href={settingsHref} className="topbar-settings-link topbar-settings-tooltip" />
      ) : null}
      <TopbarAuthAction
        isAuthenticated={isAuthenticated}
        recognizedName={recognizedName}
        className="topbar-auth topbar-auth-ghost"
      />
      {!isAuthenticated ? (
        <Link href="/login?tab=admin" className="topbar-auth topbar-auth-solid" onClick={closeMenu}>
          Admin
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
            <Link href="/demo" className="topbar-link" aria-label="Vox" title="Vox" onClick={closeMenu}>
              Vox
              <span className="topbar-caret" aria-hidden="true">
                ▾
              </span>
            </Link>
            <div className="topbar-menu" role="menu" aria-label="Agenti attivi">
              <p className="topbar-menu-title">Seleziona agente per test</p>
              <Link href="/demo" className="topbar-menu-item" onClick={closeMenu}>
                Vox
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
          <Link href="/login?tab=admin" className="topbar-link" aria-label="Admin" title="Admin" onClick={closeMenu}>
            Admin
          </Link>
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
                <Link href="/admin/catalog" className="topbar-link" aria-label="Catalogo" title="Catalogo" onClick={closeMenu}>
                  Catalogo
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
            ) : null
          ) : null}
        </nav>
      </details>
    </div>
  );
}
