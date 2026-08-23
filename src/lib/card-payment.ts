import type { EstimatePayment } from "@/lib/types";
import { roundMoney } from "@/lib/formatters";

export type CardPaymentBreakdown = {
  baseAmount: number;
  surchargePercent: number;
  surchargeAmount: number;
  totalAmount: number;
};

const safeMoney = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
};

const hasLockedCardSnapshot = (payment?: EstimatePayment | null) =>
  payment?.paymentMethod === "CARD" &&
  (payment.status === "PAID" ||
    (payment.status === "PENDING" && Boolean(payment.stripeSessionId)));

/**
 * Mirrors the backend card-fee formula for display before checkout. Once a
 * checkout exists, its saved payment amounts take precedence over the current
 * global setting so the screen always matches the active Stripe session.
 */
export function getCardPaymentBreakdown({
  baseAmount,
  surchargeFraction,
  payment,
}: {
  baseAmount: number;
  surchargeFraction: number;
  payment?: EstimatePayment | null;
}): CardPaymentBreakdown {
  if (hasLockedCardSnapshot(payment)) {
    return {
      baseAmount: safeMoney(payment?.baseAmount),
      surchargePercent: Number(payment?.surchargePercent ?? 0),
      surchargeAmount: safeMoney(payment?.surchargeAmount),
      totalAmount: safeMoney(payment?.amount),
    };
  }

  const normalizedBase = safeMoney(baseAmount);
  const normalizedFraction =
    Number.isFinite(surchargeFraction) &&
    surchargeFraction >= 0 &&
    surchargeFraction <= 1
      ? surchargeFraction
      : 0;
  const surchargeAmount = roundMoney(normalizedBase * normalizedFraction);

  return {
    baseAmount: normalizedBase,
    surchargePercent: normalizedFraction * 100,
    surchargeAmount,
    totalAmount: roundMoney(normalizedBase + surchargeAmount),
  };
}

export function formatCardFeePercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);
}
