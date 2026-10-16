import type { DealerEarningsSummary } from "@/lib/dealer-earnings";
import { formatMoney, roundMoney } from "@/lib/formatters";

export function DealerEarningsSummaryCard({
  earnings,
  pendingChanges = false,
  label,
  serviceProfit,
}: {
  earnings?: DealerEarningsSummary | null;
  pendingChanges?: boolean;
  label?: string;
  serviceProfit?: number | null;
}) {
  const combined = serviceProfit !== undefined;
  const heading = label ?? (combined ? "Dealer Profit" : "Dealer material earnings");
  const amount = pendingChanges ? null : earnings?.amount;
  const pendingMessage = pendingChanges
    ? "Earnings update after changes are saved and approved."
    : earnings?.status === "PENDING_COST"
      ? "Earnings pending confirmation"
      : earnings?.status === "PENDING_REAL_COST"
        ? "Pending real factory cost"
        : "Earnings unavailable. Refresh the estimate to try again.";

  const total = amount != null && (!combined || serviceProfit != null)
    ? roundMoney(Number(amount) + (serviceProfit ?? 0)) : null;
  return (
    <section aria-label={heading} className="break-inside-avoid rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="text-sm font-semibold text-emerald-900">{heading}</h4>
        {total != null ? (
          <span className={`text-xl font-bold tabular-nums ${total < 0 ? "text-red-700" : "text-emerald-800"}`}>
            {formatMoney(total)}
          </span>
        ) : <span className="text-sm font-medium text-amber-800">{combined ? "Profit pending confirmation" : pendingMessage}</span>}
      </div>
      {combined && <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-2 text-sm text-emerald-900">
        <span>Material: <strong className={amount == null ? "text-amber-800" : Number(amount) < 0 ? "text-red-700" : undefined}>{amount == null ? "Pending" : formatMoney(Number(amount))}</strong></span>
        <span aria-hidden="true" className="text-emerald-700">+</span>
        <span>Installation &amp; services: <strong className={serviceProfit == null ? "text-amber-800" : serviceProfit < 0 ? "text-red-700" : undefined}>{serviceProfit == null ? "Pending" : formatMoney(serviceProfit)}</strong></span>
      </div>}
      {combined && amount == null && <p className="mt-2 text-xs text-amber-800">{pendingMessage}</p>}
      <p className="mt-2 text-xs text-emerald-800">{combined ? "Sales tax excluded. Installation & services shown before card processing fees." : "Sales tax, installation and services excluded."}</p>
    </section>
  );
}
