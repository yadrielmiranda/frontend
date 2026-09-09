import type { ReactNode } from "react";
import type { InstallationQuote, InstallationQuoteLine } from "@/lib/types";
import { formatMoney } from "@/lib/formatters";
import { titleCase } from "@/lib/installation-flow";

const unitMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);

function measurements(line: InstallationQuoteLine) {
  const parts: string[] = [];
  if (line.widthIn != null) parts.push(`Width ${Number(line.widthIn)} in`);
  if (line.heightIn != null) parts.push(`Height ${Number(line.heightIn)} in`);
  if (line.areaSqFt != null)
    parts.push(`Area ${Number(line.areaSqFt).toFixed(2)} sq ft`);
  if (line.panelCount != null) parts.push(`${line.panelCount} panels`);
  if (line.lengthIn != null) parts.push(`Length ${Number(line.lengthIn)} in`);
  parts.push(`Quantity ${line.occurrences}`);
  return parts.join(" · ");
}

export function InstallationQuoteTable({
  quote,
  showInternal = false,
  renderAction,
}: {
  quote: InstallationQuote;
  showInternal?: boolean;
  renderAction?: (line: InstallationQuoteLine) => ReactNode;
}) {
  const additionalCharge = Number(
    quote.additionalInstallationCharge ??
      Math.max(
        0,
        Number(quote.total) -
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
            <th className="p-3">Service</th>
            {showInternal && <th className="p-3">Origin</th>}
            <th className="p-3 text-right">
              {showInternal ? "Rate" : "Unit Price"}
            </th>
            <th className="p-3 text-right">Qty</th>
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
                    {measurements(line)}
                  </span>
                )}
                {line.description && (
                  <span className="block text-xs text-muted-foreground">
                    {line.description}
                  </span>
                )}
              </td>
              {showInternal && (
                <td className="p-3">{titleCase(line.origin ?? "")}</td>
              )}
              <td className="p-3 text-right">
                {showInternal
                  ? formatMoney(Number(line.rate))
                  : unitMoney(
                      Number(
                        line.unitPrice ??
                          Number(line.adjustedAmount) /
                            Math.max(1, line.occurrences),
                      ),
                    )}
              </td>
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
              <td className="p-3 font-medium">Installation charge</td>
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
        </tbody>
      </table>
    </div>
  );
}
