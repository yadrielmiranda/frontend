import { parseCompanyCampaign, readCompanyCampaign } from "./company-campaign";
import { isCompanyDealerInvitation, isCompanyPublicRoute } from "./company-public-routes";
import { consumeDealerConversionHandoff, dealerSubmittedPath } from "./dealer-submission-receipt";

const companyOrigins = new Set(["https://authenticevolutionco.com", "https://www.authenticevolutionco.com"]);
const metaSources = new Set(["facebook", "instagram", "meta", "fb", "ig"]);
const metaReferrers = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "l.facebook.com", "lm.facebook.com", "instagram.com", "www.instagram.com", "l.instagram.com"]);
const companyLandingPages = new Set(["/company", "/es/company"]);

type Pixel = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[][]; push?: Pixel; loaded?: boolean; version?: string };
type PixelWindow = Window & { fbq?: Pixel; _fbq?: Pixel };
let ownedPixel: Pixel | undefined;
let scriptReady: Promise<void> | undefined;
let lastPageView: string | undefined;
let clientCompleted = false;

function hasMetaCampaign(params: URLSearchParams | null): boolean {
  if (!params?.has("utm_campaign")) return false;
  return params.has("fbclid") || metaSources.has(params.get("utm_source")?.toLowerCase() ?? "");
}

function productionPage(address: string): URL | undefined {
  try {
    const url = new URL(address);
    if (companyOrigins.has(url.origin) && !url.username && !url.password && !url.hash) return url;
  } catch { /* Only absolute public production URLs are eligible. */ }
}

// fbevents can read document.referrer itself. Keep private paths, tokens and unknown queries out.
function safeReferrer(referrer: string, origin: string): boolean {
  if (!referrer) return true;
  try {
    const ref = new URL(referrer);
    if (ref.protocol !== "https:" || ref.port || ref.username || ref.password || ref.hash) return false;
    if (metaReferrers.has(ref.hostname)) return ref.pathname === "/" && !ref.search;
    if (!companyOrigins.has(ref.origin)) return false;
    // The public www site links to an apex domain invitation. Browsers can send just its origin.
    if (ref.pathname === "/" && !ref.search) return true;
    return ref.origin === origin && isCompanyPublicRoute(ref.pathname) && parseCompanyCampaign(ref.searchParams) !== null;
  } catch { return false; }
}

function safeCampaignPage(url: URL, referrer: string, cached: URLSearchParams | null): boolean {
  const tags = parseCompanyCampaign(url.searchParams);
  return tags !== null && safeReferrer(referrer, url.origin) &&
    hasMetaCampaign(tags.size ? tags : cached && parseCompanyCampaign(cached));
}

export function safeRegistrationContext(address: string, referrer: string, cached: URLSearchParams | null = null): boolean {
  const url = productionPage(address);
  return Boolean(url && url.pathname === "/login/register" && safeCampaignPage(url, referrer, cached));
}

export const registrationPixelId = process.env.NEXT_PUBLIC_META_REGISTRATION_PIXEL_ID ?? "";
export const registrationPixelEnabled =
  process.env.NEXT_PUBLIC_META_REGISTRATION_PIXEL_ENABLED === "true" && /^\d{5,30}$/.test(registrationPixelId);

export function hasRegistrationPixel() {
  return Boolean(ownedPixel);
}

function eligibleBrowser(): boolean {
  return registrationPixelEnabled && typeof window !== "undefined" &&
    (window.navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl !== true;
}

function eligibleCampaignPage(matches: (pathname: string) => boolean): URL | undefined {
  if (!eligibleBrowser()) return;
  const url = productionPage(window.location.href);
  if (url && matches(url.pathname) && safeCampaignPage(url, document.referrer, readCompanyCampaign())) return url;
}

export function hasEligibleDealerCampaign(): boolean {
  // Called only after the API accepts the public dealer application. No SDK runs on the invitation.
  return Boolean(eligibleCampaignPage(isCompanyDealerInvitation));
}

function getPixel(): Pixel | undefined {
  const target = window as PixelWindow;
  if (ownedPixel) return target.fbq === ownedPixel && target._fbq === ownedPixel ? ownedPixel : undefined;
  if (target.fbq || target._fbq) return;

  const pixel: Pixel = (...args) => {
    if (pixel.callMethod) pixel.callMethod(...args);
    else pixel.queue?.push(args);
  };
  pixel.queue = [];
  pixel.push = pixel;
  pixel.loaded = true;
  pixel.version = "2.0";
  ownedPixel = target.fbq = target._fbq = pixel;
  pixel("set", "autoConfig", false, registrationPixelId);
  pixel("init", registrationPixelId);

  const script = document.createElement("script");
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  script.async = true;
  script.referrerPolicy = "no-referrer";
  scriptReady = new Promise<void>(resolve => {
    script.onload = () => resolve();
    script.onerror = () => resolve();
    try { document.head.appendChild(script); } catch { resolve(); }
  });
  return pixel;
}

function trackPageView(url: URL): Pixel | undefined {
  const pixel = getPixel();
  if (pixel && lastPageView !== url.pathname) {
    lastPageView = url.pathname;
    pixel("trackSingle", registrationPixelId, "PageView");
  }
  return pixel;
}

export function sendCompanyPageView() {
  const url = eligibleCampaignPage(pathname => companyLandingPages.has(pathname));
  if (url) trackPageView(url);
}

const registrationPath = (pathname: string) => pathname === "/login/register";

export function sendRegistrationPageView() {
  const url = eligibleCampaignPage(registrationPath);
  if (url) trackPageView(url);
}

async function allowScriptToLoad() {
  await new Promise<void>(resolve => {
    const timer = window.setTimeout(resolve, 1500);
    void scriptReady?.then(() => { window.clearTimeout(timer); resolve(); });
  });
}

export async function sendCompletedRegistration(): Promise<boolean> {
  const url = eligibleCampaignPage(registrationPath);
  const pixel = url && trackPageView(url);
  if (!pixel) return false;
  if (!clientCompleted) {
    clientCompleted = true;
    pixel("trackSingle", registrationPixelId, "CompleteRegistration");
  }
  await allowScriptToLoad();
  return true;
}

export async function sendDealerApplication(): Promise<boolean> {
  if (!eligibleBrowser()) return false;
  const url = productionPage(window.location.href);
  if (!url || url.pathname !== dealerSubmittedPath || url.search || !safeReferrer(document.referrer, url.origin)) return false;
  // Only the successful API submission creates this one-use receipt. Opening or reloading the URL is insufficient.
  if (!consumeDealerConversionHandoff()) return false;
  const pixel = getPixel();
  if (!pixel) return false;
  pixel("trackSingle", registrationPixelId, "SubmitApplication");
  await allowScriptToLoad();
  return true;
}
