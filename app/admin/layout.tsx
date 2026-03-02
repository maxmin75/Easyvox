import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieName, getAuthUserFromToken } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value ?? null;
  const user = await getAuthUserFromToken(token);

  if (!user) {
    redirect("/");
  }

  return <>{children}</>;
}
