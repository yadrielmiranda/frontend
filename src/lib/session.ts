// src/lib/session.ts
import { cookies } from "next/headers";
import type { AuthUser } from "@/app/types/auth"; // AJUSTA la ruta si difiere

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`,
      {
        method: "GET",
        headers: { Cookie: `access_token=${token}` },
        cache: "no-store",
      }
    );

    if (!res.ok) return null;

    // Este endpoint YA devuelve SAFE + role {id,name,markup}
    const user = (await res.json()) as AuthUser;
    return user;
  } catch (e) {
    console.error("Error in getCurrentUser():", e);
    return null;
  }
}
