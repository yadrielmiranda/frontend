import { apiFetch } from "./_base";
import type { EnergyCatalogOptions, EnergyRating, EnergyRatingInput } from "@/lib/energy-ratings";
import type { EstimateWithRelations } from "@/lib/types";

export function getEnergyRatings() {
  return apiFetch<EnergyRating[]>("/api/energy-ratings", { cache: "no-store" });
}

export function getEnergyCatalogOptions() {
  return apiFetch<EnergyCatalogOptions>("/api/energy-ratings/catalog-options", { cache: "no-store" });
}

export function createEnergyRating(data: EnergyRatingInput) {
  return apiFetch<EnergyRating>("/api/energy-ratings", { method: "POST", body: data });
}

export function updateEnergyRating(id: number, data: Partial<EnergyRatingInput>) {
  return apiFetch<EnergyRating>(`/api/energy-ratings/${id}`, { method: "PATCH", body: data });
}

export function refreshEstimateEnergyRatings(estimateId: number) {
  return apiFetch<EstimateWithRelations>(`/api/estimates/${estimateId}/energy-ratings/refresh`, { method: "POST" });
}
