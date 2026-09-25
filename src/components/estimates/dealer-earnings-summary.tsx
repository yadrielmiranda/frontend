import type { DealerEarningsSummary } from "@/lib/dealer-earnings";
import { formatMoney } from "@/lib/formatters";

export function DealerEarningsSummaryCard({
  earnings,
  pendingChanges = false,
}: {
  earnings?: DealerEarningsSummary | null;
  pendingChanges?: boolean;
}) {
  const amount = pendingChanges ? null : earnings?.amount;
  const pendingMessage = pendingChanges
    ? "Earnings update after changes are saved and approved."
    : earnings?.status === "PENDING_REAL_COST"
      ? "Pending real factory cost"
      : "Earnings unavailable. Refresh the estimate to try again.";

  return (
    <section aria-label="Dealer material earnings" className="break-inside-avoid rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="text-sm font-semibold text-emerald-900">Dealer material earnings</h4>
        {amount != null ? (
          <span className={`text-xl font-bold tabular-nums ${Number(amount) < 0 ? "text-red-700" : "text-emerald-800"}`}>
            {formatMoney(Number(amount))}
          </span>
        ) : <span className="text-sm font-medium text-amber-800">{pendingMessage}</span>}
      </div>
      <p className="mt-2 text-xs text-emerald-800">Sales tax, installation and services excluded.</p>
    </section>
  );
}
