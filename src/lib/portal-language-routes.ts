import { isCompanyPublicRoute } from "./company-public-routes";

// Only these portal pages currently render their main content in both languages.
export function isLocalizedPortalPage(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return ["/", "/login", "/login/register", "/estimates", "/estimates/new"].includes(path)
    || /^\/login\/dealer-registration\/[^/]+$/.test(path)
    || /^\/estimates\/\d+(?:\/edit)?$/.test(path)
    || /^\/(orders|installations)(?:\/\d+)?$/.test(path);
}

export const PORTAL_LANGUAGE_HINT_HEADER = "x-portal-language-hint";

export function documentLanguageForRoute(pathname: string, portalLocale: "en" | "es"): "en" | "es" {
  if (isCompanyPublicRoute(pathname)) return pathname.startsWith("/es/") ? "es" : "en";
  if (pathname === "/technician" || pathname.startsWith("/technician/") || pathname.startsWith("/public/")) return "en";
  return portalLocale;
}
