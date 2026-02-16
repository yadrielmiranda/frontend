import { apiFetch } from "./_base";

export type CheckoutSessionResponse = {
  url: string;
};

export function createCheckoutSession(estimateId: number) {
  return apiFetch<CheckoutSessionResponse>("/api/payments/checkout-session", {
    method: "POST",
    body: { estimateId },
  });
}
