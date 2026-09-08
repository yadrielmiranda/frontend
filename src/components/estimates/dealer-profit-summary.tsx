import { formatMoney, roundMoney } from "@/lib/formatters";

export function DealerProfitSummary({
  materialProfit,
  serviceProfit,
}: {
  materialProfit: number;
  serviceProfit: number;
}) {
  const projectProfit = roundMoney(materialProfit + serviceProfit);

  return (
    <section
      aria-label="Dealer Profit"
      className="break-inside-avoid rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="text-sm font-semibold text-emerald-900">
          Dealer Profit
        </h4>
        <span
          className={`text-xl font-bold tabular-nums ${projectProfit < 0 ? "text-red-700" : "text-emerald-800"}`}
        >
          {formatMoney(projectProfit)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-2 text-sm">
        <span className="text-emerald-900">
          Material:{" "}
          <strong className={materialProfit < 0 ? "text-red-700" : undefined}>
            {formatMoney(materialProfit)}
          </strong>
        </span>
        <span aria-hidden="true" className="text-emerald-700">
          +
        </span>
        <span className="text-emerald-900">
          Installation &amp; services:{" "}
          <strong className={serviceProfit < 0 ? "text-red-700" : undefined}>
            {formatMoney(serviceProfit)}
          </strong>
        </span>
      </div>
      <p className="mt-2 text-xs text-emerald-800">
        Sales tax excluded.
      </p>
    </section>
  );
}
