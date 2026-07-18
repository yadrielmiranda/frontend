import { apiFetch } from "./_base";

export type CheckoutSessionResponse = {
  url: string;
};

export type CancelCheckoutSessionResponse = {
  status: "canceled" | "paid";
  orderId: number | null;
};

export function createCheckoutSession(estimateId: number) {
  return apiFetch<CheckoutSessionResponse>(
    "/api/payments/checkout-session",
    {
      method: "POST",
      body: { estimateId },
    },
  );
}

export function cancelCheckoutSession(estimateId: number) {
  return apiFetch<CancelCheckoutSessionResponse>(
    "/api/payments/checkout-session/cancel",
    {
      method: "POST",
      body: { estimateId },
    },
  );
}