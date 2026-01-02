// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function buildCookieHeader(access?: string, refresh?: string) {
  // ✅ Construye Cookie header solo con name=value (sin atributos)
  return [
    access ? `access_token=${access}` : null,
    refresh ? `refresh_token=${refresh}` : null,
  ]
    .filter(Boolean)
    .join("; ");
}

function getSetCookies(res: Response): string[] {
  // ✅ Node/undici puede exponer getSetCookie()
  const anyHeaders = res.headers as any;
  if (typeof anyHeaders.getSetCookie === "function") {
    const arr = anyHeaders.getSetCookie();
    return Array.isArray(arr) ? arr : [];
  }

  // ✅ Fallback: a veces viene uno solo
  const sc = res.headers.get("set-cookie");
  return sc ? [sc] : [];
}

function pickCookieValue(setCookieHeaders: string[], name: string): string | undefined {
  // ✅ Extrae name=VALUE del set-cookie
  for (const h of setCookieHeaders) {
    const m = h.match(new RegExp(`${name}=([^;]+)`));
    if (m?.[1]) return m[1];
  }
  return undefined;
}

export async function GET() {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  // ✅ Si no hay nada, no hay sesión
  if (!accessToken && !refreshToken) {
    return NextResponse.json(
      { isAuthenticated: false, user: null },
      { status: 401 }
    );
  }

  // ✅ 1) Intentamos profile con lo que tengamos
  let cookieHeader = buildCookieHeader(accessToken, refreshToken);

  let profileRes = await fetch(`${API_URL}/api/auth/profile`, {
    method: "GET",
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: "no-store",
  });

  // ✅ Aquí guardaremos cualquier set-cookie que venga del refresh
  let setCookies: string[] = [];

  // ✅ 2) Si access expiró y hay refresh, refrescamos y reintentamos
  if (profileRes.status === 401 && refreshToken) {
    const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      cache: "no-store",
    });

    // ✅ Importante: capturar set-cookie aunque refresh falle (puede venir limpieza)
    setCookies = getSetCookies(refreshRes);

    if (refreshRes.ok) {
      const newAccess =
        pickCookieValue(setCookies, "access_token") ?? accessToken;
      const newRefresh =
        pickCookieValue(setCookies, "refresh_token") ?? refreshToken;

      cookieHeader = buildCookieHeader(newAccess, newRefresh);

      profileRes = await fetch(`${API_URL}/api/auth/profile`, {
        method: "GET",
        headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
        cache: "no-store",
      });
    }
  }

  // ✅ Si todavía falla, no hay sesión válida
  if (!profileRes.ok) {
    const res = NextResponse.json(
      { isAuthenticated: false, user: null },
      { status: 401 }
    );

    // ✅ Si el backend mandó set-cookie (por ejemplo para limpiar), lo propagamos
    for (const c of setCookies) res.headers.append("set-cookie", c);

    return res;
  }

  const user = await profileRes.json();

  const res = NextResponse.json(
    { isAuthenticated: true, user },
    { status: 200 }
  );

  // ✅ Propagar cookies nuevas si refresh las rotó
  for (const c of setCookies) res.headers.append("set-cookie", c);

  return res;
}
