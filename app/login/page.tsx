import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieName, getAuthUserFromNextAuthSession, getAuthUserFromToken } from "@/lib/auth";
import { AuthEntry } from "@/components/AuthEntry";
import { getAccessProfile } from "@/lib/access-profile";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value ?? null;
  const user = (await getAuthUserFromToken(token)) ?? (await getAuthUserFromNextAuthSession());
  if (user) {
    const profile = await getAccessProfile(user);
    redirect(profile.isEasyVoxAdmin ? "/admin" : "/");
  }

  return <AuthEntry modeLocked="login" standalone adminOnly />;
}
