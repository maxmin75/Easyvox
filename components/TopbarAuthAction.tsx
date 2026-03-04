"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

type TopbarAuthActionProps = {
  isAuthenticated: boolean;
  className?: string;
};

export default function TopbarAuthAction({ isAuthenticated, className }: TopbarAuthActionProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
