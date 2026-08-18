import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const PDF_VIEWS = new Set([
  "client",
  "dealer_internal",
  "dealer_public",
  "dealer_public_total",
  "admin",
]);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSetCookies(response: Response): string[] {
  const headers = response.headers as unknown as {
    getSetCookie?: () => string[] | string;
  };

  if (typeof headers.getSetCookie === "function") {
    const values = headers.getSetCookie();
    return Array.isArray(values) ? values : [values];
  }

  const value = response.headers.get("set-cookie");
  return value ? [value] : [];
}

function updateCookieMap(cookieMap: Map<string, string>, setCookie: string) {
  const cookiePair = setCookie.match(/^\s*([^=;\s]+)=([^;]*)/);
  if (!cookiePair) return;

  const [, name, value] = cookiePair;
  if (value) cookieMap.set(name, value);
  else cookieMap.delete(name);
}

function buildCookieHeader(cookieMap: Map<string, string>) {
  return Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function requestBackendPdf(
  id: string,
  view: string,
  cookieHeader: string,
) {
  return fetch(
    `${API_URL}/api/estimates/${id}/pdf?view=${encodeURIComponent(view)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/pdf",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    },
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const view = request.nextUrl.searchParams.get("view")?.trim() ?? "";

  if (!/^\d+$/.test(id) || Number(id) <= 0) {
    return NextResponse.json({ message: "Invalid estimate id." }, { status: 400 });
  }

  if (!PDF_VIEWS.has(view)) {
    return NextResponse.json({ message: "Invalid PDF view." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const cookieMap = new Map<string, string>(
    cookieStore
      .getAll()
      .map((cookie) => [cookie.name, cookie.value] as const),
  );
  let cookieHeader = buildCookieHeader(cookieMap);
  let backendResponse = await requestBackendPdf(id, view, cookieHeader);
  let refreshedCookies: string[] = [];

  if (backendResponse.status === 401 && cookieMap.has("refresh_token")) {
    const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      cache: "no-store",
    });

    refreshedCookies = getSetCookies(refreshResponse);
    for (const setCookie of refreshedCookies) {
      updateCookieMap(cookieMap, setCookie);
    }

    if (refreshResponse.ok) {
      cookieHeader = buildCookieHeader(cookieMap);
      backendResponse = await requestBackendPdf(id, view, cookieHeader);
    }
  }

  if (!backendResponse.ok) {
    const contentType = backendResponse.headers.get("content-type") ?? "text/plain";
    const body = await backendResponse.text();
    const response = new NextResponse(body, {
      status: backendResponse.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });

    for (const setCookie of refreshedCookies) {
      response.headers.append("Set-Cookie", setCookie);
    }

    return response;
  }

  const pdf = await backendResponse.arrayBuffer();
  const response = new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        backendResponse.headers.get("content-disposition") ??
        `inline; filename="estimate-${id}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });

  for (const setCookie of refreshedCookies) {
    response.headers.append("Set-Cookie", setCookie);
  }

  return response;
}
