import { formatMoney, roundMoney } from "@/lib/formatters";

type MoneyFormatter = (amount: number) => string;

export function OriginalPrice({
  amount,
  formatValue = formatMoney,
  className = "",
  label = "Before promotion",
}: {
  amount: number;
  formatValue?: MoneyFormatter;
  className?: string;
  label?: string;
}) {
  return (
    <s
      className={`whitespace-nowrap font-normal text-red-600 decoration-red-600 ${className}`}
    >
      <span className="sr-only">{label}: </span>
      {formatValue(amount)}
    </s>
  );
}

export function PromotionPrice({
  amount,
  originalAmount,
  formatValue = formatMoney,
  align = "right",
}: {
  amount: number;
  originalAmount?: number | null;
  formatValue?: MoneyFormatter;
  align?: "left" | "center" | "right";
}) {
  // Solo se compara lo ya calculado; los precios y sus impuestos no se recalculan.
  const discounted =
    originalAmount != null &&
    Number.isFinite(originalAmount) &&
    Number.isFinite(amount) &&
    roundMoney(originalAmount) > roundMoney(amount);

  if (!discounted) return <>{formatValue(amount)}</>;

  const alignment =
    align === "center"
      ? "items-center"
      : align === "left"
        ? "items-start"
        : "items-end";

  return (
    <span
      className={`inline-flex max-w-full flex-col gap-0.5 align-middle leading-snug ${alignment}`}
    >
      <OriginalPrice
        amount={originalAmount!}
        formatValue={formatValue}
        className="text-xs"
      />
      <span className="whitespace-nowrap font-semibold text-emerald-700">
        <span className="sr-only">After promotion: </span>
        {formatValue(amount)}
      </span>
    </span>
  );
}
