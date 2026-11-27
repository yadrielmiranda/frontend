import { NextRequest, NextResponse } from "next/server";
import { COMPANY_LANGUAGE_COOKIE, isCompanyPublicRoute } from "@/lib/company-public-routes";

async function selectLanguage(request: NextRequest, { params }: { params: Promise<{ target: string[] }> }) {
  const { target } = await params;
  const pathname = "/" + target.join("/");
  if (!isCompanyPublicRoute(pathname)) return new Response(null, { status: 404 });

  const language = pathname.startsWith("/es/") ? "es" : "en";
  const query = new URLSearchParams(request.nextUrl.search);
  // The explicit English link also works when the browser blocks cookies.
  if (pathname === "/company") query.set("lang", "en");
  else query.delete("lang");

  const response = new NextResponse(null, {
    status: request.method === "POST" ? 204 : 303,
    headers: { "Cache-Control": "private, no-store" },
  });
  if (request.method === "GET") {
    response.headers.set("Location", query.size ? `${pathname}?${query}` : pathname);
  }
  response.cookies.set(COMPANY_LANGUAGE_COOKIE, language, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
  // Remove the former, more specific cookie so it cannot override a new choice on /company.
  response.headers.append("Set-Cookie", `${COMPANY_LANGUAGE_COOKIE}=; Path=/company; Max-Age=0; HttpOnly; SameSite=Lax`);
  return response;
}

export { selectLanguage as GET, selectLanguage as POST };
