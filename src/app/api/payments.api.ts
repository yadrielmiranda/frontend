import { apiFetch } from "./_base";
import type { EstimatePayment, PaymentMethod, PaymentType } from "@/lib/types";

export type ManualPaymentResult = EstimatePayment & {
  installationJobId?: number | null;
  order?: { id: number } | null;
};

export type FullBalanceRequest = { payFullBalance: true; expectedBalance: number };

export type CheckoutSessionResponse = {
  url: string;
};

export type CancelCheckoutSessionResponse = {
  status: "canceled" | "paid";
  orderId: number | null;
};

export type PublicPaymentContext = {
  agreement?: {
    required: boolean;
    satisfied: boolean;
    signingUrl: string | null;
  };
  installmentCheckouts?: Array<{
    sequences: number[];
    baseAmount: string;
    surchargePercent: string;
    surchargeAmount: string;
    totalAmount: string;
  }>;
  schedule?: import("@/lib/payment-plan").PaymentSchedule | null;
  promotionExpiresAt?: string | null;
  expiresAt?: string | null;
  promotionLockedAt?: string | null;
  enabled: boolean;
  status: "not_applicable" | "complete" | "due" | "available" | "expired" | "review";
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
    requiresCityFeeAcceptance?: boolean;
    cityFeeAmount?: string;
    terms: string | null;
  };
};

export function createCheckoutSession(
  estimateId: number,
  type: PaymentType = "MATERIAL",
  sequence?: number,
  installationDepositTermsAccepted?: boolean,
  materialAccepted?: boolean,
  cityFeeAccepted?: boolean,
  sequences?: number[],
  fullBalance?: FullBalanceRequest,
) {
  return apiFetch<CheckoutSessionResponse>("/api/payments/checkout-session", {
    method: "POST",
    body: {
      estimateId,
      type,
      sequence,
      installationDepositTermsAccepted,
      materialAccepted,
      cityFeeAccepted,
      sequences,
      ...fullBalance,
    },
  });
}

export function cancelCheckoutSession(
  estimateId: number,
  type: PaymentType = "MATERIAL",
  sequence?: number,
  checkoutRef?: string,
) {
  return apiFetch<CancelCheckoutSessionResponse>(
    "/api/payments/checkout-session/cancel",
    {
      method: "POST",
      body: { estimateId, type, sequence, checkoutRef },
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
  agreementId?: string,
  cityFeeAccepted?: boolean,
  sequences?: number[],
  fullBalance?: FullBalanceRequest,
) {
  return apiFetch<CheckoutSessionResponse>(
    `/api/payments/public/${encodeURIComponent(token)}/checkout-session`,
    {
      method: "POST",
      body: { installationDepositTermsAccepted, agreementId, cityFeeAccepted, sequences, ...fullBalance },
      suppressAuthEvent: true,
    },
  );
}

export function cancelPublicCheckoutSession(
  token: string,
  type: PaymentType,
  sequence: number,
  checkoutRef?: string,
) {
  return apiFetch<{ status: "canceled" | "paid" }>(
    `/api/payments/public/${encodeURIComponent(token)}/checkout-session/cancel`,
    {
      method: "POST",
      body: { type, sequence, checkoutRef },
      suppressAuthEvent: true,
    },
  );
}

export function recordManualPayment(data: {
  estimateId: number;
  type: PaymentType;
  sequence?: number;
  sequences?: number[];
  payFullBalance?: boolean;
  expectedBalance?: number;
  method: Exclude<PaymentMethod, "CARD" | "BANK">;
  fundsVerified: true;
  reference: string;
  note?: string;
  paidAt?: string;
  installationDepositTermsAccepted?: boolean;
  cityFeeAccepted?: boolean;
}) {
  return apiFetch<ManualPaymentResult>("/api/payments/manual", {
    method: "POST",
    body: data,
  });
}

export function approveEstimateOrder(estimateId: number) {
  return apiFetch<{ id: number; number: string }>(`/api/payments/estimates/${estimateId}/approve-order`, { method: "POST" });
}

export type PaymentHistoryData = {
  canReview: boolean;
  reviewPending: boolean;
  receipts: Array<{ id: number; title: string; amount: string; principal: string; fee: string; method: string; paidAt: string; refunded: string }>;
  refunds: Array<{ id: string; amount: string; status: string; createdAt: string; reviewedAt: string | null; note?: string | null;
    allocations: Array<{ id: number; title: string; amount: string; principal: string; creditAmount: string }> }>;
};
export function getPaymentHistory(estimateId: number) {
  return apiFetch<PaymentHistoryData>(`/api/payments/estimates/${estimateId}/history`, { cache: "no-store" });
}
export function synchronizeStripePayments(estimateId: number) {
  return apiFetch<PaymentHistoryData>(`/api/payments/estimates/${estimateId}/sync-stripe`, { method: "POST" });
}
export function reviewPaymentRefund(estimateId: number, refundId: string, data: { note: string; allocations: Array<{ id: number; creditAmount: number }> }) {
  return apiFetch<{ reviewed: boolean }>(`/api/payments/estimates/${estimateId}/refunds/${encodeURIComponent(refundId)}/review`, { method: "POST", body: data });
}
