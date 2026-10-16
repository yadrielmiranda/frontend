import { formatMoney } from "@/lib/formatters";
import type { NetworkProfitBreakdown, ProfitAmount } from "@/lib/network-profit-breakdown";

const levelLabels = {
  DISTRIBUTOR: "Distributor",
  SUBDEALER: "Subdealer",
  DEALER: "Dealer",
};

function ProfitValue({ value, pendingChanges }: { value: ProfitAmount; pendingChanges: boolean }) {
  const amount = value.amount == null ? null : Number(value.amount);
  if (pendingChanges || value.status !== "CALCULATED" || amount == null || !Number.isFinite(amount)) {
    const label = pendingChanges ? "Pending update"
      : value.status === "PENDING_REAL_COST" ? "Pending real cost"
        : value.status === "PENDING_REVIEW" ? "Pending review" : "Pending confirmation";
    return <span className="text-xs font-medium text-amber-800">{label}</span>;
  }
  return <span className={`font-semibold tabular-nums ${amount < 0 ? "text-red-700" : "text-emerald-900"}`}>{formatMoney(amount)}</span>;
}

export function NetworkProfitBreakdownCard({
  breakdown,
  isAdmin,
  pendingChanges = false,
}: {
  breakdown?: NetworkProfitBreakdown | null;
  isAdmin: boolean;
  pendingChanges?: boolean;
}) {
  // A report payload must never enable this section for another role or report view.
  if (!isAdmin || !breakdown) return null;

  return (
    <section aria-label="Profit by participant" className="overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50/50">
      <div className="border-b border-emerald-200 px-4 py-3">
        <h4 className="text-sm font-semibold text-emerald-950">Profit by participant</h4>
        {pendingChanges && <p className="mt-1 text-xs text-amber-800">Profits update after changes are saved and approved.</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-emerald-50 text-xs text-emerald-900">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-medium">Participant</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Material</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Installation &amp; services</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.members.map((member) => (
              <tr key={member.userId} className="break-inside-avoid border-t border-emerald-100">
                <th scope="row" className="px-4 py-3 text-left font-normal">
                  <span className="block font-semibold text-slate-900">{levelLabels[member.level]}</span>
                  <span className="block break-words text-xs text-slate-600">{member.username}</span>
                </th>
                <td className="px-4 py-3 text-right"><ProfitValue value={member.material} pendingChanges={pendingChanges} /></td>
                <td className="px-4 py-3 text-right"><ProfitValue value={member.services} pendingChanges={pendingChanges} /></td>
                <td className="px-4 py-3 text-right"><ProfitValue value={member.total} pendingChanges={pendingChanges} /></td>
              </tr>
            ))}
            <tr className="break-inside-avoid border-t border-emerald-200 bg-emerald-100/50">
              <th scope="row" className="px-4 py-3 text-left font-semibold text-emerald-950">Company <span className="font-normal">(estimated)</span></th>
              <td className="px-4 py-3 text-right"><ProfitValue value={breakdown.company.materialExpected} pendingChanges={pendingChanges} /></td>
              <td className="px-4 py-3 text-right"><ProfitValue value={breakdown.company.installation} pendingChanges={pendingChanges} /></td>
              <td className="px-4 py-3 text-right"><ProfitValue value={breakdown.company.expectedTotal} pendingChanges={pendingChanges} /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="space-y-1 border-t border-emerald-200 px-4 py-3 text-xs text-emerald-900">
        <p>Sales tax excluded. Installation &amp; services shown before card processing fees.</p>
        <p>Company totals include material and installation margin; other service margins are not included.</p>
      </div>
    </section>
  );
}
