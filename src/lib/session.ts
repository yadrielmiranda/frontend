// src/lib/session.ts
import type { AuthUser } from "@/app/types/auth";
import { headers } from "next/headers";
import { cache } from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://10.0.0.4:3000";

async function _getCurrentUser(): Promise<AuthUser | null> {
  try {
    // ✅ trae el cookie header REAL del request actual (SSR)
    const h = await headers();
    const cookie = h.get("cookie") || "";

    const res = await fetch(`${APP_URL}/api/auth/me`, {
      cache: "no-store",
      headers: { cookie }, 
    });

    if (!res.ok) return null;

    const data = await res.json();
    return (data.user ?? null) as AuthUser | null;
  } catch (e) {
    console.error("getCurrentUser SSR error:", e);
    return null;
  }
}

/**
 * ✅ Dedupe por request:
 * Si SettingsLayout + WriteLayout + Page llaman getCurrentUser() en el MISMO request,
 * solo se ejecuta una vez.
 */
export const getCurrentUser = cache(_getCurrentUser);
