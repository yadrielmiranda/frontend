"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CompanyLocale } from "@/components/company/company-content";
import { formatMoney, roundMoney } from "@/lib/formatters";
import type { PaymentSchedule, PaymentScheduleRow } from "@/lib/payment-plan";
import { paymentRowTitle } from "@/lib/payment-plan-language";
import type { EstimatePayment } from "@/lib/types";

export function useInstallmentSelection(schedule: PaymentSchedule | null | undefined, enabled: boolean) {
  const allRows = enabled && schedule ? schedule.rows : [];
  const dueRows = allRows.filter(row => row.sequence === schedule?.next?.sequence);
  const fullBalance = enabled ? schedule?.fullBalance : null;
  const fullRows = allRows.filter(row => fullBalance?.sequences.includes(row.sequence));
  const key = JSON.stringify([fullBalance, allRows.map(row => [row.sequence, row.amount, row.balance, row.status])]);
  const [fullBalanceKey, setFullBalanceKey] = useState<string | null>(null);
  const isFullBalance = Boolean(fullBalance) && fullBalanceKey === key;
  const rows = isFullBalance ? fullRows : dueRows;
  const sequences = rows.map(row => row.sequence);
  const selected = rows;
  const cities = selected.filter(row => row.kind === "CITY_FEE");
  return {
    rows, dueRows, selected, sequences, isFullBalance,
    canPayFullBalance: Boolean(fullBalance),
    offerFullBalance: Boolean(fullBalance && Number(fullBalance.amount) > 0),
    setFullBalance: (value: boolean) => setFullBalanceKey(value ? key : null),
    amount: selected.reduce((sum, row) => sum + Math.round(Number(row.balance) * 100), 0) / 100,
    cityFeeAmount: cities.reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0) / 100,
    cityFeeKey: cities.length ? JSON.stringify(cities.map(row => [row.sequence, row.amount, row.balance])) : "",
  };
}

export function FullBalancePrompt({ schedule, onSelect, onCustomAmount, locale = "en" }: {
  schedule: PaymentSchedule;
  onSelect: () => void;
  onCustomAmount?: () => void;
  locale?: CompanyLocale;
}) {
  const spanish = locale === "es";
  const heading = schedule.orderReviewPending
    ? (spanish ? "Orden pendiente de revisión" : "Pending order review")
    : (spanish ? "Por ahora no se requiere ningún pago" : "No payment is currently due");
  const advanceNotice = spanish ? "Puedes pagar por adelantado el saldo pendiente del proyecto." : "You can pay the remaining project balance in advance.";
  return (
    <section id="estimate-payment" className="scroll-mt-28 print:hidden rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold">{heading}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {schedule.orderReviewPending && (spanish ? "Tu orden está pendiente de revisión administrativa. " : "Your order is awaiting administrative review. ")}
            {advanceNotice}
          </p>
        </div>
        <div className="shrink-0 text-sm sm:text-right"><span className="block text-muted-foreground">{spanish ? "Saldo del proyecto" : "Project balance"}</span><strong>{formatMoney(Number(schedule.fullBalance?.amount ?? 0))}</strong></div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        {onCustomAmount && <Button type="button" variant="outline" onClick={onCustomAmount}>{spanish ? "Pagar otro importe" : "Pay another amount"}</Button>}
        <Button type="button" variant="outline" onClick={onSelect}>{spanish ? "Pagar el saldo total" : "Pay full balance"}</Button>
      </div>
    </section>
  );
}

export function FullBalanceReview({ rows, cityFeePending, locale = "en" }: { rows: PaymentScheduleRow[]; cityFeePending?: boolean; locale?: CompanyLocale }) {
  const spanish = locale === "es";
  return (
    <div className="mt-5 rounded-lg border bg-white px-4 py-2">
      <p className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{spanish ? "Cuotas incluidas" : "Included installments"}</p>
      <dl className="divide-y">
        {rows.map(row => (
          <div key={row.sequence} className="flex items-start justify-between gap-4 py-2.5 text-sm">
            <dt className="min-w-0">{paymentRowTitle(locale, row)}{row.status === "UPCOMING" && <span className="mt-0.5 block text-xs text-muted-foreground">{spanish ? "Pago anticipado" : "Advance payment"}</span>}</dt>
            <dd className="shrink-0 font-medium tabular-nums">{formatMoney(Number(row.balance))}</dd>
          </div>
        ))}
      </dl>
      {cityFeePending && <p className="border-t py-3 text-sm text-amber-800">{spanish ? "Este pago excluye la tasa municipal porque su importe aún está por determinar." : "City Fee is not yet determined and is excluded from this payment."}</p>}
    </div>
  );
}

export function FullBalanceToggle({ selected, onChange, disabled, locale = "en" }: { selected: boolean; onChange: () => void; disabled?: boolean; locale?: CompanyLocale }) {
  const label = selected
    ? (locale === "es" ? "Volver al próximo pago" : "Back to next payment")
    : (locale === "es" ? "Pagar el saldo total" : "Pay full balance");
  return <Button type="button" variant={selected ? "ghost" : "outline"} className="w-full sm:mr-auto sm:w-auto" disabled={disabled} onClick={onChange}>{label}</Button>;
}

/** Reanuda solamente la misma selección; nunca muestra el total de otra sesión. */
export function selectedInstallmentCheckout(payments: EstimatePayment[], sequences: number[], expectedAmount?: number): EstimatePayment | undefined {
  const first = payments.find(p => p.type === "INSTALLMENT" && p.status === "PENDING" && p.stripeSessionId && sequences.includes(p.sequence));
  if (!first) return undefined;
  const group = payments.filter(p => p.stripeSessionId === first.stripeSessionId);
  if (group.length !== sequences.length || group.some(p => p.status !== "PENDING" || p.type !== "INSTALLMENT" || !sequences.includes(p.sequence))) return undefined;
  const baseAmount = roundMoney(group.reduce((sum, p) => sum + Number(p.baseAmount), 0));
  if (expectedAmount !== undefined && baseAmount !== roundMoney(expectedAmount)) return undefined;
  return {
    ...first,
    baseAmount: baseAmount.toFixed(2),
    surchargeAmount: roundMoney(group.reduce((sum, p) => sum + Number(p.surchargeAmount), 0)).toFixed(2),
    amount: roundMoney(group.reduce((sum, p) => sum + Number(p.amount), 0)).toFixed(2),
  };
}
