"use client";
import { usePromotionExpired } from "@/components/promotions/promotion-banner";

import { FullBalancePrompt, FullBalanceReview, FullBalanceToggle, InstallmentSelection, useInstallmentSelection } from "@/components/payments/installment-selection";
import { getCardPaymentBreakdown } from "@/lib/card-payment";
import { PaymentScheduleView } from "@/components/payments/payment-schedule";
import { useState } from "react";
import { CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  createPublicCheckoutSession,
  type PublicPaymentContext,
} from "@/app/api/payments.api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMoney } from "@/lib/formatters";

export function PublicEstimatePaymentCard({
  token,
  context,
  agreementId,
  signatureRequired = false,
}: {
  token: string;
  context: PublicPaymentContext;
  agreementId?: string;
  signatureRequired?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [acceptedCityKey, setAcceptedCityKey] = useState("");
  const installments = useInstallmentSelection(context.schedule, context.payment?.type === "INSTALLMENT" || Boolean(context.schedule?.fullBalance));
  const selectingInstallments = context.payment?.type === "INSTALLMENT" || installments.isFullBalance;
  const cityKey = installments.cityFeeKey;
  const cityFeeAccepted = Boolean(cityKey) && acceptedCityKey === cityKey;
  const hasSelection = !selectingInstallments || installments.sequences.length > 0;

  const expired = usePromotionExpired(context);
  if (context.status === "expired" || expired)
    return (
      <section className="mt-6 border rounded-xl p-5">
        This promotion has expired. Contact your dealer to recalculate the
        estimate before payment.
      </section>
    );

  if (!context.enabled) return null;

  if (context.status === "review") return <div className="mt-6 space-y-5 print:hidden"><PaymentScheduleView schedule={context.schedule} /><p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">A refund is under review. Any remaining amount to pay will appear once the balance is confirmed.</p></div>;

  if (context.status === "complete" || !context.payment) {
    return (
      <div className="mt-6 space-y-5 print:hidden"><PaymentScheduleView schedule={context.schedule} />
      <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 print:hidden">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5" />
          <div>
            <h2 className="font-semibold">{context.schedule?.orderReviewPending ? "Pending order review" : "No payment is currently due"}</h2>
            <p className="text-sm text-emerald-800">
              {context.schedule?.orderReviewPending ? "Your payment is confirmed and credited. An administrator will review the project and create the order." : "This link will automatically show the next charge when it becomes available."}
            </p>
          </div>
        </div>
      </section></div>
    );
  }

  if (selectingInstallments && !installments.isFullBalance && !installments.dueRows.length && installments.canPayFullBalance && context.schedule) {
    return <div className="mt-6 space-y-5 print:hidden"><PaymentScheduleView schedule={context.schedule} /><FullBalancePrompt schedule={context.schedule} onSelect={() => installments.setFullBalance(true)} /></div>;
  }

  const selectedCheckout = context.installmentCheckouts?.find(checkout =>
    Number(checkout.baseAmount) === installments.amount &&
    checkout.sequences.length === installments.sequences.length && checkout.sequences.every(seq => installments.sequences.includes(seq)));
  const selectedBreakdown = getCardPaymentBreakdown({ baseAmount: installments.amount, surchargeFraction: Number(context.payment.surchargePercent) / 100 });
  const payment = selectingInstallments ? {
    ...context.payment,
    type: "INSTALLMENT" as const,
    sequence: installments.selected[0]?.sequence,
    title: installments.isFullBalance ? "Full project balance" : installments.rows.length > 1 ? "Selected payments" : context.payment.title,
    description: installments.isFullBalance ? "Pay all remaining project installments, including payments not yet due." : installments.rows.length > 1 ? "Choose the items you want to pay now. The total updates with your selection." : context.payment.description,
    baseAmount: selectedCheckout?.baseAmount ?? selectedBreakdown.baseAmount.toFixed(2),
    surchargeAmount: selectedCheckout?.surchargeAmount ?? selectedBreakdown.surchargeAmount.toFixed(2),
    surchargePercent: selectedCheckout?.surchargePercent ?? selectedBreakdown.surchargePercent.toFixed(4),
    totalAmount: selectedCheckout?.totalAmount ?? selectedBreakdown.totalAmount.toFixed(2),
    checkoutStarted: Boolean(selectedCheckout),
    requiresCityFeeAcceptance: Boolean(cityKey),
    cityFeeAmount: installments.cityFeeAmount.toFixed(2),
  } : context.payment;
  const baseAmount = Number(payment.baseAmount);
  const surchargeAmount = Number(payment.surchargeAmount);
  const surchargePercent = Number(payment.surchargePercent);
  const surchargePercentLabel = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(surchargePercent);
  const termsSatisfied = !payment.requiresTerms || termsAccepted;

  const pay = async () => {
    if (!hasSelection || signatureRequired || busy || (payment.requiresCityFeeAcceptance && !cityFeeAccepted)) return;
    if (!termsSatisfied) {
      toast.error("Accept the non-refundable deposit terms first.");
      return;
    }

    setBusy(true);
    try {
      const { url } = await createPublicCheckoutSession(
        token,
        payment.requiresTerms ? termsAccepted : undefined,
        agreementId,
        payment.requiresCityFeeAcceptance ? cityFeeAccepted : undefined,
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
    <div className="mt-6 space-y-5 print:hidden"><PaymentScheduleView schedule={context.schedule} />
    <section className="mt-6 rounded-xl border border-slate-300 bg-white p-5 shadow-sm print:hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {installments.isFullBalance ? "Advance payment" : "Payment due"}
            </p>
            <h2 className="font-semibold text-slate-950">{payment.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{payment.description}</p>
          </div>
        </div>

        <div className="shrink-0 text-left sm:min-w-80 sm:text-right">
          <p className="text-xs text-slate-500">Charge total</p>
          <p aria-live="polite" className="text-2xl font-semibold">
            {formatMoney(Number(payment.totalAmount))}
          </p>
          {surchargeAmount > 0 && (
            <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <div className="flex items-center justify-between gap-4">
                <span>Payment amount</span>
                <span className="font-medium text-slate-800">
                  {formatMoney(baseAmount)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-4">
                <span>
                  Processing fee ({surchargePercentLabel}% ×{" "}
                  {formatMoney(baseAmount)})
                </span>
                <span className="font-medium text-slate-800">
                  {formatMoney(surchargeAmount)}
                </span>
              </div>
              <p className="mt-2 border-t border-slate-200 pt-2 text-left text-[11px] leading-relaxed text-slate-500">
                This fee covers card-payment processing and is calculated only
                on the payment amount.
              </p>
            </div>
          )}
        </div>
      </div>

      {installments.isFullBalance ? <FullBalanceReview rows={installments.rows} cityFeePending={context.schedule?.cityFeePending} /> : selectingInstallments && <InstallmentSelection rows={installments.rows} sequences={installments.sequences}
        onChange={values => { installments.setSequences(values); setAcceptedCityKey(""); }} disabled={busy} />}

      {payment.requiresTerms && (
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <Checkbox
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(Boolean(checked))}
            className="mt-0.5"
          />
          <span>
            <strong className="block">
              I accept the non-refundable installation deposit terms
            </strong>
            <span className="mt-1 block text-xs leading-relaxed">
              {payment.terms}
            </span>
          </span>
        </label>
      )}

      {payment.requiresCityFeeAcceptance && (
        <label className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          <Checkbox checked={cityFeeAccepted} disabled={busy} onCheckedChange={value => setAcceptedCityKey(value === true ? cityKey : "")} />
          <span>I accept the City Fee adjustment of {formatMoney(Number(payment.cityFeeAmount ?? baseAmount))}.</span>
        </label>
      )}
      {context.schedule?.orderReviewPending && <p className="mt-4 text-sm text-amber-900">Pending order review. An administrator will create the order after reviewing the project.</p>}
      {signatureRequired && (
        <p className="mt-4 text-sm text-muted-foreground">
          Sign the agreement above to continue with this payment.
        </p>
      )}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {(installments.offerFullBalance || installments.isFullBalance) && <FullBalanceToggle selected={installments.isFullBalance}
          disabled={busy} onChange={() => { installments.setFullBalance(!installments.isFullBalance); setAcceptedCityKey(""); }} />}
        <span className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" /> Secure checkout
        </span>
        <Button
          disabled={!hasSelection || busy || !termsSatisfied || signatureRequired || (payment.requiresCityFeeAcceptance && !cityFeeAccepted)}
          onClick={() => void pay()}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {busy
            ? "Opening checkout..."
            : !hasSelection ? "Select a payment"
            : payment.checkoutStarted
              ? "Resume payment"
              : baseAmount === 0 ? payment.requiresCityFeeAcceptance ? "Confirm City Fee" : (payment.type === "INSTALLMENT" && payment.sequence === 1 ? (context.schedule?.requiresOrderReview ? "Submit for order review" : "Confirm order") : "Confirm step") : "Pay now"}
        </Button>
      </div>
    </section></div>
  );
}
