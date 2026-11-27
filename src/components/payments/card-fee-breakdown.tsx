import type { CardPaymentBreakdown } from "@/lib/card-payment";
import type { CompanyLocale } from "@/components/company/company-content";
import { formatCardFeePercent } from "@/lib/card-payment";
import { formatMoney } from "@/lib/formatters";

export function CardFeeBreakdown({
  breakdown,
  className = "",
  locale = "en",
}: {
  breakdown: CardPaymentBreakdown;
  className?: string;
  locale?: CompanyLocale;
}) {
  if (breakdown.surchargeAmount <= 0) return null;
  const spanish = locale === "es";

  return (
    <div
      className={`rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        <span>{spanish ? "Importe del pago" : "Payment amount"}</span>
        <span className="font-medium text-slate-800">
          {formatMoney(breakdown.baseAmount)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-4">
        <span>
          {spanish ? "Comisión de procesamiento" : "Processing fee"} (
          {formatCardFeePercent(breakdown.surchargePercent)}% ×{" "}
          {formatMoney(breakdown.baseAmount)})
        </span>
        <span className="font-medium text-slate-800">
          {formatMoney(breakdown.surchargeAmount)}
        </span>
      </div>
      <p className="mt-2 border-t border-slate-200 pt-2 text-left text-[11px] leading-relaxed text-slate-500">
        {spanish ? "Esta comisión se calcula sobre el importe del pago y solo se aplica si pagas con tarjeta." : "This fee applies only to card checkout and is calculated on the payment amount."}
      </p>
    </div>
  );
}
