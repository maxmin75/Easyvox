import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import EasyVoxHomePage from "@/components/EasyVoxHomePage";
import { authCookieName, getAuthUserFromNextAuthSession, getAuthUserFromToken } from "@/lib/auth";
import { getAccessProfile } from "@/lib/access-profile";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value ?? null;
  const user = (await getAuthUserFromToken(token)) ?? (await getAuthUserFromNextAuthSession());

  if (user) {
    const profile = await getAccessProfile(user);
    if (profile.isEasyVoxAdmin) {
      redirect("/admin");
    }
  }

  return <EasyVoxHomePage />;
}
