import { apiFetch } from "./_base";
import type {
    LinearPricingRule,
    CreateLinearPricingRuleData,
    UpdateLinearPricingRuleData,
} from "@/lib/types";

export function getLinearPricingRules(params?: {
    idBrand?: number;
    idProduct?: number;
    idSystem?: number;
    idConfig?: number;
    take?: number;
    skip?: number;
}) {
    const query = new URLSearchParams();

    if (params?.idBrand) query.append("brand", String(params.idBrand));
    if (params?.idProduct) query.append("product", String(params.idProduct));
    if (params?.idSystem) query.append("system", String(params.idSystem));
    if (params?.idConfig) query.append("config", String(params.idConfig));
    if (params?.take) query.append("take", String(params.take));
    if (params?.skip) query.append("skip", String(params.skip));

    const q = query.toString();

    return apiFetch<LinearPricingRule[]>(
        `/api/linear-pricing-rules${q ? `?${q}` : ""}`,
    );
}

export function getLinearPricingRule(id: number) {
    return apiFetch<LinearPricingRule>(`/api/linear-pricing-rules/${id}`);
}

export function createLinearPricingRule(data: CreateLinearPricingRuleData) {
    return apiFetch<LinearPricingRule>("/api/linear-pricing-rules", {
        method: "POST",
        body: data,
    });
}

export function updateLinearPricingRule(
    id: number,
    data: UpdateLinearPricingRuleData,
) {
    return apiFetch<LinearPricingRule>(`/api/linear-pricing-rules/${id}`, {
        method: "PATCH",
        body: data,
    });
}

export function deleteLinearPricingRule(id: number) {
    return apiFetch<LinearPricingRule>(`/api/linear-pricing-rules/${id}`, {
        method: "DELETE",
    });
}