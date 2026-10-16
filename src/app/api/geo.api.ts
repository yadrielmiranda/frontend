import { apiFetch } from "./_base";

export type ZipLookupResponse = { city: string; state: string } | null;

export function lookupZip(zip5: string): Promise<ZipLookupResponse> {
  return apiFetch<ZipLookupResponse>(`/api/geo/zip/${zip5}`).catch(() => null);
}

export type PlaceSuggestion = {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
};

export type PlaceAddress = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
};

export function autocompleteAddress(input: string, sessionToken: string) {
  return apiFetch<{ suggestions: PlaceSuggestion[] }>(
    "/api/geo/places/autocomplete",
    { method: "POST", body: { input, sessionToken }, timeoutMs: 10000 },
  );
}

export function getPlaceAddress(placeId: string, sessionToken: string) {
  return apiFetch<PlaceAddress>("/api/geo/places/details", {
    method: "POST",
    body: { placeId, sessionToken },
    timeoutMs: 10000,
  });
}
