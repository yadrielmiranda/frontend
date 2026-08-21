import { apiFetch } from "./_base";
import type { EstimatePayment, PaymentMethod, PaymentType } from "@/lib/types";

export type ManualPaymentResult = EstimatePayment & {
  installationJobId?: number | null;
  order?: { id: number } | null;
};

export type CheckoutSessionResponse = {
  url: string;
};

export type CancelCheckoutSessionResponse = {
  status: "canceled" | "paid";
  orderId: number | null;
};

export type PublicPaymentContext = {
  enabled: boolean;
  status: "not_applicable" | "complete" | "due";
  payment: null | {
    type: PaymentType;
    sequence: number;
    title: string;
    description: string;
    baseAmount: string;
    surchargePercent: string;
    surchargeAmount: string;
    totalAmount: string;
    checkoutStarted: boolean;
    requiresTerms: boolean;
    terms: string | null;
  };
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

export function getPublicPaymentContext(token: string) {
  return apiFetch<PublicPaymentContext>(
    `/api/payments/public/${encodeURIComponent(token)}/context`,
    { cache: "no-store", suppressAuthEvent: true },
  );
}

export function createPublicCheckoutSession(
  token: string,
  installationDepositTermsAccepted?: boolean,
) {
  return apiFetch<CheckoutSessionResponse>(
    `/api/payments/public/${encodeURIComponent(token)}/checkout-session`,
    {
      method: "POST",
      body: { installationDepositTermsAccepted },
      suppressAuthEvent: true,
    },
  );
}

export function cancelPublicCheckoutSession(
  token: string,
  type: PaymentType,
  sequence: number,
) {
  return apiFetch<{ status: "canceled" | "paid" }>(
    `/api/payments/public/${encodeURIComponent(token)}/checkout-session/cancel`,
    {
      method: "POST",
      body: { type, sequence },
      suppressAuthEvent: true,
    },
  );
}

export function recordManualPayment(data: {
  estimateId: number;
  type: PaymentType;
  sequence?: number;
  method: Exclude<PaymentMethod, "CARD">;
  fundsVerified: true;
  reference: string;
  note?: string;
  paidAt?: string;
  installationDepositTermsAccepted?: boolean;
}) {
  return apiFetch<ManualPaymentResult>("/api/payments/manual", {
    method: "POST",
    body: data,
  });
}
