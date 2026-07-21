import type {
  CreatePricingRangeData,
  Crystal,
  PricingRange,
  PricingRangeFilters,
  UpdatePricingRangeData,
} from "@/lib/types";
import { apiFetch } from "./_base";

function buildPricingRangeQuery(filters?: PricingRangeFilters) {
  const params = new URLSearchParams();

  if (filters?.idSystem) {
    params.set("idSystem", String(filters.idSystem));
  }

  if (filters?.idConfig) {
    params.set("idConfig", String(filters.idConfig));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getPricingRanges(filters?: PricingRangeFilters) {
  return apiFetch<PricingRange[]>(
    `/api/pricing-ranges${buildPricingRangeQuery(filters)}`,
  );
}

export function getPricingRange(id: number) {
  return apiFetch<PricingRange>(`/api/pricing-ranges/${id}`);
}

export function createPricingRange(data: CreatePricingRangeData) {
  return apiFetch<PricingRange>("/api/pricing-ranges", {
    method: "POST",
    body: data,
  });
}

export function updatePricingRange(id: number, data: UpdatePricingRangeData) {
  return apiFetch<PricingRange>(`/api/pricing-ranges/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deletePricingRange(id: number) {
  return apiFetch<{ success: true }>(`/api/pricing-ranges/${id}`, {
    method: "DELETE",
  });
}

export function getAvailablePricingRangeCrystals(
  idSystem: number,
  idConfig: number,
) {
  const params = new URLSearchParams({
    idSystem: String(idSystem),
    idConfig: String(idConfig),
  });

  return apiFetch<Crystal[]>(
    `/api/pricing-rules/available-crystals?${params.toString()}`,
  );
}
