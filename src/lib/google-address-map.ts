import type { AddressLocation } from "./types";

type Listener = { remove(): void };
type Position = AddressLocation | { lat(): number; lng(): number };
export type AddressMap = {
  addListener(event: "click" | "tilesloaded", callback: (event: { latLng?: Position }) => void): Listener;
  panTo(position: AddressLocation): void;
};
export type AddressMarker = {
  position?: Position | null;
  map: AddressMap | null;
  gmpDraggable: boolean;
  addListener(event: "dragend", callback: () => void): Listener;
};
type MapsLibrary = {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => AddressMap;
  marker: { AdvancedMarkerElement: new (options: Record<string, unknown>) => AddressMarker };
};
type MapsWindow = Window & { google?: { maps?: MapsLibrary }; __impactAddressMapReady?: () => void; gm_authFailure?: () => void };
let loading: Promise<MapsLibrary> | null = null;
let authError = "";
const authListeners = new Set<(message: string) => void>();
export function onAddressMapAuthFailure(listener: (message: string) => void): () => void {
  authListeners.add(listener);
  if (authError) listener(authError);
  return () => { authListeners.delete(listener); };
}

/** Called only when location confirmation is shown, never while typing an address. */
export function loadAddressMap(): Promise<MapsLibrary> {
  const browser = window as MapsWindow;
  if (authError) return Promise.reject(new Error(authError));
  if (browser.google?.maps?.marker?.AdvancedMarkerElement) return Promise.resolve(browser.google.maps);
  if (loading) return loading;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID) {
    return Promise.reject(new Error("The location map is not configured. Please contact support."));
  }
  loading = new Promise<MapsLibrary>((resolve, reject) => {
    browser.gm_authFailure = () => {
      authError = "The location map is unavailable. Please contact support, then reload this page to try again.";
      authListeners.forEach(listener => listener(authError));
      fail();
    };
    const script = document.createElement("script");
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      delete browser.__impactAddressMapReady;
      loading = null;
      reject(new Error("The location map could not load. Please try again or contact support."));
    };
    const timeout = setTimeout(fail, 20000);
    browser.__impactAddressMapReady = () => {
      clearTimeout(timeout);
      delete browser.__impactAddressMapReady;
      const maps = browser.google?.maps;
      if (!authError && maps?.marker?.AdvancedMarkerElement) resolve(maps);
      else fail();
    };
    const params = new URLSearchParams({ key, v: "weekly", libraries: "maps,marker",
      loading: "async", callback: "__impactAddressMapReady" });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = fail;
    const nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce;
    if (nonce) script.nonce = nonce;
    document.head.appendChild(script);
  });
  return loading;
}

export function mapPosition(position?: Position | null): AddressLocation | null {
  if (!position) return null;
  return { lat: typeof position.lat === "function" ? position.lat() : position.lat,
    lng: typeof position.lng === "function" ? position.lng() : position.lng };
}
export function locationDistanceMeters(a: AddressLocation, b: AddressLocation): number {
  const radians = Math.PI / 180;
  const lat = (b.lat - a.lat) * radians, lng = (b.lng - a.lng) * radians;
  const arc = Math.sin(lat / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(lng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(Math.max(0, 1 - arc)));
}
