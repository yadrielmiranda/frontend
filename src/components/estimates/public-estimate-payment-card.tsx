"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { usePromotionExpired } from "@/components/promotions/promotion-banner";
import { getCardPaymentBreakdown } from "@/lib/card-payment";
import { PaymentScheduleView } from "@/components/payments/payment-schedule";
import {
  createPublicCheckoutSession,
  type PublicPaymentContext,
  type PublicPaymentOption,
  type PublicPaymentSelection,
} from "@/app/api/payments.api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMoney } from "@/lib/formatters";

const itemKey = (item: PublicPaymentSelection) => `${item.type}:${item.sequence}`;
const amountCents = (amount: string) => Math.round(Number(amount) * 100);

export function PublicEstimatePaymentCard({ token, context, agreementId }: {
  token: string;
  context: PublicPaymentContext;
  agreementId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[] | null>(null);
  const [selectedFullKey, setSelectedFullKey] = useState("");
  const [acceptedTermsKey, setAcceptedTermsKey] = useState("");
  const [acceptedCityKey, setAcceptedCityKey] = useState("");
  const expired = usePromotionExpired(context);
  const options: PublicPaymentOption[] = context.payments ?? (context.payment ? [context.payment] : []);
  const due = options.filter(item => !item.advanceOnly);
  const full = context.fullBalance;
  const fullKey = full ? `${full.amount}|${full.items.map(itemKey).sort().join(",")}` : "";
  const isFullBalance = Boolean(fullKey && selectedFullKey === fullKey);
  const keys = isFullBalance ? full!.items.map(itemKey) : selectedKeys ?? due.slice(0, 1).map(itemKey);
  const selected = (isFullBalance ? options : due).filter(item => keys.includes(itemKey(item)));
  const baseCents = selected.reduce((total, item) => total + amountCents(item.baseAmount), 0);
  const baseAmount = baseCents / 100;
  const cityItems = selected.filter(item => item.requiresCityFeeAcceptance);
  const cityKey = cityItems.map(item => `${itemKey(item)}:${item.cityFeeAmount}:${item.baseAmount}`).sort().join("|");
  const cityAmount = cityItems.reduce((sum, item) => sum + amountCents(item.cityFeeAmount ?? item.baseAmount), 0) / 100;
  const citySatisfied = !cityKey || acceptedCityKey === cityKey;
  const termsItems = selected.filter(item => item.requiresTerms);
  const termsKey = termsItems.map(item => `${itemKey(item)}:${item.baseAmount}:${item.terms}`).sort().join("|");
  const termsSatisfied = !termsKey || acceptedTermsKey === termsKey;
  // La exención pertenece al depósito; una selección mixta sigue exigiendo firma.
  const signatureRequired = selected.some(item => item.type !== "INSTALLATION_DEPOSIT") &&
    Boolean(context.agreement?.required && !context.agreement.satisfied);
  const existingCheckout = context.checkouts?.find(checkout =>
    amountCents(checkout.baseAmount) === baseCents && checkout.items.length === selected.length &&
    checkout.items.every(item => selected.some(p => itemKey(p) === itemKey(item))));
  const breakdown = getCardPaymentBreakdown({ baseAmount,
    surchargeFraction: Number(selected[0]?.surchargePercent ?? 0) / 100 });
  const totalAmount = existingCheckout ? Number(existingCheckout.totalAmount) : breakdown.totalAmount;
  const surchargeAmount = existingCheckout ? Number(existingCheckout.surchargeAmount) : breakdown.surchargeAmount;

  const pay = async () => {
    if (!selected.length || busy || signatureRequired || !citySatisfied || !termsSatisfied) return;
    setBusy(true);
    try {
      const { url } = await createPublicCheckoutSession(
        token, termsKey ? true : undefined, agreementId, cityKey ? true : undefined, undefined,
        isFullBalance ? { payFullBalance: true, expectedBalance: baseAmount } : undefined,
        isFullBalance ? undefined : { items: selected.map(({ type, sequence }) => ({ type, sequence })), expectedBalance: baseAmount },
      );
      window.location.href = url;
    } catch (error) {
      toast.error((error as Error).message);
      setBusy(false);
      router.refresh();
    }
  };

  if (context.status === "expired" || expired) return (
    <section className="mt-6 rounded-xl border p-5">
      This promotion has expired. Contact your dealer to recalculate the estimate before payment.
    </section>
  );
  if (!context.enabled) return null;
  if (!options.length) return (
    <div className="mt-6 space-y-5 print:hidden">
      <PaymentScheduleView schedule={context.schedule} />
      {context.status === "review" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          A refund is under review. Any remaining amount to pay will appear once the balance is confirmed.
        </p>
      ) : (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5" />
            <div>
              <h2 className="font-semibold">{context.schedule?.orderReviewPending ? "Pending order review" : "No payment is currently due"}</h2>
              <p className="text-sm text-emerald-800">{context.schedule?.orderReviewPending
                ? "Your payment is confirmed and credited. An administrator will review the project and create the order."
                : "This link will automatically show the next charge when it becomes available."}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );

  const rows = isFullBalance ? selected : due;
  return (
    <div className="mt-6 space-y-5 print:hidden">
      <PaymentScheduleView schedule={context.schedule} />
      <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white"><CreditCard className="h-5 w-5" /></span>
            <div>
              <h2 className="font-semibold text-slate-950">{isFullBalance ? "Full outstanding balance" : due.length === 1 ? due[0].title : "Choose payments"}</h2>
              <p className="mt-1 text-sm text-slate-600">{isFullBalance
                ? "Includes remaining installments, delivery and separate extra charges shown below."
                : due.length ? "Select the items you want to pay now." : "You can pay the remaining balance in advance."}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Charge total</p>
            <p aria-live="polite" className="text-2xl font-semibold">{formatMoney(totalAmount)}</p>
            {surchargeAmount > 0 && <p className="mt-1 text-xs text-slate-500">Payment {formatMoney(baseAmount)} + processing fee {formatMoney(surchargeAmount)}</p>}
          </div>
        </div>

        {rows.length > 0 && (
          <fieldset className="mt-4 divide-y rounded-lg border" disabled={busy}>
            <legend className="sr-only">Payments available</legend>
            {rows.map(item => (
              <label key={itemKey(item)} className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm">
                <Checkbox aria-label={`Pay ${item.title}`} checked={keys.includes(itemKey(item))}
                  disabled={busy || isFullBalance}
                  onCheckedChange={checked => {
                    setSelectedKeys(checked === true ? [...keys, itemKey(item)] : keys.filter(key => key !== itemKey(item)));
                    setAcceptedCityKey(""); setAcceptedTermsKey("");
                  }} />
                <span className="min-w-0 flex-1">{item.title}{item.advanceOnly && <span className="ml-2 text-xs text-slate-500">Upcoming</span>}</span>
                <span className="shrink-0 font-medium">{formatMoney(Number(item.baseAmount))}</span>
              </label>
            ))}
          </fieldset>
        )}
        {isFullBalance && context.schedule?.cityFeePending && <p className="mt-3 text-sm text-amber-800">City Fee is not yet known and will be added separately.</p>}
        {termsKey && (
          <label className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <Checkbox checked={termsSatisfied} disabled={busy} onCheckedChange={value => setAcceptedTermsKey(value === true ? termsKey : "")} />
            <span><strong className="block">I accept the non-refundable installation deposit terms</strong>
              <span className="mt-1 block text-xs leading-relaxed">{termsItems.map(item => item.terms).join(" ")}</span>
            </span>
          </label>
        )}
        {cityKey && (
          <label className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
            <Checkbox checked={citySatisfied} disabled={busy} onCheckedChange={value => setAcceptedCityKey(value === true ? cityKey : "")} />
            <span>I accept the City Fee adjustment of {formatMoney(cityAmount)}.</span>
          </label>
        )}
        {context.schedule?.orderReviewPending && <p className="mt-4 text-sm text-amber-900">Pending order review. An administrator will create the order after reviewing the project.</p>}
        {signatureRequired && (
          <div role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            {context.agreement?.signingUrl ? <>
              <p>Review and sign the current agreement before payment.</p>
              <a className="mt-2 inline-block font-medium underline underline-offset-4" href={context.agreement.signingUrl}>Review agreement</a>
            </> : <p>Ask your dealer for the updated agreement to sign before payment.</p>}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {full && <Button type="button" variant="outline" disabled={busy} onClick={() => {
            setSelectedFullKey(isFullBalance ? "" : fullKey); setAcceptedCityKey(""); setAcceptedTermsKey("");
          }}>{isFullBalance ? "Choose payments" : "Pay full balance"}</Button>}
          <span className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5" />Secure checkout</span>
          <Button disabled={!selected.length || busy || signatureRequired || !citySatisfied || !termsSatisfied} onClick={() => void pay()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {busy ? "Opening checkout..." : !selected.length ? "Select a payment" : existingCheckout ? "Resume payment"
              : baseAmount > 0 ? "Pay now" : cityKey ? "Confirm City Fee"
              : selected.some(item => item.type === "INSTALLMENT" && item.sequence === 1)
                ? context.schedule?.requiresOrderReview ? "Submit for order review" : "Confirm order" : "Confirm step"}
          </Button>
        </div>
      </section>
    </div>
  );
}
