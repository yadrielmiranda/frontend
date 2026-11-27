const host = "authenticevolutionco.com";
const tag = /^[A-Za-z0-9_-]{1,100}$/;
const keys = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid"]);
const metaSources = new Set(["facebook", "instagram", "meta", "fb", "ig"]);
const allowedReferrers = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "l.facebook.com", "lm.facebook.com", "instagram.com", "www.instagram.com", "l.instagram.com"]);
type Pixel = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[][]; push?: Pixel; loaded?: boolean; version?: string };
type PixelWindow = Window & { fbq?: Pixel; _fbq?: Pixel };
let ownedPixel: Pixel | undefined;
let scriptReady: Promise<void> | undefined;
let completed = false;

export function safeRegistrationContext(address: string, referrer: string) {
  try {
    const url = new URL(address);
    if (url.origin !== "https://" + host || url.pathname !== "/login/register" || url.hash) return false;
    for (const [key, value] of url.searchParams) {
      if (url.searchParams.getAll(key).length !== 1) return false;
      if (key === "lang" && (value === "en" || value === "es")) continue;
      if (!keys.has(key) ||
          !(key === "fbclid" ? /^[A-Za-z0-9_-]{1,300}$/.test(value) : tag.test(value))) return false;
    }
    const source = url.searchParams.get("utm_source")?.toLowerCase();
    if (!url.searchParams.has("utm_campaign") || (!url.searchParams.has("fbclid") && (!source || !metaSources.has(source)))) return false;
    if (!referrer) return true;
    const ref = new URL(referrer);
    return ref.protocol === "https:" && allowedReferrers.has(ref.hostname) &&
      !ref.username && !ref.password && !ref.port && ref.pathname === "/" && !ref.search && !ref.hash;
  } catch { return false; }
}

export const registrationPixelId = process.env.NEXT_PUBLIC_META_REGISTRATION_PIXEL_ID ?? "";
export const registrationPixelEnabled =
  process.env.NEXT_PUBLIC_META_REGISTRATION_PIXEL_ENABLED === "true" && /^\d{5,30}$/.test(registrationPixelId);

export function hasRegistrationPixel() {
  return Boolean(ownedPixel);
}

type RegistrationEvent = "PageView" | "CompleteRegistration";

function canMeasureRegistration() {
  return registrationPixelEnabled &&
    (window.navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl !== true &&
    safeRegistrationContext(location.href, document.referrer);
}

function registrationPixel(event: RegistrationEvent): Pixel | undefined {
  if (!canMeasureRegistration()) return;
  const target = window as PixelWindow;
  if (ownedPixel) return target.fbq === ownedPixel && target._fbq === ownedPixel ? ownedPixel : undefined;
  if (target.fbq || target._fbq) return; // Do not mix with any other installation.
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
  pixel("trackSingle", registrationPixelId, "PageView");
  if (event === "CompleteRegistration") {
    completed = true;
    pixel("trackSingle", registrationPixelId, event);
  }
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

export function sendRegistrationPageView() {
  // The initialization itself sends one view per document, even if React remounts.
  registrationPixel("PageView");
}

export async function sendCompletedRegistration(): Promise<boolean> {
  const pixel = registrationPixel("CompleteRegistration");
  if (!pixel) return false;
  if (!completed) {
    completed = true;
    pixel("trackSingle", registrationPixelId, "CompleteRegistration");
  }
  // Give a slow load a bounded chance to flush before navigating away after signup.
  await new Promise<void>(resolve => {
    const timer = window.setTimeout(resolve, 1500);
    void scriptReady?.then(() => { window.clearTimeout(timer); resolve(); });
  });
  return true;
}
