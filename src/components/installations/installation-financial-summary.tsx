import type { InstallationProcessingSummary, InstallationQuote } from "@/lib/types";
import { formatMoney } from "@/lib/formatters";

const money = (value: string | number) => formatMoney(Number(value));
const statuses: Record<InstallationProcessingSummary["status"], string> = {
  CONFIRMED: "Card fees confirmed",
  PENDING: "Card fees pending confirmation",
  REVIEW: "Payment allocation needs review",
  UNALLOCATED: "Some payments have no provider allocation",
  NONE: "No card collections recorded",
};

export function InstallationFinancialSummary({ quote, processing, userRole }: {
  quote: InstallationQuote;
  processing?: InstallationProcessingSummary | null;
  userRole: string;
}) {
  if (userRole !== "admin") return null;
  const provider = quote.providerCostSnapshot;
  return <section className="space-y-4 rounded-lg border p-4 text-sm">
    <div>
      <h3 className="font-semibold">Installation finances</h3>
      <p className="mt-1 text-xs text-muted-foreground">Quote amounts before customer discounts and dealer increases. Collected amounts below cover recorded card payments only.</p>
    </div>
    {provider ? <dl className="grid gap-3 sm:grid-cols-3">
      <div><dt className="text-muted-foreground">Provider cost</dt><dd className="mt-1 font-semibold">{money(provider.total)}</dd></div>
      <div><dt className="text-muted-foreground">Company gross margin</dt><dd className="mt-1 font-semibold">{money(Number(quote.total) - Number(provider.total))}</dd></div>
      <div><dt className="text-muted-foreground">Quote total</dt><dd className="mt-1 font-semibold">{money(quote.total)}</dd></div>
    </dl> : <p className="text-muted-foreground">Provider cost was not recorded for this quote.</p>}
    <div className="space-y-2 border-t pt-3">
      <h4 className="font-medium">Card collections to date</h4>
      <p className="text-xs text-muted-foreground">{processing ? statuses[processing.status] : "Card collection details unavailable"}</p>
      {processing && processing.status !== "NONE" && <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-sm">
          <thead className="text-xs text-muted-foreground"><tr>
            <th className="py-2 text-left">Share</th><th className="px-2 py-2 text-right">Collected principal</th>
            <th className="px-2 py-2 text-right">Card fee</th><th className="px-2 py-2 text-right">Collected surcharge</th>
            <th className="px-2 py-2 text-right">Net card cost</th><th className="py-2 text-right">Net collected</th>
          </tr></thead>
          <tbody>{([['provider', 'Provider'], ['company', 'Company'], ['dealer', 'Dealer']] as const).map(([key, label]) => {
            const values = processing[key];
            const confirmed = processing.status === "CONFIRMED";
            const confirmedMoney = (value: string | null) => confirmed && value != null ? money(value) : "Pending";
            return <tr key={key} className="border-t">
              <th scope="row" className="py-2 text-left font-medium">{label}</th>
              <td className="px-2 py-2 text-right">{confirmedMoney(values.collected)}</td>
              <td className="px-2 py-2 text-right">{confirmedMoney(values.processingFee)}</td>
              <td className="px-2 py-2 text-right">{confirmedMoney(values.surcharge)}</td>
              <td className="px-2 py-2 text-right">{confirmedMoney(values.netProcessingCost)}</td>
              <td className="py-2 text-right font-medium">{confirmedMoney(values.netCollected)}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
      <p className="text-xs text-muted-foreground">Amounts reflect recorded refunds. Net collected is collected principal minus the card fee after collected surcharges. This is not a record of provider payouts or final settlement.</p>
    </div>
  </section>;
}
