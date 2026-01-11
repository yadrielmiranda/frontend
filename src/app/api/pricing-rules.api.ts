import { apiFetch } from "./_base";
import type {
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

export function createPricingRule(data: CreatePricingRuleData) {
  return apiFetch<PricingRule>("/api/pricing-rules", {
    method: "POST",
    body: data,
  });
}

export function updatePricingRule(id: number, data: UpdatePricingRuleData) {
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
