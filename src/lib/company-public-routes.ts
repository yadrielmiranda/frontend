export const COMPANY_PUBLIC_ROUTES = [
  "/company",
  "/es/company",
  "/for-ai",
  "/es/for-ai",
  "/resources",
  "/es/resources",
  "/resources/prepare-your-quote",
  "/es/resources/prepare-your-quote",
  "/resources/compare-impact-products",
  "/es/resources/compare-impact-products",
] as const;

const companyRoutes = new Set<string>(COMPANY_PUBLIC_ROUTES);

export const dealerRegistrationUrl = "https://authenticevolutionco.com/login/dealer-registration/453508cfa6b7b2055a4f70614bc6f6c5b9b27691aeb0037bd0505fcbe9418c53";
const companyDealerPath = new URL(dealerRegistrationUrl).pathname;

export function isCompanyDealerInvitation(pathname: string): boolean {
  return pathname === companyDealerPath;
}

export const COMPANY_LANGUAGE_COOKIE = "company_language";

const languageChangeKey = "company-language-change";

export function announceCompanyLanguage(locale: "en" | "es") {
  try {
    window.localStorage.setItem(languageChangeKey, `${locale}:${Date.now()}`);
  } catch {
    // The HTTP-only cookie also works when web storage is unavailable.
  }
}

export function listenForCompanyLanguage(apply: (locale: "en" | "es") => void) {
  function currentSignal() {
    try { return window.localStorage.getItem(languageChangeKey); } catch { return null; }
  }
  let last = currentSignal();
  function synchronize() {
    const signal = currentSignal();
    if (!signal || signal === last) return;
    last = signal;
    const locale = signal.split(":")[0];
    if (locale === "en" || locale === "es") apply(locale);
  }
  function onStorage(event: StorageEvent) {
    if (event.key === languageChangeKey) synchronize();
  }
  function onRestore(event: PageTransitionEvent) {
    if (event.persisted) synchronize();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener("pageshow", onRestore);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("pageshow", onRestore);
  };
}

export async function persistPortalLanguage(locale: "en" | "es") {
  const target = locale === "es" ? "/es/company" : "/company";
  const response = await fetch(`/company/language${target}`, { method: "POST", keepalive: true });
  if (!response.ok) throw new Error("Language preference");
  announceCompanyLanguage(locale);
}

export function preferredCompanyLanguage(saved: string | undefined, accepted: string | null): "en" | "es" {
  if (saved === "en" || saved === "es") return saved;

  let preferred: "en" | "es" = "en";
  let highestWeight = 0;
  for (const range of (accepted ?? "").split(",")) {
    const match = /^\s*(en|es)(?:-[a-z0-9]+)*\s*(?:;\s*q\s*=\s*(0(?:\.\d{0,3})?|1(?:\.0{0,3})?))?\s*$/i.exec(range);
    if (!match) continue;
    const weight = Number(match[2] ?? 1);
    if (weight > highestWeight) {
      preferred = match[1].toLowerCase() === "es" ? "es" : "en";
      highestWeight = weight;
    }
  }
  return preferred;
}

export function isCompanyPublicRoute(pathname: string): boolean {
  return companyRoutes.has(pathname.replace(/\/+$/, ""));
}
