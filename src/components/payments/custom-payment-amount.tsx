"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import type { CompanyLocale } from "@/components/company/company-content";
import { formatMoney } from "@/lib/formatters";
import { previewCustomPayment } from "@/lib/custom-payment";
import type { PaymentSchedule } from "@/lib/payment-plan";
import { paymentRowTitle } from "@/lib/payment-plan-language";

const customErrorsEs: Record<string, string> = {
  "A custom payment is not available for this project balance.": "Este saldo no admite pagos de otro importe.",
  "Enter an amount greater than zero with up to two decimal places.": "Escribe un importe mayor que cero con un máximo de dos decimales.",
  "The amount cannot exceed the outstanding project balance.": "El importe no puede superar el saldo pendiente del proyecto.",
  "The payment schedule changed. Refresh before paying.": "El plan de pagos cambió. Actualiza la página antes de pagar.",
};

export function customPaymentErrorText(locale: CompanyLocale, error: string) {
  return locale === "es" ? customErrorsEs[error] ?? error : error;
}

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

export function CustomPaymentAmount({ input, onChange, preview, disabled = false, locale = "en" }: {
  input: string;
  onChange: (value: string) => void;
  preview: ReturnType<typeof previewCustomPayment>;
  disabled?: boolean;
  locale?: CompanyLocale;
}) {
  const spanish = locale === "es";
  return <div className="mt-4 space-y-3 rounded-lg border bg-slate-50 p-4">
    <label className="block space-y-1 text-sm font-medium">
      <span>{spanish ? "Importe del pago" : "Payment amount"}</span>
      <Input aria-label={spanish ? "Importe que deseas pagar" : "Custom payment amount"} type="number" inputMode="decimal" min="0.01" step="0.01"
        max={preview.maximum} value={input} disabled={disabled} onChange={event => onChange(event.target.value)} />
    </label>
    <p className="text-xs text-muted-foreground">
      {spanish ? "Saldo del proyecto: " : "Project balance: "}{formatMoney(preview.maximum)}.{" "}
      {spanish ? "Este importe excluye las comisiones de procesamiento, la entrega y los cargos adicionales que se cobran por separado." : "Processing fees, delivery and separate extra charges are not included in this amount."}
    </p>
    {input && preview.error && <p role="alert" className="text-sm text-amber-800">{customPaymentErrorText(locale, preview.error)}</p>}
    {preview.valid && <div aria-live="polite" className="overflow-x-auto rounded border bg-white">
      <table className="w-full text-sm">
        <caption className="p-3 text-left font-medium">{spanish ? "Cómo se aplicará este pago" : "How this payment will be applied"}</caption>
        <thead><tr className="border-b text-xs text-muted-foreground"><th className="px-3 py-2 text-left">{spanish ? "Cuota" : "Installment"}</th><th className="px-3 py-2 text-right">{spanish ? "Este pago" : "This payment"}</th><th className="px-3 py-2 text-right">{spanish ? "Saldo restante" : "Remaining"}</th></tr></thead>
        <tbody>{preview.allocations.map(({ row, amount, remaining }) => <tr key={row.sequence} className="border-b last:border-0">
          <td className="px-3 py-2">{paymentRowTitle(locale, row)}{amount === 0 && <span className="block text-xs text-muted-foreground">{spanish ? "Cubierta por pagos anteriores o crédito" : "Covered by prior payments or credit"}</span>}</td><td className="px-3 py-2 text-right">{formatMoney(amount)}</td><td className="px-3 py-2 text-right">{formatMoney(remaining)}</td>
        </tr>)}</tbody>
      </table>
    </div>}
    <p className="text-xs text-muted-foreground">{spanish ? "El importe se aplica a las cuotas pendientes en orden. Para completar una etapa del proyecto, debes cubrir su cuota en su totalidad." : "Applied to outstanding installments in order. A partial payment does not complete its project milestone."}</p>
  </div>;
}
