import { isCompanyDealerInvitation, isCompanyPublicRoute } from "./company-public-routes";

const storageKey = "impact-company-campaign-v1";
const lifetime = 24 * 60 * 60 * 1000;
export const campaignKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid"] as const;
const allowedKeys = new Set<string>([...campaignKeys, "lang"]);
const label = /^[A-Za-z0-9_-]{1,100}$/;
const clickId = /^[A-Za-z0-9_-]{1,300}$/;
let companyDocument: Document | undefined;

// Keep only attribution fields. A referral, duplicate or malformed tag must not reuse an older campaign.
export function parseCompanyCampaign(params: URLSearchParams): URLSearchParams | null {
  for (const key of params.keys()) {
    if (!allowedKeys.has(key) || params.getAll(key).length !== 1) return null;
  }
  const language = params.get("lang");
  if (language !== null && language !== "en" && language !== "es") return null;
  const result = new URLSearchParams();
  for (const key of campaignKeys) {
    const value = params.get(key);
    if (value === null) continue;
    if (!(key === "fbclid" ? clickId : label).test(value)) return null;
    result.set(key, value);
  }
  return result;
}

function forgetCampaign() {
  window.sessionStorage.removeItem(storageKey);
}

function storedCampaign(): URLSearchParams | null {
  const raw = window.sessionStorage.getItem(storageKey);
  if (!raw) return null;
  let stored;
  try { stored = JSON.parse(raw); } catch {
    forgetCampaign();
    return null;
  }
  if (typeof stored?.query === "string" && Number.isFinite(stored.since)) {
    const age = Date.now() - stored.since;
    const tags = parseCompanyCampaign(new URLSearchParams(stored.query));
    if (age >= 0 && age < lifetime && tags?.size && tags.toString() === stored.query) return tags;
  }
  forgetCampaign();
  return null;
}

function continuesCompanyVisit(url: URL): boolean {
  // Next links can navigate within a document whose referrer is still the original ad.
  if (companyDocument === document) return true;
  const nav = window.performance?.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type === "reload" || nav?.type === "back_forward") return true;
  if (!document.referrer) return false;
  const from = new URL(document.referrer);
  return from.origin === url.origin && (isCompanyPublicRoute(from.pathname) || from.pathname === "/login/register");
}

export function captureCompanyCampaign(): void {
  try {
    const url = new URL(window.location.href);
    if (!isCompanyPublicRoute(url.pathname)) return;
    const tags = parseCompanyCampaign(url.searchParams);
    const continuing = continuesCompanyVisit(url);
    companyDocument = document;
    if (tags?.size) {
      const query = tags.toString();
      if (continuing && storedCampaign()?.toString() === query) return;
      window.sessionStorage.setItem(storageKey, JSON.stringify({ query, since: Date.now() }));
    } else if (!tags || !continuing) {
      forgetCampaign();
    }
  } catch { /* Attribution is optional when browser storage is unavailable. */ }
}

export function readCompanyCampaign(): URLSearchParams | null {
  try {
    const url = new URL(window.location.href);
    if (!isCompanyPublicRoute(url.pathname) && url.pathname !== "/login/register" && !isCompanyDealerInvitation(url.pathname)) return null;
    const tags = parseCompanyCampaign(url.searchParams);
    if (!tags || (!tags.size && !continuesCompanyVisit(url))) {
      forgetCampaign();
      return null;
    }
    const stored = storedCampaign();
    if (tags.size && stored?.toString() !== tags.toString()) {
      // Explicitly tagged registration URLs have their own attribution.
      if (stored) forgetCampaign();
      return null;
    }
    return stored;
  } catch { return null; }
}
