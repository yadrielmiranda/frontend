import { apiFetch } from "./_base";

export type ZipLookupResponse = { city: string; state: string } | null;

export function lookupZip(zip5: string): Promise<ZipLookupResponse> {
  return apiFetch<ZipLookupResponse>(`/api/geo/zip/${zip5}`).catch(() => null);
}
