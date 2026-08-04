import { apiFetch } from "./_base";
import type { PaymentType } from "@/lib/types";

export type CheckoutSessionResponse = {
  url: string;
};

export type CancelCheckoutSessionResponse = {
  status: "canceled" | "paid";
  orderId: number | null;
};

export function createCheckoutSession(
  estimateId: number,
  type: PaymentType = "MATERIAL",
  sequence?: number,
  installationDepositTermsAccepted?: boolean,
) {
  return apiFetch<CheckoutSessionResponse>("/api/payments/checkout-session", {
      method: "POST",
    body: {
      estimateId,
      type,
      sequence,
      installationDepositTermsAccepted,
    },
  });
}

export function cancelCheckoutSession(
  estimateId: number,
  type: PaymentType = "MATERIAL",
  sequence?: number,
) {
  return apiFetch<CancelCheckoutSessionResponse>(
    "/api/payments/checkout-session/cancel",
    {
      method: "POST",
      body: { estimateId, type, sequence },
    },
  );
}
