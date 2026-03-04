import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieName, getAuthUserFromNextAuthSession, getAuthUserFromToken } from "@/lib/auth";
import { AuthEntry } from "@/components/AuthEntry";
import { isEasyVoxAdminEmail } from "@/lib/admin/access";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value ?? null;
  const user = (await getAuthUserFromToken(token)) ?? (await getAuthUserFromNextAuthSession());
  if (user) {
    redirect(isEasyVoxAdminEmail(user.email) ? "/admin" : "/client");
  }

  return <AuthEntry modeLocked="login" standalone />;
}
