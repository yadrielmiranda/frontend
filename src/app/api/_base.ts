// src/app/api/_base.ts
/**
 * apiFetch: wrapper unificado para llamar al backend desde Next (App Router).
 * - En servidor (RSC): reenvía cookies al backend y si hay 401 intenta /auth/refresh y reintenta.
 * - En cliente: credentials: 'include' y auto-refresh 1 vez si hay 401.
 *
 * ✅ FIX: Evitar disparar auth:login-required DOS VECES (solo lo disparamos en el handler final).
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type ApiFetchInit = {
  method?: HttpMethod;
  headers?: HeadersInit;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
  timeoutMs?: number;

  /**
   * ✅ Si true: NO dispara el evento auth:login-required en 401.
   * Útil para el fetch inicial en "/" (landing) para no abrir el modal.
   */
  suppressAuthEvent?: boolean;
};

const isServer = typeof window === "undefined";

/**
 * Construye una URL con query params.
 */
function buildUrl(path: string, query?: ApiFetchInit["query"]) {
  const base = path.startsWith("http") ? path : `${API_URL}${path}`;
  if (!query) return base;

  const q = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null) q.append(k, String(v));
  });

  const sep = base.includes("?") ? "&" : "?";
  return q.toString() ? `${base}${sep}${q.toString()}` : base;
}

/**
 * Normaliza headers y body.
 */
function normalizeRequest(init: ApiFetchInit): {
  headers: HeadersInit;
  body?: BodyInit;
} {
  const headers: HeadersInit = { ...(init.headers || {}) };

  if (init.body instanceof FormData) {
    return { headers, body: init.body as BodyInit };
  }

  if (init.body !== undefined && init.body !== null) {
    if (!("Content-Type" in (headers as any))) {
      (headers as Record<string, string>)["Content-Type"] = "application/json";
    }
    return { headers, body: JSON.stringify(init.body) };
  }

  return { headers };
}

/**
 * Intenta parsear JSON; si falla, devuelve texto.
 */
async function parseResponse(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {}
  }
  return await res.text();
}

/**
 * Helper: detecta endpoints auth para evitar loops.
 */
function isAuthUrl(url: string) {
  return (
    url.includes("/api/auth/refresh") ||
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/register")
  );
}

/**
 * Lee todos los Set-Cookie del response en Node runtime.
 */
function getSetCookies(refreshRes: Response): string[] {
  const anyHeaders = refreshRes.headers as any;

  // Node/undici (a veces) expone getSetCookie()
  if (typeof anyHeaders.getSetCookie === "function") {
    const arr = anyHeaders.getSetCookie();
    return Array.isArray(arr) ? arr : [];
  }

  // fallback: puede venir uno solo
  const sc = refreshRes.headers.get("set-cookie");
  return sc ? [sc] : [];
}

/**
 * Extrae el valor de una cookie desde un header Set-Cookie (string).
 * Ej: "access_token=XYZ; Path=/; HttpOnly" => XYZ
 */
function pickCookieValueFromSetCookie(
  setCookie: string,
  name: string
): string | undefined {
  const m = setCookie.match(new RegExp(`(?:^|;)\\s*${name}=([^;]+)`));
  return m?.[1];
}

/**
 * Construye Cookie header limpio SOLO con name=value.
 */
function buildCookieHeader(pairs: Array<[string, string | undefined]>) {
  return pairs
    .filter(([, v]) => !!v)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

/**
 * Wrapper principal.
 */
export async function apiFetch<T = unknown>(
  path: string,
  init: ApiFetchInit = {}
): Promise<T> {
  const method: HttpMethod = init.method ?? "GET";
  const url = buildUrl(path, init.query);
  const { headers, body } = normalizeRequest(init);

  // Timeout
  let controller: AbortController | undefined;
  let timeoutId: NodeJS.Timeout | undefined;
  if (init.timeoutMs && typeof AbortController !== "undefined") {
    controller = new AbortController();
    timeoutId = setTimeout(() => controller?.abort(), init.timeoutMs);
  }

  // ✅ SERVER: reenviar cookies completas al backend
  let cookieHeaderForServer: string | undefined;

  if (isServer) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();

    const all = cookieStore.getAll();
    cookieHeaderForServer = all.map((c) => `${c.name}=${c.value}`).join("; ");

    if (cookieHeaderForServer) {
      (headers as Record<string, string>)["Cookie"] = cookieHeaderForServer;
    }
  }

  const doFetch = (extraHeaders?: HeadersInit) =>
    fetch(url, {
      method,
      headers: { ...(headers as any), ...(extraHeaders as any) },
      body,
      cache: init.cache,
      next: init.next,
      ...(isServer ? {} : { credentials: "include" as const }),
      signal: controller?.signal,
    });

  let res = await doFetch().finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });

  /**
   * ✅ CLIENT: auto-refresh 1 vez si 401
   * ✅ FIX: aquí NO disparamos el evento; lo dejamos para el handler final (para evitar doble-dispatch)
   */
  if (!isServer && res.status === 401 && !isAuthUrl(url)) {
    const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (refreshRes.ok) {
      res = await doFetch();
    } else {
      // ✅ no disparamos aquí; caerá al handler final y disparará 1 sola vez (si no está suprimido)
    }
  }

  /**
   * ✅ SERVER: auto-refresh 1 vez si 401
   * - refresh reenviando cookies
   * - leer set-cookie(s)
   * - reintentar con Cookie header limpio (access_token + refresh_token)
   */
  if (isServer && res.status === 401 && !isAuthUrl(url)) {
    const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: cookieHeaderForServer
        ? { Cookie: cookieHeaderForServer }
        : undefined,
      cache: "no-store",
    });

    if (refreshRes.ok) {
      const setCookies = getSetCookies(refreshRes);

      // Extraer nuevos valores si vinieron
      let newAccess: string | undefined;
      let newRefresh: string | undefined;

      for (const sc of setCookies) {
        newAccess =
          newAccess ?? pickCookieValueFromSetCookie(sc, "access_token");
        newRefresh =
          newRefresh ?? pickCookieValueFromSetCookie(sc, "refresh_token");
      }

      // Si no pudimos extraerlos, igual reintentamos con las cookies originales
      const retryCookieHeader =
        buildCookieHeader([
          ["access_token", newAccess],
          ["refresh_token", newRefresh],
        ]) || cookieHeaderForServer;

      res = await doFetch(
        retryCookieHeader ? { Cookie: retryCookieHeader } : undefined
      );
    }
    // si refresh falla, dejamos caer al handler de error
  }

  // Manejo de errores
  if (!res.ok) {
    // ✅ CLIENT: dispara modal SOLO si no está suprimido
    if (
      !isServer &&
      res.status === 401 &&
      !isAuthUrl(url) &&
      !init.suppressAuthEvent
    ) {
      window.dispatchEvent(new CustomEvent("auth:login-required"));
    }

    const payload = await parseResponse(res);
    const message =
      (payload && (payload as any).message) ||
      (typeof payload === "string" ? payload : "Request failed");

    const err = new Error(message) as Error & { status?: number; data?: unknown };
    err.status = res.status;
    err.data = payload;
    throw err;
  }

  return (await parseResponse(res)) as T;
}

export function apiGet<T = unknown>(
  path: string,
  query?: ApiFetchInit["query"],
  init?: Omit<ApiFetchInit, "method" | "query">
) {
  return apiFetch<T>(path, { ...init, method: "GET", query });
}

export function apiPost<T = unknown>(
  path: string,
  body?: unknown,
  init?: Omit<ApiFetchInit, "method" | "body">
) {
  return apiFetch<T>(path, { ...init, method: "POST", body });
}

export function apiPatch<T = unknown>(
  path: string,
  body?: unknown,
  init?: Omit<ApiFetchInit, "method" | "body">
) {
  return apiFetch<T>(path, { ...init, method: "PATCH", body });
}

export function apiDelete<T = unknown>(
  path: string,
  init?: Omit<ApiFetchInit, "method">
) {
  return apiFetch<T>(path, { ...init, method: "DELETE" });
}
