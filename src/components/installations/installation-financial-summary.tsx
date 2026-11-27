import type { InstallationProcessingSummary, InstallationQuote } from "@/lib/types";
import type { CompanyLocale } from "@/components/company/company-content";
import { formatMoney } from "@/lib/formatters";

const money = (value: string | number) => formatMoney(Number(value));
const statuses: Record<InstallationProcessingSummary["status"], [string, string]> = {
  CONFIRMED: ["Card fees confirmed", "Comisiones por pago con tarjeta confirmadas"],
  PENDING: ["Card fees pending confirmation", "Comisiones por pago con tarjeta pendientes de confirmación"],
  REVIEW: ["Payment allocation needs review", "Es necesario revisar la distribución de los pagos"],
  UNALLOCATED: ["Some payments have no provider allocation", "Hay pagos sin un importe asignado al proveedor"],
  NONE: ["No card collections recorded", "Aún no hay cobros con tarjeta registrados"],
};

export function InstallationFinancialSummary({ quote, processing, userRole, locale = "en" }: {
  quote: InstallationQuote;
  processing?: InstallationProcessingSummary | null;
  userRole: string;
  locale?: CompanyLocale;
}) {
  if (userRole !== "admin") return null;
  const t = (en: string, es: string) => locale === "es" ? es : en;
  const provider = quote.providerCostSnapshot;
  return <section className="space-y-4 rounded-lg border p-4 text-sm">
    <div>
      <h3 className="font-semibold">{t("Installation finances", "Resumen financiero de la instalación")}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t("Quote amounts before customer discounts and dealer increases. Collected amounts below cover recorded card payments only.", "Los importes de la cotización se muestran antes de los descuentos al cliente y los aumentos del distribuidor. Los cobros corresponden a los pagos con tarjeta registrados.")}</p>
    </div>
    {provider ? <dl className="grid gap-3 sm:grid-cols-3">
      <div><dt className="text-muted-foreground">{t("Provider cost", "Costo del proveedor")}</dt><dd className="mt-1 font-semibold">{money(provider.total)}</dd></div>
      <div><dt className="text-muted-foreground">{t("Company gross margin", "Margen bruto de la empresa")}</dt><dd className="mt-1 font-semibold">{money(Number(quote.total) - Number(provider.total))}</dd></div>
      <div><dt className="text-muted-foreground">{t("Quote total", "Total de la cotización")}</dt><dd className="mt-1 font-semibold">{money(quote.total)}</dd></div>
    </dl> : <p className="text-muted-foreground">{t("Provider cost was not recorded for this quote.", "Esta cotización no tiene un costo de proveedor registrado.")}</p>}
    <div className="space-y-2 border-t pt-3">
      <h4 className="font-medium">{t("Card collections to date", "Cobros con tarjeta hasta la fecha")}</h4>
      <p className="text-xs text-muted-foreground">{processing ? t(...statuses[processing.status]) : t("Card collection details unavailable", "El detalle de los cobros con tarjeta no está disponible")}</p>
      {processing && processing.status !== "NONE" && <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-sm">
          <thead className="text-xs text-muted-foreground"><tr>
            <th className="py-2 text-left">{t("Share", "Participación")}</th><th className="px-2 py-2 text-right">{t("Collected principal", "Importe base cobrado")}</th>
            <th className="px-2 py-2 text-right">{t("Card fee", "Comisión por tarjeta")}</th><th className="px-2 py-2 text-right">{t("Collected surcharge", "Recargo cobrado")}</th>
            <th className="px-2 py-2 text-right">{t("Net card cost", "Costo neto por tarjeta")}</th><th className="py-2 text-right">{t("Net collected", "Cobro neto")}</th>
          </tr></thead>
          <tbody>{([['provider', t("Provider", "Proveedor")], ['company', t("Company", "Empresa")], ['dealer', t("Dealer", "Distribuidor")]] as const).map(([key, label]) => {
            const values = processing[key];
            const confirmed = processing.status === "CONFIRMED";
            const confirmedMoney = (value: string | null) => confirmed && value != null ? money(value) : t("Pending", "Pendiente");
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
      <p className="text-xs text-muted-foreground">{t("Amounts reflect recorded refunds. Net collected is collected principal minus the card fee after collected surcharges. This is not a record of provider payouts or final settlement.", "Los importes reflejan los reembolsos registrados. Para obtener el cobro neto, al importe base cobrado se le restan las comisiones por tarjeta y se le suman los recargos cobrados. Este resumen excluye los pagos al proveedor y la liquidación final.")}</p>
    </div>
  </section>;
}
