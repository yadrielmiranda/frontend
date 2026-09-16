"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { formatMoney, roundMoney } from "@/lib/formatters";
import type { PaymentSchedule, PaymentScheduleRow } from "@/lib/payment-plan";
import type { EstimatePayment } from "@/lib/types";

export function useInstallmentSelection(schedule: PaymentSchedule | null | undefined, enabled: boolean) {
  const allRows = enabled && schedule ? schedule.rows : [];
  const dueRows = allRows.filter(row =>
    row.status === "DUE" || row.sequence === schedule?.next?.sequence,
  );
  const fullBalance = enabled ? schedule?.fullBalance : null;
  const fullRows = allRows.filter(row => fullBalance?.sequences.includes(row.sequence));
  const key = JSON.stringify([fullBalance, allRows.map(row => [row.sequence, row.amount, row.balance, row.status])]);
  const [fullBalanceKey, setFullBalanceKey] = useState<string | null>(null);
  const isFullBalance = Boolean(fullBalance) && fullBalanceKey === key;
  const rows = isFullBalance ? fullRows : dueRows;
  const [choice, setChoice] = useState<{ key: string; sequences: number[] } | null>(null);
  const sequences = !isFullBalance && choice?.key === key ? choice.sequences : rows.map(row => row.sequence);
  const selected = rows.filter(row => sequences.includes(row.sequence));
  const cities = selected.filter(row => row.kind === "CITY_FEE");
  return {
    rows, dueRows, selected, sequences, isFullBalance,
    canPayFullBalance: Boolean(fullBalance),
    offerFullBalance: fullRows.some(row => row.status === "UPCOMING"),
    setFullBalance: (value: boolean) => setFullBalanceKey(value ? key : null),
    amount: selected.reduce((sum, row) => sum + Math.round(Number(row.balance) * 100), 0) / 100,
    cityFeeAmount: cities.reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0) / 100,
    cityFeeKey: cities.length ? JSON.stringify(cities.map(row => [row.sequence, row.amount, row.balance])) : "",
    setSequences: (values: number[]) => setChoice({ key, sequences: values }),
  };
}

export function FullBalancePrompt({ schedule, onSelect }: { schedule: PaymentSchedule; onSelect: () => void }) {
  return (
    <section id="estimate-payment" className="scroll-mt-28 print:hidden flex flex-col gap-4 rounded-xl border border-slate-300 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="font-semibold">{schedule.orderReviewPending ? "Pending order review" : "No payment is currently due"}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{schedule.orderReviewPending ? "Your order is awaiting administrative review. You can pay the remaining project balance in advance." : "You can pay the remaining project balance in advance."}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-4">
        <div className="text-sm"><span className="block text-muted-foreground">Project balance</span><strong>{formatMoney(Number(schedule.fullBalance?.amount ?? 0))}</strong></div>
        <Button type="button" variant="outline" onClick={onSelect}>Pay full balance</Button>
      </div>
    </section>
  );
}

export function FullBalanceReview({ rows, cityFeePending }: { rows: PaymentScheduleRow[]; cityFeePending?: boolean }) {
  return (
    <div className="mt-5 rounded-lg border bg-white px-4 py-2">
      <p className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Included installments</p>
      <dl className="divide-y">
        {rows.map(row => (
          <div key={row.sequence} className="flex items-start justify-between gap-4 py-2.5 text-sm">
            <dt className="min-w-0">{row.title}{row.status === "UPCOMING" && <span className="mt-0.5 block text-xs text-muted-foreground">Advance payment</span>}</dt>
            <dd className="shrink-0 font-medium tabular-nums">{formatMoney(Number(row.balance))}</dd>
          </div>
        ))}
      </dl>
      {cityFeePending && <p className="border-t py-3 text-sm text-amber-800">City Fee is not yet determined and is excluded from this payment.</p>}
    </div>
  );
}

export function FullBalanceToggle({ selected, onChange, disabled }: { selected: boolean; onChange: () => void; disabled?: boolean }) {
  return <Button type="button" variant={selected ? "ghost" : "outline"} className="w-full sm:mr-auto sm:w-auto" disabled={disabled} onClick={onChange}>{selected ? "Back to scheduled payments" : "Pay full balance"}</Button>;
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

export function InstallmentSelection({ rows, sequences, onChange, disabled }: {
  rows: PaymentScheduleRow[];
  sequences: number[];
  onChange: (sequences: number[]) => void;
  disabled?: boolean;
}) {
  if (rows.length < 2) return null;
  return (
    <fieldset className="mt-5 space-y-2" disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold">Choose payments</legend>
      <p className="pb-1 text-sm text-muted-foreground">Pay any due item separately, or select several to pay together.</p>
      {rows.map(row => (
        <label key={row.sequence} className="flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3">
          <Checkbox
            checked={sequences.includes(row.sequence)}
            disabled={disabled}
            className="mt-0.5"
            onCheckedChange={checked => onChange(checked === true
              ? [...sequences, row.sequence] : sequences.filter(sequence => sequence !== row.sequence))}
          />
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-medium">{row.title}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{row.description}</span>
          </span>
          <span className="shrink-0 text-sm font-semibold">{formatMoney(Number(row.balance))}</span>
        </label>
      ))}
      {!sequences.length && <p role="status" className="text-sm text-amber-800">Select at least one payment to continue.</p>}
    </fieldset>
  );
}
