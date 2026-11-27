import type { ReactNode } from "react";
import type { CompanyLocale } from "@/components/company/company-content";
import type { InstallationLineOrigin, InstallationQuote, InstallationQuoteLine } from "@/lib/types";
import { formatMoney } from "@/lib/formatters";
import { titleCase } from "@/lib/installation-flow";

const unitMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);

const spanishOrigins: Record<InstallationLineOrigin, string> = {
  AUTO: "Automático",
  USER_SELECTED: "Seleccionado por el usuario",
  FIELD_ADDED: "Agregado en obra",
};

function measurements(line: InstallationQuoteLine, locale: CompanyLocale) {
  const spanish = locale === "es";
  const inches = spanish ? "pulg." : "in";
  const parts: string[] = [];
  if (line.widthIn != null) parts.push(`${spanish ? "Ancho" : "Width"} ${Number(line.widthIn)} ${inches}`);
  if (line.heightIn != null) parts.push(`${spanish ? "Altura" : "Height"} ${Number(line.heightIn)} ${inches}`);
  if (line.areaSqFt != null)
    parts.push(`${spanish ? "Área" : "Area"} ${Number(line.areaSqFt).toFixed(2)} ${spanish ? "pies²" : "sq ft"}`);
  if (line.panelCount != null) parts.push(spanish ? `Cantidad de paneles: ${line.panelCount}` : `${line.panelCount} panels`);
  if (line.lengthIn != null) parts.push(`${spanish ? "Longitud" : "Length"} ${Number(line.lengthIn)} ${inches}`);
  parts.push(`${spanish ? "Cantidad" : "Quantity"} ${line.occurrences}`);
  return parts.join(" · ");
}

export function InstallationQuoteTable({
  quote,
  showInternal = false,
  renderAction,
  locale = "en",
}: {
  quote: InstallationQuote;
  showInternal?: boolean;
  renderAction?: (line: InstallationQuoteLine) => ReactNode;
  locale?: CompanyLocale;
}) {
  const spanish = locale === "es";
  const additionalCharge = Number(
    quote.additionalInstallationCharge ??
      Math.max(
        0,
        Number(quote.total) - Number(quote.installationSurcharge ?? 0) -
          quote.lines.reduce(
            (sum, line) => sum + Number(line.adjustedAmount),
            0,
          ),
      ),
  );
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="p-3">{spanish ? "Servicio" : "Service"}</th>
            {showInternal && <th className="p-3">{spanish ? "Origen" : "Origin"}</th>}
            <th className="p-3 text-right">
              {showInternal
                ? (spanish ? "Tarifa del proveedor" : "Provider rate")
                : (spanish ? "Precio unitario" : "Unit Price")}
            </th>
            {showInternal && <th className="p-3 text-right">{spanish ? "Tarifa del perfil" : "Profile rate"}</th>}
            <th className="p-3 text-right">{spanish ? "Cantidad" : "Qty"}</th>
            <th className="p-3 text-right">Total</th>
            {renderAction && <th className="p-3" />}
          </tr>
        </thead>
        <tbody>
          {quote.lines.map((line) => (
            <tr key={line.id} className="border-t border-slate-200">
              <td className="p-3">
                <span className="font-medium">{line.serviceNameSnapshot}</span>
                {line.componentLabel && (
                  <span className="block text-xs text-muted-foreground">
                    {line.componentLabel}
                  </span>
                )}
                {showInternal && line.origin !== "AUTO" && (
                  <span className="block text-xs text-muted-foreground">
                    {measurements(line, locale)}
                  </span>
                )}
                {line.description && (
                  <span className="block text-xs text-muted-foreground">
                    {line.description}
                  </span>
                )}
              </td>
              {showInternal && (
                <td className="p-3">{spanish && line.origin ? spanishOrigins[line.origin] : titleCase(line.origin ?? "")}</td>
              )}
              <td className="p-3 text-right">
                {showInternal
                  ? unitMoney(Number(line.rate))
                  : unitMoney(
                      Number(
                        line.unitPrice ??
                          Number(line.adjustedAmount) /
                            Math.max(1, line.occurrences),
                      ),
                    )}
              </td>
              {showInternal && <td className="p-3 text-right">{line.saleRate != null ? unitMoney(Number(line.saleRate)) : "—"}</td>}
              <td className="p-3 text-right">
                {showInternal
                  ? `${Number(line.billableQuantity).toFixed(2)} × ${line.occurrences}`
                  : line.occurrences}
              </td>
              <td className="p-3 text-right font-medium">
                {formatMoney(Number(line.adjustedAmount))}
              </td>
              {renderAction && (
                <td className="p-3 text-right">{renderAction(line)}</td>
              )}
            </tr>
          ))}
          {!showInternal && additionalCharge >= 0.005 && (
            <tr className="border-t border-slate-200">
              <td className="p-3 font-medium">{spanish ? "Cargo por instalación" : "Installation charge"}</td>
              <td className="p-3 text-right">
                {formatMoney(additionalCharge)}
              </td>
              <td className="p-3 text-right">1</td>
              <td className="p-3 text-right font-medium">
                {formatMoney(additionalCharge)}
              </td>
              {renderAction && <td />}
            </tr>
          )}
          {!showInternal && Number(quote.installationSurcharge ?? 0) > 0 && (
            <tr className="border-t border-slate-200">
              <td className="p-3 font-medium">{spanish ? "Recargo por instalación" : "Installation surcharge"}</td>
              <td className="p-3 text-right">{formatMoney(Number(quote.installationSurcharge))}</td>
              <td className="p-3 text-right">1</td>
              <td className="p-3 text-right font-medium">{formatMoney(Number(quote.installationSurcharge))}</td>
              {renderAction && <td />}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
