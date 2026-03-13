import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieName, getAuthUserFromNextAuthSession, getAuthUserFromToken } from "@/lib/auth";
import { getAccessProfile } from "@/lib/access-profile";

export default async function PostLoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value ?? null;
  const user = (await getAuthUserFromToken(token)) ?? (await getAuthUserFromNextAuthSession());

  if (!user) {
    redirect("/login");
  }

  const profile = await getAccessProfile(user);
  redirect(profile.isEasyVoxAdmin ? "/admin" : "/");
}
