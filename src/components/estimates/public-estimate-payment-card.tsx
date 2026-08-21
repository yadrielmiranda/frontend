"use client";

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
}: {
  token: string;
  context: PublicPaymentContext;
}) {
  const [busy, setBusy] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  if (!context.enabled) return null;

  if (context.status === "complete" || !context.payment) {
    return (
      <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 print:hidden">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5" />
          <div>
            <h2 className="font-semibold">No payment is currently due</h2>
            <p className="text-sm text-emerald-800">
              This link will automatically show the next charge when it becomes
              available.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const payment = context.payment;
  const baseAmount = Number(payment.baseAmount);
  const surchargeAmount = Number(payment.surchargeAmount);
  const surchargePercent = Number(payment.surchargePercent);
  const surchargePercentLabel = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(surchargePercent);
  const termsSatisfied = !payment.requiresTerms || termsAccepted;

  const pay = async () => {
    if (!termsSatisfied) {
      toast.error("Accept the non-refundable deposit terms first.");
      return;
    }

    setBusy(true);
    try {
      const { url } = await createPublicCheckoutSession(
        token,
        payment.requiresTerms ? termsAccepted : undefined,
      );
      window.location.href = url;
    } catch (error) {
      toast.error((error as Error).message);
      setBusy(false);
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-slate-300 bg-white p-5 shadow-sm print:hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Payment due
            </p>
            <h2 className="font-semibold text-slate-950">{payment.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{payment.description}</p>
          </div>
        </div>

        <div className="shrink-0 text-left sm:min-w-80 sm:text-right">
          <p className="text-xs text-slate-500">Charge total</p>
          <p className="text-2xl font-semibold">
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
                  Card processing fee ({surchargePercentLabel}% ×{" "}
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

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        <span className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" /> Secure checkout
        </span>
        <Button disabled={busy || !termsSatisfied} onClick={() => void pay()}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {busy
            ? "Opening checkout..."
            : payment.checkoutStarted
              ? "Resume payment"
              : "Pay now"}
        </Button>
      </div>
    </section>
  );
}
