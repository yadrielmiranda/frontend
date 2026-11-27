import { NextRequest, NextResponse } from "next/server";
import { PORTAL_LANGUAGE_HINT_HEADER } from "./lib/portal-language-routes";
import { COMPANY_LANGUAGE_COOKIE, isCompanyPublicRoute } from "./lib/company-public-routes";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (isCompanyPublicRoute(path)) {
    const saved = request.cookies.get(COMPANY_LANGUAGE_COOKIE)?.value;
    const current = path.startsWith("/es/") ? "es" : "en";
    if ((saved === "en" || saved === "es") && saved !== current) {
      const destination = request.nextUrl.clone();
      destination.pathname = saved === "es" ? `/es${path}` : path.slice(3);
      if (destination.searchParams.has("lang")) destination.searchParams.set("lang", saved);
      const response = NextResponse.redirect(destination);
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Vary", "Cookie");
      return response;
    }
    return NextResponse.next();
  }
  // App Router layouts do not receive searchParams. Forward only a valid language hint.
  const headers = new Headers(request.headers);
  const hints = request.nextUrl.searchParams.getAll("lang");
  headers.delete(PORTAL_LANGUAGE_HINT_HEADER);
  if (hints.length === 1 && (hints[0] === "en" || hints[0] === "es")) {
    headers.set(PORTAL_LANGUAGE_HINT_HEADER, hints[0]);
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/", "/login", "/login/register", "/estimates", "/estimates/new",
    "/company", "/es/company", "/for-ai", "/es/for-ai", "/resources/:path*", "/es/resources/:path*",
  ],
};
