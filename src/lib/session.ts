// src/lib/session.ts
import type { AuthUser } from "@/app/types/auth";
import { headers } from "next/headers";
import { cache } from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://10.0.0.4:3000";

async function _getCurrentUser(): Promise<AuthUser | null> {
  // Preserve Next's request-context exceptions instead of treating them as logout.
  const h = await headers();
  const cookie = h.get("cookie") || "";

  const res = await fetch(`${APP_URL}/api/auth/me`, {
    cache: "no-store",
    headers: { cookie },
  });

  if (res.status === 401) return null;
  if (!res.ok) {
    throw new Error("Could not verify your session. Please try again.");
  }

  const data = await res.json();
  if (!data?.user) {
    throw new Error("Could not verify your session. Please try again.");
  }
  return data.user as AuthUser;
}

/**
 * ✅ Dedupe por request:
 * Si SettingsLayout + WriteLayout + Page llaman getCurrentUser() en el MISMO request,
 * solo se ejecuta una vez.
 */
export const getCurrentUser = cache(_getCurrentUser);
