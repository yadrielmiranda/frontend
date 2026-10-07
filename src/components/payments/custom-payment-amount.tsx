"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/formatters";
import { previewCustomPayment } from "@/lib/custom-payment";
import type { PaymentSchedule } from "@/lib/payment-plan";

export function useCustomPayment(schedule: PaymentSchedule | null | undefined, enabled = true) {
  const key = JSON.stringify([enabled, schedule?.fullBalance, schedule?.rows,
    schedule?.estimateCanceled, schedule?.materialRevisionPending, schedule?.refundReviewPending]);
  const [choice, setChoice] = useState<{ key: string; input: string } | null>(null);
  useEffect(() => { setChoice(null); }, [key]);
  const input = choice?.key === key ? choice.input : "";
  const preview = previewCustomPayment(schedule, input);
  const available = enabled && preview.available;
  return {
    available, active: available && choice?.key === key, input, preview,
    enable: () => setChoice({ key, input: "" }),
    disable: () => setChoice(null),
    setInput: (value: string) => setChoice({ key, input: value }),
  };
}

export function CustomPaymentAmount({ input, onChange, preview, disabled = false }: {
  input: string;
  onChange: (value: string) => void;
  preview: ReturnType<typeof previewCustomPayment>;
  disabled?: boolean;
}) {
  return <div className="mt-4 space-y-3 rounded-lg border bg-slate-50 p-4">
    <label className="block space-y-1 text-sm font-medium">
      <span>Payment amount</span>
      <Input aria-label="Custom payment amount" type="number" inputMode="decimal" min="0.01" step="0.01"
        max={preview.maximum} value={input} disabled={disabled} onChange={event => onChange(event.target.value)} />
    </label>
    <p className="text-xs text-muted-foreground">Project balance: {formatMoney(preview.maximum)}. Processing fees, delivery and separate extra charges are not included in this amount.</p>
    {input && preview.error && <p role="alert" className="text-sm text-amber-800">{preview.error}</p>}
    {preview.valid && <div aria-live="polite" className="overflow-x-auto rounded border bg-white">
      <table className="w-full text-sm">
        <caption className="p-3 text-left font-medium">How this payment will be applied</caption>
        <thead><tr className="border-b text-xs text-muted-foreground"><th className="px-3 py-2 text-left">Installment</th><th className="px-3 py-2 text-right">This payment</th><th className="px-3 py-2 text-right">Remaining</th></tr></thead>
        <tbody>{preview.allocations.map(({ row, amount, remaining }) => <tr key={row.sequence} className="border-b last:border-0">
          <td className="px-3 py-2">{row.title}{amount === 0 && <span className="block text-xs text-muted-foreground">Covered by prior payments or credit</span>}</td><td className="px-3 py-2 text-right">{formatMoney(amount)}</td><td className="px-3 py-2 text-right">{formatMoney(remaining)}</td>
        </tr>)}</tbody>
      </table>
    </div>}
    <p className="text-xs text-muted-foreground">Applied to outstanding installments in order. A partial payment does not complete its project milestone.</p>
  </div>;
}
