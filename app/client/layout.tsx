import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieName, getAuthUserFromNextAuthSession, getAuthUserFromToken } from "@/lib/auth";
import { isEasyVoxAdminEmail } from "@/lib/admin/access";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value ?? null;
  const user = (await getAuthUserFromToken(token)) ?? (await getAuthUserFromNextAuthSession());

  if (!user) {
    redirect("/login");
  }

  if (isEasyVoxAdminEmail(user.email)) {
    redirect("/admin");
  }

  return <>{children}</>;
}
