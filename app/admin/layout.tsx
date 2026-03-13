import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authCookieName, getAuthUserFromNextAuthSession, getAuthUserFromToken } from "@/lib/auth";
import { getAccessProfile } from "@/lib/access-profile";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value ?? null;
  const user = (await getAuthUserFromToken(token)) ?? (await getAuthUserFromNextAuthSession());

  if (!user) {
    redirect("/login");
  }
  const profile = await getAccessProfile(user);
  if (!profile.isEasyVoxAdmin) {
    redirect("/");
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #f7fafc, #eef3f8)" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          backdropFilter: "blur(14px)",
          background: "rgba(255,255,255,0.88)",
          borderBottom: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "14px 0",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 2 }}>
            <Link href="/admin" style={{ textDecoration: "none", color: "#0f172a", fontWeight: 800, fontSize: 18 }}>
              EasyVox Admin
            </Link>
            <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              Backend operativo, catalogo, CRM e configurazione
            </span>
          </div>

          <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }} aria-label="Navigazione backend">
            <Link href="/admin" style={navLinkStyle}>
              Dashboard
            </Link>
            <Link href="/admin/catalog" style={navLinkStyle}>
              Catalogo
            </Link>
            <Link href="/admin/products" style={navLinkStyle}>
              Prodotti
            </Link>
            <Link href="/admin/crm" style={navLinkStyle}>
              CRM
            </Link>
            <Link href="/admin/quotes" style={navLinkStyle}>
              Preventivi
            </Link>
            <Link href="/admin/system-settings" style={navLinkStyle}>
              Impostazioni
            </Link>
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}

const navLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(15,23,42,0.08)",
  background: "white",
  color: "#0f172a",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 600,
} as const;
