import { apiFetch } from "./_base";
import type { PaymentPlan } from "@/lib/payment-plan";
export const getPaymentPlans = () =>
  apiFetch<PaymentPlan[]>("/api/payment-plans", { cache: "no-store" });
export const savePaymentPlan = (data: Omit<PaymentPlan, "id">, id?: number) =>
  apiFetch<PaymentPlan>(`/api/payment-plans${id ? `/${id}` : ""}`, {
    method: id ? "PATCH" : "POST",
    body: data,
  });
