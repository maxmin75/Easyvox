"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CHAT_ACCESS_PROFILE_COOKIE,
  getCompactChatAccessDisplayName,
  parseChatAccessProfileCookieValue,
} from "@/lib/chat-access-profile";

type TopbarAuthActionProps = {
  isAuthenticated: boolean;
  recognizedName?: string | null;
  className?: string;
};

function readRecognizedNameFromCookie() {
  if (typeof document === "undefined") return null;
  const cookieEntry = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CHAT_ACCESS_PROFILE_COOKIE}=`));
  const parsedProfile = parseChatAccessProfileCookieValue(cookieEntry?.split("=")[1] ?? null);
  return getCompactChatAccessDisplayName(parsedProfile?.name, parsedProfile?.email);
}

export default function TopbarAuthAction({
  isAuthenticated,
  recognizedName,
  className,
}: TopbarAuthActionProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [chatDisplayName, setChatDisplayName] = useState(recognizedName ?? null);

  useEffect(() => {
    setChatDisplayName(recognizedName ?? null);
  }, [recognizedName]);

  useEffect(() => {
    if (isAuthenticated) return;

    const syncRecognizedName = () => {
      setChatDisplayName(readRecognizedNameFromCookie());
    };

    syncRecognizedName();
    window.addEventListener("easyvox:chat-profile-updated", syncRecognizedName);
    return () => {
      window.removeEventListener("easyvox:chat-profile-updated", syncRecognizedName);
    };
  }, [isAuthenticated]);

  async function onLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await signOut({ redirect: false });
    } finally {
      router.push("/");
      router.refresh();
      setIsLoggingOut(false);
    }
  }

  if (!isAuthenticated) {
    if (chatDisplayName) {
      return (
        <Link
          href="/demo"
          className={className ?? "topbar-link topbar-link-accent"}
          aria-label={`Utente chat ${chatDisplayName}`}
          title={chatDisplayName}
        >
          {chatDisplayName}
        </Link>
      );
    }

    return (
      <Link
        href="/login"
        className={className ?? "topbar-link topbar-link-accent"}
        aria-label="Admin Dashboard"
        title="Admin"
      >
        Log in
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className ?? "topbar-link topbar-link-accent topbar-link-button"}
      onClick={onLogout}
      aria-label="Sign out"
      title="Sign out"
    >
      {isLoggingOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
