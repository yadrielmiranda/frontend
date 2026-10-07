"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { usePromotionExpired } from "@/components/promotions/promotion-banner";
import { getCardPaymentBreakdown } from "@/lib/card-payment";
import { PaymentScheduleView } from "@/components/payments/payment-schedule";
import { CustomPaymentAmount, useCustomPayment } from "@/components/payments/custom-payment-amount";
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
  const [selection, setSelection] = useState<{ contextKey: string; key: string } | null>(null);
  const [selectedFullKey, setSelectedFullKey] = useState("");
  const [acceptedTermsKey, setAcceptedTermsKey] = useState("");
  const [acceptedCityKey, setAcceptedCityKey] = useState("");
  const expired = usePromotionExpired(context);
  const materialRevisionPending = Boolean(context.materialRevisionPending || context.schedule?.materialRevisionPending);
  const custom = useCustomPayment(context.schedule, !materialRevisionPending);
  useEffect(() => {
    if (!materialRevisionPending) return;
    // Una selección anterior no debe reaparecer después de aprobar otra versión.
    setSelection(null);
    setSelectedFullKey("");
    setAcceptedTermsKey("");
    setAcceptedCityKey("");
  }, [materialRevisionPending]);
  const options: PublicPaymentOption[] = context.payments ?? (context.payment ? [context.payment] : []);
  const isPaymentPaused = (item: PublicPaymentOption) => materialRevisionPending &&
    ["MATERIAL", "INSTALLMENT", "INSTALLATION", "PERMIT"].includes(item.type);
  const independentOptions = options.filter(item => item.type === "DELIVERY" || item.type === "EXTRA");
  const projectOptions = options.filter(item => item.type !== "DELIVERY" && item.type !== "EXTRA");
  const scheduledNext = context.schedule?.next
    ? projectOptions.find(item => item.type === "INSTALLMENT" && item.sequence === context.schedule!.next!.sequence)
    : undefined;
  const nextPayment = scheduledNext ?? projectOptions.find(item => !item.advanceOnly && (!context.schedule || item.type !== "INSTALLMENT"));
  const selectionContextKey = JSON.stringify([context.schedule?.next, options.map(item => [itemKey(item), item.baseAmount, item.advanceOnly])]);
  const selectedCharge = selection?.contextKey === selectionContextKey
    ? independentOptions.find(item => itemKey(item) === selection.key) : undefined;
  // El saldo público general también contiene cargos separados. Sólo el plan
  // aprobado define el saldo del proyecto y las cuotas que se muestran aquí.
  const full = context.schedule?.fullBalance;
  const fullOptions = full?.sequences.map(sequence => options.find(item => item.type === "INSTALLMENT" && item.sequence === sequence));
  const fullAvailable = Boolean(full && Number(full.amount) > 0 && full.sequences.length && fullOptions?.every(Boolean) &&
    fullOptions.reduce((total, item) => total + amountCents(item!.baseAmount), 0) === amountCents(full.amount));
  const fullKey = fullAvailable ? JSON.stringify([full, selectionContextKey]) : "";
  const isFullBalance = !materialRevisionPending && Boolean(fullKey && selectedFullKey === fullKey);
  const currentPayment = selectedCharge ?? nextPayment;
  const selected = custom.active
    ? options.filter(item => item.type === "INSTALLMENT" && custom.preview.allocations.some(({ row }) => row.sequence === item.sequence))
    : isFullBalance ? fullOptions!.filter((item): item is PublicPaymentOption => Boolean(item))
      : currentPayment ? [currentPayment] : [];
  const hasSelection = custom.active ? custom.preview.valid : selected.length > 0;
  const paymentPaused = selected.some(isPaymentPaused);
  const baseCents = custom.active ? Math.round((custom.preview.valid ? custom.preview.amount : 0) * 100)
    : selected.reduce((total, item) => total + amountCents(item.baseAmount), 0);
  const baseAmount = baseCents / 100;
  const cityItems = selected.filter(item => item.requiresCityFeeAcceptance);
  const cityKey = custom.active ? custom.preview.cityFeeKey : cityItems.map(item => `${itemKey(item)}:${item.cityFeeAmount}:${item.baseAmount}`).sort().join("|");
  const cityAmount = custom.active ? custom.preview.cityFeeAmount : cityItems.reduce((sum, item) => sum + amountCents(item.cityFeeAmount ?? item.baseAmount), 0) / 100;
  const citySatisfied = !cityKey || acceptedCityKey === cityKey;
  const termsItems = selected.filter(item => item.requiresTerms);
  const termsKey = termsItems.map(item => `${itemKey(item)}:${item.baseAmount}:${item.terms}`).sort().join("|");
  const termsSatisfied = !termsKey || acceptedTermsKey === termsKey;
  // La exención pertenece al depósito; una selección mixta sigue exigiendo firma.
  const signatureRequired = (custom.active || selected.some(item => item.type !== "INSTALLATION_DEPOSIT")) &&
    Boolean(context.agreement?.required && !context.agreement.satisfied);
  const existingCheckout = context.checkouts?.find(checkout =>
    amountCents(checkout.baseAmount) === baseCents && checkout.items.length === selected.length &&
    checkout.items.every(item => selected.some(p => itemKey(p) === itemKey(item))));
  const breakdown = getCardPaymentBreakdown({ baseAmount,
    surchargeFraction: Number(selected[0]?.surchargePercent ?? (custom.active ? options.find(item => item.type === "INSTALLMENT")?.surchargePercent : 0) ?? 0) / 100 });
  const totalAmount = existingCheckout ? Number(existingCheckout.totalAmount) : breakdown.totalAmount;
  const surchargeAmount = existingCheckout ? Number(existingCheckout.surchargeAmount) : breakdown.surchargeAmount;

  const pay = async () => {
    if (!hasSelection || busy || paymentPaused || signatureRequired || !citySatisfied || !termsSatisfied) return;
    setBusy(true);
    try {
      const { url } = await createPublicCheckoutSession(
        token, termsKey ? true : undefined, agreementId, cityKey ? true : undefined, undefined,
        undefined,
        custom.active || isFullBalance ? undefined : { items: selected.map(({ type, sequence }) => ({ type, sequence })), expectedBalance: baseAmount },
        custom.active ? { customAmount: custom.preview.amount, expectedBalance: custom.preview.maximum }
          : isFullBalance ? { customAmount: Number(full!.amount), expectedBalance: Number(full!.amount) } : undefined,
      );
      window.location.href = url;
    } catch (error) {
      toast.error((error as Error).message);
      setBusy(false);
      router.refresh();
    }
  };

  if (context.status === "canceled") return <p role="status" className="rounded-lg border bg-slate-50 p-4 text-sm print:hidden">This estimate has been canceled.</p>;
  if (context.status === "unavailable") return <Button className="mt-6 print:hidden" disabled>Continue to payment</Button>;
  if (context.status === "expired" || expired) return (
    <section className="mt-6 rounded-xl border p-5">
      This promotion has expired. Contact your dealer to recalculate the estimate before payment.
    </section>
  );
  if (!context.enabled) return null;
  if (!options.length && !custom.available) return (
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

  const reviewingAlternative = custom.active || isFullBalance || Boolean(selectedCharge);
  const backToNextPayment = () => {
    custom.disable(); setSelectedFullKey(""); setSelection(null); setAcceptedCityKey(""); setAcceptedTermsKey("");
  };
  return (
    <div className="mt-6 space-y-5 print:hidden">
      <PaymentScheduleView schedule={context.schedule} />
      <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white"><CreditCard className="h-5 w-5" /></span>
            <div>
              <h2 className="font-semibold text-slate-950">{custom.active ? "Custom project payment" : isFullBalance ? "Full project balance" : selectedCharge ? selectedCharge.title : "Next payment"}</h2>
              {!reviewingAlternative && nextPayment && <p className="mt-1 font-medium text-slate-950">{nextPayment.title}</p>}
              <p className="mt-1 text-sm text-slate-600">{custom.active ? "Choose an amount to apply toward your project installments."
                : isFullBalance
                ? "Pay all remaining project installments, including payments not yet due."
                : currentPayment?.description || (currentPayment ? "Review this payment before continuing." : "No project payment is currently due.")}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Payment total</p>
            <p aria-live="polite" className="text-2xl font-semibold">{formatMoney(totalAmount)}</p>
            {surchargeAmount > 0 && <p className="mt-1 text-xs text-slate-500">Payment {formatMoney(baseAmount)} + processing fee {formatMoney(surchargeAmount)}</p>}
          </div>
        </div>

        {custom.active && <CustomPaymentAmount input={custom.input} preview={custom.preview} disabled={busy}
          onChange={value => { custom.setInput(value); setAcceptedCityKey(""); setAcceptedTermsKey(""); }} />}
        {isFullBalance && <div className="mt-4 rounded-lg border p-4">
          <p className="text-sm font-medium">Included project installments</p>
          <dl className="mt-2 divide-y text-sm">{selected.map(item => <div key={itemKey(item)} className="flex justify-between gap-3 py-2">
            <dt>{item.title}{item.advanceOnly && <span className="ml-2 text-xs text-slate-500">Upcoming</span>}</dt>
            <dd className="shrink-0 font-medium">{formatMoney(Number(item.baseAmount))}</dd>
          </div>)}</dl>
          <p className="mt-2 text-xs text-slate-500">Delivery and separate extra charges are not included.</p>
        </div>}
        {isFullBalance && context.schedule?.cityFeePending && <p className="mt-3 text-sm text-amber-800">City Fee is not yet known and will be added separately.</p>}
        {termsKey && (
          <label className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <Checkbox checked={termsSatisfied} disabled={busy || paymentPaused} onCheckedChange={value => {
              if (!paymentPaused) setAcceptedTermsKey(value === true ? termsKey : "");
            }} />
            <span><strong className="block">I accept the non-refundable installation deposit terms</strong>
              <span className="mt-1 block text-xs leading-relaxed">{termsItems.map(item => item.terms).join(" ")}</span>
            </span>
          </label>
        )}
        {cityKey && (
          <label className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
            <Checkbox checked={citySatisfied} disabled={busy || paymentPaused} onCheckedChange={value => {
              if (!paymentPaused) setAcceptedCityKey(value === true ? cityKey : "");
            }} />
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
          {reviewingAlternative && <Button type="button" variant="outline" disabled={busy} onClick={backToNextPayment}>Back to next payment</Button>}
          {custom.available && !custom.active && <Button type="button" variant="outline" disabled={busy} onClick={() => {
            custom.enable(); setSelection(null); setSelectedFullKey(""); setAcceptedCityKey(""); setAcceptedTermsKey("");
          }}>Pay another amount</Button>}
          {fullAvailable && !isFullBalance && <Button type="button" variant="outline" disabled={busy || materialRevisionPending} onClick={() => {
            if (materialRevisionPending) return;
            custom.disable(); setSelection(null);
            setSelectedFullKey(fullKey); setAcceptedCityKey(""); setAcceptedTermsKey("");
          }}>Pay full balance</Button>}
          <span className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5" />Secure checkout</span>
          {(hasSelection || custom.active) && <Button disabled={!hasSelection || busy || paymentPaused || signatureRequired || !citySatisfied || !termsSatisfied} onClick={() => void pay()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {busy ? "Opening checkout..." : !hasSelection ? custom.active ? "Enter a valid amount" : "Select a payment" : existingCheckout ? "Resume payment"
              : baseAmount > 0 ? !reviewingAlternative && currentPayment?.type === "INSTALLMENT" ? "Pay next installment" : "Continue to payment" : cityKey ? "Confirm City Fee"
              : selected.some(item => item.type === "INSTALLMENT" && item.sequence === (context.schedule?.initialSequence ?? 1))
                ? context.schedule?.requiresOrderReview ? "Submit for order review" : "Confirm order" : "Confirm step"}
          </Button>}
        </div>
      </section>
      {independentOptions.length > 0 && <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold text-slate-950">Delivery and extra charges</h2>
        <p className="mt-1 text-sm text-slate-600">These charges are separate from your project installments.</p>
        <div className="mt-3 divide-y">{independentOptions.map(item => <div key={itemKey(item)} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div><p className="text-sm font-medium">{item.title}</p><p className="text-sm text-slate-600">{formatMoney(Number(item.baseAmount))}</p></div>
          <Button type="button" variant="outline" disabled={busy} onClick={() => {
            custom.disable(); setSelectedFullKey(""); setAcceptedCityKey(""); setAcceptedTermsKey("");
            setSelection({ contextKey: selectionContextKey, key: itemKey(item) });
          }}>Pay {item.title}</Button>
        </div>)}</div>
      </section>}
    </div>
  );
}
