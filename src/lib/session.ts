// src/lib/session.ts
import type { AuthUser } from "@/app/types/auth";
import { headers } from "next/headers";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://10.0.0.4:3000";

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    // ✅ trae el cookie header REAL del request actual (SSR)
    const h = await headers();
    const cookie = h.get("cookie") || "";

    const res = await fetch(`${APP_URL}/api/auth/me`, {
      cache: "no-store",
      headers: { cookie }, // ✅ AQUÍ está la diferencia
    });

    if (!res.ok) return null;

    const data = await res.json();
    return (data.user ?? null) as AuthUser | null;
  } catch (e) {
    console.error("getCurrentUser SSR error:", e);
    return null;
  }
}
