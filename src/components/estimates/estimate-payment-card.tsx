"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { createCheckoutSession } from "@/app/api/payments.api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMoney, roundMoney } from "@/lib/formatters";
import { paidInstallationCredit } from "@/lib/installation-flow";
import type {
  DealerMode,
  EstimatePayment,
  InstallationJob,
  Order,
  PaymentType,
} from "@/lib/types";
import { ManualPaymentDialog } from "@/components/payments/manual-payment-dialog";
import { EstimatePaymentLinkActions } from "@/components/estimates/estimate-payment-link-actions";
import { CardFeeBreakdown } from "@/components/payments/card-fee-breakdown";
import { getCardPaymentBreakdown } from "@/lib/card-payment";

type CheckoutPaymentType = Extract<
  PaymentType,
  "INSTALLATION_DEPOSIT" | "PERMIT" | "MATERIAL" | "INSTALLATION"
>;

type PaymentAction = {
  type: CheckoutPaymentType;
  title: string;
  description: string;
  amount: number;
};

const DEFAULT_DEPOSIT_NOTICE =
  "Once paid, this deposit is non-refundable. If installation proceeds, the full deposit is credited toward the installation balance.";

export function resolveEstimatePaymentAction({
  estimateStatus,
  order,
  materialPayments,
  installationJob,
  materialAmount,
}: {
  estimateStatus: string;
  order: Order | null;
  materialPayments: EstimatePayment[];
  installationJob: InstallationJob | null;
  materialAmount: number;
}): PaymentAction | null {
  const activeJob =
    installationJob && installationJob.status !== "CANCELED"
      ? installationJob
      : null;

  if (!activeJob) {
    const materialPaid = materialPayments.some(
      (payment) => payment.type === "MATERIAL" && payment.status === "PAID",
    );

    if (
      estimateStatus !== "Active" ||
      order ||
      materialPaid ||
      materialAmount <= 0
    ) {
      return null;
    }

    return {
      type: "MATERIAL",
      title: "Ready to place your order",
      description:
        "Pay the material total. Your order will be created automatically after payment is confirmed.",
      amount: materialAmount,
    };
  }

  if (!order && activeJob.status === "DEPOSIT_PAYMENT_PENDING") {
    return {
      type: "INSTALLATION_DEPOSIT",
      title: "Installation deposit",
      description:
        "This is the next required payment before remeasurement can be scheduled.",
      amount: Number(activeJob.depositAmountSnapshot),
    };
  }

  if (
    !order &&
    activeJob.status === "PERMIT_PAYMENT_PENDING" &&
    activeJob.permit
  ) {
    return {
      type: "PERMIT",
      title: "Permit Fee",
      description:
        "The installation quote is approved. The Permit Fee is the next required payment.",
      amount: Number(activeJob.permit.permitFeeSnapshot),
    };
  }

  if (!order && activeJob.status === "MATERIAL_PAYMENT_PENDING") {
    const cityFee = Number(activeJob.permit?.cityFee ?? 0);

    return {
      type: "MATERIAL",
      title: activeJob.permit ? "Materials + City Fee" : "Material payment",
      description:
        "This payment creates the order. Installation will continue through its remaining stages.",
      amount: roundMoney(materialAmount + cityFee),
    };
  }

  if (order && activeJob.status === "INSTALLATION_PAYMENT_PENDING") {
    const quote =
      activeJob.quotes.find((candidate) => candidate.status === "APPROVED") ??
      activeJob.quotes[0];
    const balance = roundMoney(
      Math.max(
        0,
        Number(quote?.total ?? 0) - paidInstallationCredit(activeJob),
      ),
    );

    if (balance <= 0) return null;

    return {
      type: "INSTALLATION",
      title: "Installation balance",
      description:
        "The remaining installation balance is now available for payment.",
      amount: balance,
    };
  }

  return null;
}

export function EstimatePaymentCard({
  estimateId,
  estimateOwnerId,
  estimateStatus,
  order,
  materialPayments,
  installationJob,
  currentUserId,
  materialAmount,
  dealerMode,
  cardSurchargeFraction = 0,
  canRecordManualPayment = false,
  paymentBlockedReason,
  className = "",
}: {
  estimateId: number;
  estimateOwnerId: number;
  estimateStatus: string;
  order: Order | null;
  materialPayments: EstimatePayment[];
  installationJob: InstallationJob | null;
  currentUserId: number;
  materialAmount: number;
  dealerMode?: DealerMode | null;
  cardSurchargeFraction?: number;
  canRecordManualPayment?: boolean;
  paymentBlockedReason?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [depositTermsAccepted, setDepositTermsAccepted] = useState(false);

  const isOwner = currentUserId === estimateOwnerId;
  const isInternalDealer = dealerMode === "INTERNAL";

  if (!isOwner && !canRecordManualPayment) return null;

  const action = resolveEstimatePaymentAction({
    estimateStatus,
    order,
    materialPayments,
    installationJob,
    materialAmount,
  });

  if (!action || !Number.isFinite(action.amount) || action.amount <= 0) {
    return null;
  }

  const depositTermsPreviouslyAccepted = Boolean(
    installationJob?.depositTermsAcceptedAt,
  );
  const depositTermsSatisfied =
    depositTermsPreviouslyAccepted || depositTermsAccepted;
  const requiresDepositTerms = action.type === "INSTALLATION_DEPOSIT";
  const paymentPool =
    installationJob && installationJob.status !== "CANCELED"
      ? installationJob.payments
      : materialPayments;
  const checkoutStarted = paymentPool.some(
    (payment) =>
      payment.type === action.type &&
      payment.status === "PENDING" &&
      Boolean(payment.stripeSessionId),
  );
  const activeCheckoutPayment = paymentPool.find(
    (payment) =>
      payment.type === action.type &&
      payment.status === "PENDING" &&
      Boolean(payment.stripeSessionId),
  );
  const showCardCheckoutAmounts = isOwner && !isInternalDealer;
  const cardBreakdown = getCardPaymentBreakdown({
    baseAmount: action.amount,
    surchargeFraction: cardSurchargeFraction,
    payment: activeCheckoutPayment,
  });

  const handlePayment = async () => {
    if (paymentBlockedReason) {
      toast.error(paymentBlockedReason);
      return;
    }

    if (requiresDepositTerms && !depositTermsSatisfied) {
      toast.error("Accept the non-refundable deposit terms first.");
      return;
    }

    setBusy(true);
    try {
      const { url } = await createCheckoutSession(
        estimateId,
        action.type,
        undefined,
        requiresDepositTerms ? depositTermsSatisfied : undefined,
      );
      window.location.href = url;
    } catch (error) {
      toast.error((error as Error).message);
      setBusy(false);
    }
  };

  return (
    <section
      className={`print:hidden rounded-xl border border-slate-300 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Next payment
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-slate-950">
              {action.title}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              {action.description}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-left sm:min-w-80 sm:text-right">
          <p className="text-xs font-medium text-slate-500">
            {showCardCheckoutAmounts ? "Card charge total" : "Due now"}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-slate-950">
            {formatMoney(
              showCardCheckoutAmounts
                ? cardBreakdown.totalAmount
                : action.amount,
            )}
          </p>
          {showCardCheckoutAmounts && (
            <CardFeeBreakdown
              breakdown={cardBreakdown}
              className="mt-2 text-left"
            />
          )}
        </div>
      </div>

      {requiresDepositTerms && isOwner && !isInternalDealer && (
        <label
          htmlFor="installation-deposit-terms"
          className={`mt-4 flex items-start gap-3 rounded-lg border-2 p-4 text-sm transition-colors ${
            depositTermsSatisfied
              ? "border-emerald-400 bg-emerald-50 text-emerald-950"
              : "border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100/70"
          } ${depositTermsPreviouslyAccepted ? "cursor-default" : "cursor-pointer"}`}
        >
          <Checkbox
            id="installation-deposit-terms"
            className="mt-0.5"
            checked={depositTermsSatisfied}
            disabled={depositTermsPreviouslyAccepted}
            aria-describedby="installation-deposit-terms-description"
            aria-required={!depositTermsPreviouslyAccepted}
            onCheckedChange={(checked) =>
              setDepositTermsAccepted(Boolean(checked))
            }
          />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <strong className="font-semibold">
                I understand and accept the non-refundable deposit terms
              </strong>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                  depositTermsSatisfied
                    ? "bg-emerald-200 text-emerald-900"
                    : "bg-amber-200 text-amber-950"
                }`}
              >
                {depositTermsSatisfied ? "Accepted" : "Required"}
              </span>
            </span>
            <span
              id="installation-deposit-terms-description"
              className="mt-1 block text-xs leading-relaxed"
            >
              {installationJob?.depositTermsSnapshot || DEFAULT_DEPOSIT_NOTICE}
            </span>
          </span>
        </label>
      )}

      {paymentBlockedReason && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
        >
          {paymentBlockedReason}
        </p>
      )}

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {isOwner && !isInternalDealer ? (
          <>
            <span className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure checkout
            </span>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={
                busy ||
                Boolean(paymentBlockedReason) ||
                (requiresDepositTerms && !depositTermsSatisfied)
              }
              onClick={() => void handlePayment()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {busy
                ? "Opening checkout..."
                : requiresDepositTerms && !depositTermsSatisfied
                  ? "Accept terms to continue"
                  : checkoutStarted
                    ? "Resume payment"
                    : "Continue to payment"}
            </Button>
          </>
        ) : isOwner && isInternalDealer ? (
          <div className="space-y-2 text-right">
            <p className="text-sm text-slate-600">
              Send this payment link to the final customer.
            </p>
            <EstimatePaymentLinkActions estimateId={estimateId} showShare />
          </div>
        ) : null}

        {canRecordManualPayment && (
          <ManualPaymentDialog
            estimateId={estimateId}
            type={action.type}
            amount={action.amount}
            requiresDepositTerms={
              requiresDepositTerms && !depositTermsPreviouslyAccepted
            }
            depositTerms={installationJob?.depositTermsSnapshot}
            label="Record verified payment"
            onRecorded={(payment) => {
              if (payment.order?.id) {
                router.replace(`/orders/${payment.order.id}`);
                return;
              }
              if (payment.installationJobId) {
                router.replace(`/installations/${payment.installationJobId}`);
                return;
              }
              router.replace("/estimates");
            }}
          />
        )}
      </div>
    </section>
  );
}
