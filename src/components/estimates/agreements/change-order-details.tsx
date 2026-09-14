import type { ChangeOrderSummary } from "@/app/api/contracts.api";
import { formatMoney } from "@/lib/formatters";

const chargeAmount = (line: { amount: string | null } | null) =>
  !line
    ? "Not included"
    : line.amount == null
      ? "Pending"
      : formatMoney(Number(line.amount));

export function ChangeOrderDetails({ change }: { change: ChangeOrderSummary }) {
  return (
    <div className="space-y-4" aria-label="Change Order details">
      <p className="text-sm text-muted-foreground">
        Updates the charges in the previously signed agreement. The products
        and all other terms remain unchanged.
      </p>
      {change.items.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="p-3 text-left">
                  Charge
                </th>
                <th scope="col" className="p-3 text-right">
                  Previously accepted
                </th>
                <th scope="col" className="p-3 text-right">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {change.items.map((item, index) => (
                <tr key={index} className="border-t">
                  <th scope="row" className="p-3 text-left font-medium">
                    {item.description}
                  </th>
                  <td className="p-3 text-right">
                    {chargeAmount(item.before)}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {chargeAmount(item.after)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm">
          Charges updated: {change.changedCharges.join(", ")}.
        </p>
      )}
      <dl className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt>
            {change.previousIncomplete
              ? "Previous known total"
              : "Previous project total"}
          </dt>
          <dd>{formatMoney(Number(change.previousTotal))}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Adjustment to known total</dt>
          <dd>{formatMoney(Number(change.difference))}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-emerald-200 pt-2 text-base font-semibold">
          <dt>
            {change.newIncomplete
              ? "Updated known total"
              : "Updated project total"}
          </dt>
          <dd>{formatMoney(Number(change.newTotal))}</dd>
        </div>
      </dl>
      {change.newIncomplete && (
        <p className="text-sm text-muted-foreground">
          Charges marked Pending remain to be determined and are excluded from
          the known total.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Payments already made remain credited. This updated project total does
        not change when payments are due.
      </p>
    </div>
  );
}
