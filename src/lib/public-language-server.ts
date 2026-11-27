import { cookies, headers } from "next/headers";
import { COMPANY_LANGUAGE_COOKIE, preferredCompanyLanguage } from "./company-public-routes";

export { requestPortalLanguage as requestPublicLanguage };

export async function requestPortalLanguage(hint?: string | string[]): Promise<"en" | "es"> {
  return (await portalLanguagePreference(hint)).locale;
}

export async function portalLanguagePreference(hint?: string | string[]): Promise<{locale: "en" | "es"; hasPreference: boolean}> {
  const [stored, request] = await Promise.all([cookies(), headers()]);
  const saved = stored.get(COMPANY_LANGUAGE_COOKIE)?.value;
  if (saved === "en" || saved === "es") return { locale: saved, hasPreference: true };
  const locale = hint === "en" || hint === "es" ? hint : preferredCompanyLanguage(undefined, request.get("accept-language"));
  return { locale, hasPreference: false };
}
