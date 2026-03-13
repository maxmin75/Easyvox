export const CHAT_ACCESS_PROFILE_COOKIE = "easyvox_chat_profile";

type ChatAccessProfileInput = {
  name: string;
  email?: string | null;
};

export function serializeChatAccessProfileCookieValue(profile: ChatAccessProfileInput): string {
  return encodeURIComponent(
    JSON.stringify({
      name: profile.name.trim(),
      email: profile.email?.trim().toLowerCase() || undefined,
    }),
  );
}

export function parseChatAccessProfileCookieValue(value: string | null | undefined) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as { name?: unknown; email?: unknown };
    const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
    const email = typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : "";
    if (!name) return null;
    return {
      name,
      email: email || undefined,
    };
  } catch {
    return null;
  }
}

export function getCompactChatAccessDisplayName(name: string | null | undefined, email?: string | null) {
  const normalizedName = name?.trim() || "";
  const firstName = normalizedName.split(/\s+/).filter(Boolean)[0] || "";
  const fallback =
    email?.trim().toLowerCase().split("@")[0]?.replace(/[._-]+/g, " ").trim() || "";
  const base = firstName || fallback || normalizedName;
  if (!base) return null;
  return base.slice(0, 18);
}
