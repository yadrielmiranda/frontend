"use client";

import { FullBalancePrompt, FullBalanceReview, FullBalanceToggle, InstallmentSelection, selectedInstallmentCheckout, useInstallmentSelection } from "@/components/payments/installment-selection";
import { PaymentScheduleView } from "@/components/payments/payment-schedule";
import type { PaymentSchedule } from "@/lib/payment-plan";
import type { EstimateDiscountSummary } from "@/lib/estimate-discount";
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
  "INSTALLMENT" | "INSTALLATION_DEPOSIT" | "PERMIT" | "MATERIAL" | "INSTALLATION"
>;

type PaymentAction = {
  type: CheckoutPaymentType;
  sequence?: number;
  title: string;
  description: string;
  amount: number;
  requiresCityFeeAcceptance?: boolean;
  cityFeeAmount?: number;
};

const DEFAULT_DEPOSIT_NOTICE =
  "Once paid, this deposit is non-refundable. If installation proceeds, the full deposit is credited toward the installation balance.";

export function resolveEstimatePaymentAction({
  estimateStatus,
  order,
  materialPayments,
  installationJob,
  materialAmount,
  allowNoCharge = false,
  manualDiscount,
  paymentSchedule,
}: {
  estimateStatus: string;
  order: Order | null;
  materialPayments: EstimatePayment[];
  installationJob: InstallationJob | null;
  materialAmount: number;
  allowNoCharge?: boolean;
  manualDiscount?: EstimateDiscountSummary | null;
  paymentSchedule?: PaymentSchedule | null;
}): PaymentAction | null {
  manualDiscount = manualDiscount ?? installationJob?.manualDiscountSummary;
  materialAmount = Number(manualDiscount?.material.total ?? materialAmount);
  const activeJob =
    installationJob && installationJob.status !== "CANCELED"
      ? installationJob
      : null;

  if (paymentSchedule && activeJob?.status !== 'DEPOSIT_PAYMENT_PENDING') {
    const next = paymentSchedule.next;
    return next ? { type: 'INSTALLMENT', sequence: next.sequence, title: next.title, description: next.description, amount: Number(next.balance), requiresCityFeeAcceptance: next.kind === 'CITY_FEE', cityFeeAmount: Number(next.amount) } : null;
  }

  if (!activeJob) {
    const materialPaid = materialPayments.some(
      (payment) => payment.type === "MATERIAL" && payment.status === "PAID",
    );

    if (
      estimateStatus !== "Active" ||
      order ||
      materialPaid ||
      (materialAmount <= 0 && !(materialAmount === 0 && allowNoCharge))
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
      amount: manualDiscount ? Math.min(Number(activeJob.depositAmountSnapshot), Number(manualDiscount.installation.total)) : Number(activeJob.depositAmountSnapshot),
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
      amount: Number(manualDiscount?.permit.total ?? activeJob.permit.permitFeeSnapshot),
    };
  }

  if (!order && activeJob.status === "MATERIAL_PAYMENT_PENDING") {
    const cityFee = Number(manualDiscount?.city.total ?? activeJob.permit?.cityFee ?? 0);

    return {
      type: "MATERIAL",
      title: activeJob.permit ? "Materials + City Fee" : "Material payment",
      description:
        "Payment submits this estimate for administrative order review.",
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
        Number(manualDiscount?.installation.total ?? quote?.total ?? 0) - paidInstallationCredit(activeJob),
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
  ownerRole,
  estimateStatus,
  order,
  materialPayments,
  installationJob,
  currentUserId,
  materialAmount,
  allowNoCharge = false,
  manualDiscount,
  paymentSchedule,
  dealerMode,
  cardSurchargeFraction = 0,
  canRecordManualPayment = false,
  paymentBlockedReason,
  beforePayment,
  className = "",
}: {
  estimateId: number;
  estimateOwnerId: number;
  ownerRole: string;
  estimateStatus: string;
  order: Order | null;
  materialPayments: EstimatePayment[];
  installationJob: InstallationJob | null;
  currentUserId: number;
  materialAmount: number;
  allowNoCharge?: boolean;
  manualDiscount?: EstimateDiscountSummary | null;
  paymentSchedule?: PaymentSchedule | null;
  dealerMode?: DealerMode | null;
  cardSurchargeFraction?: number;
  canRecordManualPayment?: boolean;
  paymentBlockedReason?: string;
  beforePayment?: () => Promise<boolean>;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [depositTermsAccepted, setDepositTermsAccepted] = useState(false);
  const [materialAccepted, setMaterialAccepted] = useState(false);
  const [acceptedCityKey, setAcceptedCityKey] = useState("");
  const installments = useInstallmentSelection(paymentSchedule, installationJob?.status !== "DEPOSIT_PAYMENT_PENDING");

  const isOwner = currentUserId === estimateOwnerId;
  const isInternalDealer = dealerMode === "INTERNAL";

  if (!isOwner && !canRecordManualPayment) return <PaymentScheduleView schedule={paymentSchedule} />;

  const defaultAction = resolveEstimatePaymentAction({
    estimateStatus,
    order,
    materialPayments,
    installationJob,
    materialAmount,
    allowNoCharge,
    manualDiscount,
  paymentSchedule,
  });

  const selectingInstallments = defaultAction?.type === "INSTALLMENT" || installments.isFullBalance;
  const action = selectingInstallments ? {
    ...defaultAction,
    type: "INSTALLMENT" as const,
    sequence: installments.selected[0]?.sequence,
    amount: installments.amount,
    title: installments.isFullBalance ? "Full project balance" : installments.rows.length > 1 ? "Selected payments" : defaultAction!.title,
    description: installments.isFullBalance ? "Pay all remaining project installments, including payments not yet due." : installments.rows.length > 1 ? "Choose the items you want to pay now. The total updates with your selection." : defaultAction!.description,
    requiresCityFeeAcceptance: Boolean(installments.cityFeeKey),
    cityFeeAmount: installments.cityFeeAmount,
  } : defaultAction;
  const cityKey = selectingInstallments ? installments.cityFeeKey : "";
  const cityFeeAccepted = Boolean(cityKey) && acceptedCityKey === cityKey;
  const hasSelection = !selectingInstallments || installments.sequences.length > 0;

  if (!action && installments.canPayFullBalance && paymentSchedule) {
    return <div className="space-y-5"><PaymentScheduleView schedule={paymentSchedule} /><FullBalancePrompt schedule={paymentSchedule} onSelect={() => installments.setFullBalance(true)} /></div>;
  }

  if (!action || !Number.isFinite(action.amount) || (action.amount <= 0 && !(action.amount === 0 && (paymentSchedule || allowNoCharge || Number(manualDiscount?.discount ?? installationJob?.manualDiscountSummary?.discount) > 0)))) {
    return <PaymentScheduleView schedule={paymentSchedule} />;
  }

  const depositTermsPreviouslyAccepted = Boolean(
    installationJob?.depositTermsAcceptedAt,
  );
  const depositTermsSatisfied =
    depositTermsPreviouslyAccepted || depositTermsAccepted;
  const requiresDepositTerms = action.type === "INSTALLATION_DEPOSIT";
  const requiresMaterialAcceptance = ownerRole === "client" && (action.type === "MATERIAL" || (action.type === "INSTALLMENT" && installments.sequences.includes(paymentSchedule?.initialSequence ?? -1)));
  const paymentPool =
    installationJob && installationJob.status !== "CANCELED"
      ? installationJob.payments
      : materialPayments;
  const activeCheckoutPayment = selectingInstallments
    ? selectedInstallmentCheckout(paymentPool, installments.sequences, installments.amount)
    : paymentPool.find(payment => payment.type === action.type &&
        (action.sequence == null || payment.sequence === action.sequence) && payment.status === "PENDING" && payment.stripeSessionId);
  const checkoutStarted = Boolean(activeCheckoutPayment);
  const showCardCheckoutAmounts = isOwner && !isInternalDealer;
  const cardBreakdown = getCardPaymentBreakdown({
    baseAmount: action.amount,
    surchargeFraction: cardSurchargeFraction,
    payment: activeCheckoutPayment,
  });

  const handlePayment = async () => {
    if (busy || !hasSelection) return;
    if (paymentBlockedReason) {
      toast.error(paymentBlockedReason);
      return;
    }

    if (requiresDepositTerms && !depositTermsSatisfied) {
      toast.error("Accept the non-refundable deposit terms first.");
      return;
    }
    if (requiresMaterialAcceptance && !materialAccepted) {
      toast.error("Accept the material details first.");
      return;
    }

    if (action.requiresCityFeeAcceptance && !cityFeeAccepted) { toast.error("Review and accept the City Fee adjustment first."); return; }
    setBusy(true);
    try {
      if ((requiresDepositTerms || installationJob?.dealerMeasurementsAcceptedAt) && beforePayment && !(await beforePayment())) {
        setBusy(false);
        return;
      }
      const { url } = await createCheckoutSession(
        estimateId,
        action.type,
        selectingInstallments ? undefined : action.sequence,
        requiresDepositTerms ? depositTermsSatisfied : undefined,
        requiresMaterialAcceptance ? materialAccepted : undefined,
        action.requiresCityFeeAcceptance ? cityFeeAccepted : undefined,
        selectingInstallments && !installments.isFullBalance ? installments.sequences : undefined,
        installments.isFullBalance ? { payFullBalance: true, expectedBalance: installments.amount } : undefined,
      );
      window.location.href = url;
    } catch (error) {
      toast.error((error as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
    <PaymentScheduleView schedule={paymentSchedule} />
    <section
      id="estimate-payment"
      className={`scroll-mt-28 print:hidden rounded-xl border border-slate-300 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {installments.isFullBalance ? "Advance payment" : installments.rows.length > 1 ? "Payments due" : "Next payment"}
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
            {showCardCheckoutAmounts ? "Card charge total" : installments.isFullBalance ? "Payment amount" : "Due now"}
          </p>
          <p aria-live="polite" className="text-2xl font-semibold tracking-tight text-slate-950">
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

      {installments.isFullBalance ? <FullBalanceReview rows={installments.rows} cityFeePending={paymentSchedule?.cityFeePending} /> : selectingInstallments && <InstallmentSelection rows={installments.rows} sequences={installments.sequences}
        onChange={values => { installments.setSequences(values); setAcceptedCityKey(""); }} disabled={busy} />}

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

      {requiresMaterialAcceptance && isOwner && (
        <label
          htmlFor="material-acceptance"
          className={`mt-4 flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 text-sm transition-colors ${
            materialAccepted
              ? "border-emerald-400 bg-emerald-50 text-emerald-950"
              : "border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100/70"
          }`}
        >
          <Checkbox
            id="material-acceptance"
            className="mt-0.5"
            checked={materialAccepted}
            disabled={busy}
            aria-required="true"
            onCheckedChange={(checked) => setMaterialAccepted(checked === true)}
          />
          <span className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2">
            <strong className="max-w-4xl font-semibold">
              I have reviewed and accept the products, dimensions, configurations and prices in this estimate.
            </strong>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                materialAccepted
                  ? "bg-emerald-200 text-emerald-900"
                  : "bg-amber-200 text-amber-950"
              }`}
            >
              {materialAccepted ? "Accepted" : "Required"}
            </span>
          </span>
        </label>
      )}

      {action.requiresCityFeeAcceptance && isOwner && !isInternalDealer && (
        <label className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          <Checkbox checked={cityFeeAccepted} disabled={busy} onCheckedChange={value => setAcceptedCityKey(value === true ? cityKey : "")} />
          <span>I accept the City Fee adjustment of {formatMoney(action.cityFeeAmount ?? action.amount)}.</span>
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
        {(installments.offerFullBalance || installments.isFullBalance) && <FullBalanceToggle selected={installments.isFullBalance}
          disabled={busy} onChange={() => { installments.setFullBalance(!installments.isFullBalance); setAcceptedCityKey(""); }} />}
        {isOwner && !isInternalDealer ? (
          <>
            <span className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure checkout
            </span>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={
                busy || !hasSelection ||
                Boolean(paymentBlockedReason) ||
                (requiresDepositTerms && !depositTermsSatisfied) ||
                (requiresMaterialAcceptance && !materialAccepted) ||
                (action.requiresCityFeeAcceptance && !cityFeeAccepted)
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
                : !hasSelection ? "Select a payment"
                : (requiresDepositTerms && !depositTermsSatisfied) || (requiresMaterialAcceptance && !materialAccepted)
                  ? "Accept terms to continue"
                  : checkoutStarted
                    ? "Resume payment"
                    : action.amount === 0 ? action.requiresCityFeeAcceptance ? "Confirm City Fee" : ((action.type === "MATERIAL" || (action.type === "INSTALLMENT" && installments.sequences.includes(paymentSchedule?.initialSequence ?? -1))) ? (installationJob && installationJob.status !== "CANCELED" ? "Submit for order review" : "Confirm order") : "Confirm step") : "Continue to payment"}
            </Button>
          </>
        ) : isOwner && isInternalDealer ? (
          <div className="space-y-2 text-right">
            <p className="text-sm text-slate-600">
              Send this payment link to the final customer.
            </p>
            <EstimatePaymentLinkActions estimateId={estimateId} showShare beforeAction={beforePayment} />
          </div>
        ) : null}

        {canRecordManualPayment && hasSelection && action.amount > 0 && !paymentBlockedReason && (
          <ManualPaymentDialog
            estimateId={estimateId}
            type={action.type}
            key={`${installments.sequences.join(",")}:${action.amount}:${cityKey}`}
            sequence={selectingInstallments ? undefined : action.sequence}
            sequences={selectingInstallments && !installments.isFullBalance ? installments.sequences : undefined}
            payFullBalance={installments.isFullBalance}
            amount={action.amount}
            requiresCityFeeAcceptance={action.requiresCityFeeAcceptance}
            cityFeeAmount={action.cityFeeAmount}
            requiresDepositTerms={
              requiresDepositTerms && !depositTermsPreviouslyAccepted
            }
            depositTerms={installationJob?.depositTermsSnapshot}
            beforeSubmit={requiresDepositTerms || installationJob?.dealerMeasurementsAcceptedAt ? beforePayment : undefined}
            label="Record verified payment"
            onRecorded={(payment) => {
              if (order?.id) { router.replace(`/orders/${order.id}`); router.refresh(); return; }
              if (payment.order?.id) {
                router.replace(`/orders/${payment.order.id}`);
                return;
              }
              if (action.type === "INSTALLMENT" || action.type === "MATERIAL") { router.replace(`/estimates/${estimateId}/edit`); router.refresh(); return; }
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
    </div>
  );
}
