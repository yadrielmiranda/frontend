const host = "authenticevolutionco.com";
const tag = /^[A-Za-z0-9_-]{1,100}$/;
const keys = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid"]);
const metaSources = new Set(["facebook", "instagram", "meta", "fb", "ig"]);
const allowedReferrers = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "l.facebook.com", "lm.facebook.com", "instagram.com", "www.instagram.com", "l.instagram.com"]);
type Pixel = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[][]; push?: Pixel; loaded?: boolean; version?: string };
type PixelWindow = Window & { fbq?: Pixel; _fbq?: Pixel };
let dispatched = false;

export function safeRegistrationContext(address: string, referrer: string) {
  try {
    const url = new URL(address);
    if (url.origin !== "https://" + host || url.pathname !== "/login/register" || url.hash) return false;
    for (const [key, value] of url.searchParams) {
      if (!keys.has(key) || url.searchParams.getAll(key).length !== 1 ||
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

export function dispatchRegistrationToPixel(pixel: Pixel, id: string) {
  if (!/^\d{5,30}$/.test(id)) return;
  pixel("set", "autoConfig", false, id);
  pixel("init", id);
  pixel("trackSingle", id, "CompleteRegistration");
}

export const registrationPixelId = process.env.NEXT_PUBLIC_META_REGISTRATION_PIXEL_ID ?? "";
export const registrationPixelEnabled =
  process.env.NEXT_PUBLIC_META_REGISTRATION_PIXEL_ENABLED === "true" && /^\d{5,30}$/.test(registrationPixelId);

// Only called from the confirmed registration success branch. Never load a global tag.
export async function sendCompletedRegistration(): Promise<boolean> {
  if (!registrationPixelEnabled || dispatched ||
      !safeRegistrationContext(location.href, document.referrer)) return false;
  if ((window.navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) return false;
  const target = window as PixelWindow;
  if (target.fbq || target._fbq) return false; // Do not mix this narrowly scoped tag with another installation.
  dispatched = true;
  const pixel: Pixel = (...args) => {
    if (pixel.callMethod) pixel.callMethod(...args);
    else pixel.queue?.push(args);
  };
  pixel.queue = [];
  pixel.push = pixel;
  pixel.loaded = true;
  pixel.version = "2.0";
  target.fbq = target._fbq = pixel;
  dispatchRegistrationToPixel(pixel, registrationPixelId);
  const script = document.createElement("script");
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  script.async = true;
  script.referrerPolicy = "no-referrer";
  return new Promise(resolve => {
    const done = () => { clearTimeout(timer); resolve(true); };
    const timer = window.setTimeout(() => { script.remove(); done(); }, 1500);
    script.onload = done;
    script.onerror = done;
    document.head.appendChild(script);
  });
}
