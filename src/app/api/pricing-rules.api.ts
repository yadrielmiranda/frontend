import { apiFetch } from "./_base";
import type {
  Crystal,
  PricingRule,
  CreatePricingRuleData,
  UpdatePricingRuleData,
} from "../../lib/types";

export function getPricingRules() {
  return apiFetch<PricingRule[]>("/api/pricing-rules");
}

export function getPricingRule(id: number) {
  return apiFetch<PricingRule>(`/api/pricing-rules/${id}`);
}

export function getAvailablePricingRuleCrystals(
  idSystem: number,
  idConfig: number,
  excludeRuleId?: number,
) {
  const params = new URLSearchParams({
    idSystem: String(idSystem),
    idConfig: String(idConfig),
  });

  if (excludeRuleId) {
    params.set("excludeRuleId", String(excludeRuleId));
  }

  return apiFetch<Crystal[]>(
    `/api/pricing-rules/available-crystals?${params.toString()}`,
  );
}

export function createPricingRule(data: CreatePricingRuleData) {
  return apiFetch<PricingRule>("/api/pricing-rules", {
    method: "POST",
    body: data,
  });
}

export function updatePricingRule(
  id: number,
  data: UpdatePricingRuleData,
) {
  return apiFetch<PricingRule>(`/api/pricing-rules/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deletePricingRule(id: number) {
  return apiFetch<PricingRule>(`/api/pricing-rules/${id}`, {
    method: "DELETE",
  });
}