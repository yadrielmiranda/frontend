// src/app/api/_base.ts
/**
 * apiFetch: wrapper unificado para llamar a tu backend desde el frontend (Next 15).
 * - En servidor: lee la cookie con `await cookies()` y la reenvía en el header `Cookie`.
 * - En cliente: usa `credentials: 'include'` para que el navegador envíe la cookie.
 * - Permite override del token (SSR) vía `options.token`.
 * - Serializa body a JSON automáticamente y maneja query params.
 * - Lanza Error con mensaje del backend cuando !res.ok
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type ApiFetchInit = {
  method?: HttpMethod;
  headers?: HeadersInit;
  /**
   * Cuerpo del request. Si no es FormData, se serializa a JSON y se setea Content-Type.
   */
  body?: unknown;
  /**
   * Query params en el URL (?a=1&b=2)
   */
  query?: Record<string, string | number | boolean | undefined | null>;
  /**
   * Cuando llamas desde el servidor (SSR) puedes pasar un token manualmente.
   * Si no lo pasas, intentará leer la cookie 'access_token' con await cookies().
   */
  token?: string;
  /**
   * Opciones nativas de fetch para Next:
   * - cache / next (revalidate / tags), etc.
   */
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
  /**
   * Tiempo máximo (ms) antes de abortar el fetch.
   */
  timeoutMs?: number;
};

const isServer = typeof window === 'undefined';

/**
 * Lee el token de acceso:
 * - Server: await cookies() (Next 15).
 * - Client: parsea document.cookie (best-effort).
 */
export async function getAccessToken(): Promise<string | undefined> {
  if (isServer) {
    // Import dinámico para no romper el bundle del cliente
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    return cookieStore.get('access_token')?.value;
  }
  // Cliente
  const m = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

/**
 * Construye una URL con query params.
 */
function buildUrl(path: string, query?: ApiFetchInit['query']) {
  const base = path.startsWith('http') ? path : `${API_URL}${path}`;
  if (!query) return base;
  const q = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null) q.append(k, String(v));
  });
  const sep = base.includes('?') ? '&' : '?';
  return q.toString() ? `${base}${sep}${q.toString()}` : base;
}

/**
 * Normaliza cabeceras y body.
 */
function normalizeRequest(init: ApiFetchInit): {
  headers: HeadersInit;
  body?: BodyInit;
  contentTypeSet: boolean;
} {
  const headers: HeadersInit = { ...(init.headers || {}) };

  // Si el body es FormData, no forzamos Content-Type (el navegador pone boundary)
  if (init.body instanceof FormData) {
    return { headers, body: init.body as BodyInit, contentTypeSet: false };
  }

  // Si hay body (objeto), lo serializamos como JSON
  if (init.body !== undefined && init.body !== null) {
    if (!('Content-Type' in (headers as any))) {
      (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }
    return {
      headers,
      body: JSON.stringify(init.body),
      contentTypeSet: true,
    };
  }

  return { headers, contentTypeSet: false };
}

/**
 * Intenta parsear JSON de respuesta. Si falla, devuelve texto plano.
 */
async function parseResponse(res: Response) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      // cae a texto
    }
  }
  return await res.text();
}

/**
 * Wrapper principal.
 * @param path Ruta absoluta del backend (ej: '/api/orders')
 * @param init Opciones de la llamada
 */
export async function apiFetch<T = unknown>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const method: HttpMethod = init.method ?? 'GET';
  const url = buildUrl(path, init.query);

  const { headers, body } = normalizeRequest(init);

  // Autenticación
  if (isServer) {
    const token = init.token ?? (await getAccessToken());
    if (token) {
      // En servidor le pasamos el token vía cookie header
      // (equivalente a que el navegador envíe la cookie)
      (headers as Record<string, string>)['Cookie'] = `access_token=${token}`;
    }
  }

  // Control de timeout
  let controller: AbortController | undefined;
  let timeoutId: NodeJS.Timeout | undefined;
  if (init.timeoutMs && typeof AbortController !== 'undefined') {
    controller = new AbortController();
    timeoutId = setTimeout(() => controller?.abort(), init.timeoutMs);
  }

  // Llamada
  const res = await fetch(url, {
    method,
    headers,
    body,
    cache: init.cache,
    next: init.next,
    // En cliente, aseguramos enviar cookies
    ...(isServer ? {} : { credentials: 'include' as const }),
    signal: controller?.signal,
  }).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });

  // Manejo de errores
  if (!res.ok) {
    const payload = await parseResponse(res);
    // Intentamos extraer message estándar del backend Nest
    const message =
      (payload && (payload as any).message) ||
      (typeof payload === 'string' ? payload : 'Request failed');
    const err = new Error(message) as Error & { status?: number; data?: unknown };
    err.status = res.status;
    err.data = payload;
    throw err;
  }

  return (await parseResponse(res)) as T;
}

/**
 * Azúcar para GET con query params.
 */
export function apiGet<T = unknown>(
  path: string,
  query?: ApiFetchInit['query'],
  init?: Omit<ApiFetchInit, 'method' | 'query'>
) {
  return apiFetch<T>(path, { ...init, method: 'GET', query });
}

/**
 * Azúcar para POST JSON.
 */
export function apiPost<T = unknown>(
  path: string,
  body?: unknown,
  init?: Omit<ApiFetchInit, 'method' | 'body'>
) {
  return apiFetch<T>(path, { ...init, method: 'POST', body });
}

/**
 * Azúcar para PATCH JSON.
 */
export function apiPatch<T = unknown>(
  path: string,
  body?: unknown,
  init?: Omit<ApiFetchInit, 'method' | 'body'>
) {
  return apiFetch<T>(path, { ...init, method: 'PATCH', body });
}

/**
 * Azúcar para DELETE.
 */
export function apiDelete<T = unknown>(
  path: string,
  init?: Omit<ApiFetchInit, 'method'>
) {
  return apiFetch<T>(path, { ...init, method: 'DELETE' });
}
