import type { ReactNode } from "react";
import type {
  EstimateRevision,
  EstimateRevisionItem,
  EstimateRevisionPieceSnapshot,
  InstallationRevisionComparison,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const money = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0));

const title = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

function dimensions(
  snapshot: EstimateRevisionPieceSnapshot | null | undefined,
) {
  const input = snapshot?.pieceInput;
  const width = input?.width ?? snapshot?.width;
  const height = input?.height ?? snapshot?.height;
  const parts: string[] = [];
  if (width && height)
    parts.push(`${Number(width)} W × ${Number(height)} H in`);
  else if (width) parts.push(`${Number(width)} in`);
  if (input?.heightLeft || input?.heightRight) {
    parts.push(
      `L/R ${Number(input.heightLeft ?? 0)} / ${Number(input.heightRight ?? 0)}`,
    );
  }
  if (input?.sashHeight || input?.windowHeight) {
    parts.push(
      `Sash/window ${Number(input.sashHeight ?? 0)} / ${Number(input.windowHeight ?? 0)}`,
    );
  }
  if (input?.doorWidth || input?.doorHeight) {
    parts.push(
      `Door ${Number(input.doorWidth ?? 0)} × ${Number(input.doorHeight ?? 0)}`,
    );
  }
  if (input?.leftSideliteWidth || input?.rightSideliteWidth) {
    parts.push(
      `Sidelites ${Number(input.leftSideliteWidth ?? 0)} / ${Number(input.rightSideliteWidth ?? 0)}`,
    );
  }
  if (input?.panelCount) parts.push(`${input.panelCount} panels`);
  if (input?.legHeight) parts.push(`Leg height ${Number(input.legHeight)} in`);
  if (input?.leftPanels != null || input?.rightPanels != null) {
    parts.push(`Panels L/R ${input.leftPanels ?? 0} / ${input.rightPanels ?? 0}`);
  }
  if (input?.horizontalHeights?.length) {
    parts.push(`Horizontal heights ${input.horizontalHeights.map(Number).join(' / ')} in`);
  }
  return parts.join(" · ") || "—";
}

function statusMessage(revision: EstimateRevision) {
  if (revision.status === "APPROVED") {
    return "Approved changes are now applied to the Estimate.";
  }
  if (revision.status === "REJECTED") {
    return "This revision was rejected and was not applied to the Estimate.";
  }
  if (revision.status === "SUPERSEDED") {
    return "This historical revision was replaced by a newer version.";
  }
  return "The current Estimate remains unchanged until customer approval.";
}

function proposedName(item: EstimateRevisionItem) {
  const display = item.calculatedSnapshot?.display;
  return [display?.productName, display?.systemName, display?.configName]
    .filter(Boolean)
    .join(" · ");
}

export function EstimateRevisionSummary({
  revision,
  compact = false,
  showFinancials = true,
  comparison,
  action,
}: {
  revision: EstimateRevision;
  compact?: boolean;
  showFinancials?: boolean;
  comparison?: InstallationRevisionComparison | null;
  action?: ReactNode;
}) {
  const changedItems = revision.items.filter(
    (item) => item.action !== "UNCHANGED",
  );
  const original = revision.originalTotals;
  const revised = revision.revisedTotals;
  const financialComparison =
    comparison?.revisionId === revision.id ? comparison : null;
  const amount = (value: string | null) => (value == null ? "—" : money(value));
  const rows = financialComparison
    ? [
        {
          label: "Units",
          original: financialComparison.original.units,
          revised: financialComparison.revised.units,
        },
        {
          label: "Material subtotal",
          original: amount(financialComparison.original.materialSubtotal),
          revised: amount(financialComparison.revised.materialSubtotal),
        },
        {
          label: "Tax",
          original: amount(financialComparison.original.materialTax),
          revised: amount(financialComparison.revised.materialTax),
        },
        {
          label: "Material + tax",
          original: amount(financialComparison.original.materialTotal),
          revised: amount(financialComparison.revised.materialTotal),
          strong: true,
        },
        {
          label: "Installation & services",
          original: amount(financialComparison.original.installationTotal),
          revised: amount(financialComparison.revised.installationTotal),
        },
        ...(financialComparison.includesPermit
          ? [
              {
                label: "Permit management",
                original: amount(financialComparison.original.permitFee),
                revised: amount(financialComparison.revised.permitFee),
              },
              {
                label: "City Fee",
                original: financialComparison.cityFeePending
                  ? "Pending"
                  : amount(financialComparison.original.cityFee),
                revised: financialComparison.cityFeePending
                  ? "Pending"
                  : amount(financialComparison.revised.cityFee),
              },
            ]
          : []),
        {
          label: financialComparison.cityFeePending
            ? "Known project total"
            : "Project total",
          original: amount(financialComparison.original.projectTotal),
          revised: amount(financialComparison.revised.projectTotal),
          strong: true,
        },
      ]
    : [
        { label: "Units", original: original.units, revised: revised.units },
        {
          label: "Subtotal",
          original: money(original.priceT),
          revised: money(revised.priceT),
        },
        {
          label: "Tax",
          original: money(original.taxAmount),
          revised: money(revised.taxAmount),
        },
        {
          label: "Material + tax",
          original: money(original.totalPayable),
          revised: money(revised.totalPayable),
          strong: true,
        },
      ];
  const difference =
    financialComparison?.difference == null
      ? null
      : Number(financialComparison.difference);

  return (
    <div className="min-w-0 space-y-3 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <strong className="text-sm">
            {revision.status === "DRAFT"
              ? "Proposed estimate changes"
              : `Estimate revision v${revision.version}`}
          </strong>
          <p className="text-xs text-muted-foreground">
            {statusMessage(revision)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{title(revision.status)}</Badge>
          {action}
        </div>
      </div>

      {showFinancials && (
        <div className="space-y-2">
          <div className="overflow-x-auto rounded-md border bg-white">
            <table className="w-full min-w-[360px] table-fixed text-sm">
              <colgroup>
                <col className="w-[44%]" />
                <col className="w-[28%]" />
                <col className="w-[28%]" />
              </colgroup>
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left">
                    {financialComparison
                      ? financialComparison.accountCost
                        ? "Your cost"
                        : "Project"
                      : "Material"}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Original
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Revised
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.label}
                    className={`border-t ${row.strong ? "bg-slate-50/50 font-semibold" : ""}`}
                  >
                    <th
                      scope="row"
                      className={`px-3 py-2 text-left ${row.strong ? "font-semibold" : "font-normal"}`}
                    >
                      {row.label}
                    </th>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {row.original}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                      {row.revised}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {difference !== null && (
            <p
              className={`text-right text-sm font-semibold ${difference > 0 ? "text-red-700" : difference < 0 ? "text-emerald-700" : "text-slate-700"}`}
            >
              {difference > 0
                ? "Total increase"
                : difference < 0
                  ? "Total decrease"
                  : "Total unchanged"}
              {" · "}
              {difference > 0 ? "+" : difference < 0 ? "−" : ""}
              {money(Math.abs(difference))}
            </p>
          )}
          {(financialComparison?.original.discountApplied ||
            financialComparison?.revised.discountApplied) && (
            <p className="text-xs text-muted-foreground">
              Totals include applicable discounts.
            </p>
          )}
          {financialComparison?.cityFeePending && (
            <p className="text-xs text-muted-foreground">
              The City Fee is pending and is not included in either total.
            </p>
          )}
          {financialComparison &&
            financialComparison.originalQuoteId == null && (
              <p className="text-xs text-muted-foreground">
                The original installation amount is unavailable; a total
                difference cannot be calculated.
              </p>
            )}
        </div>
      )}

      {!compact && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Piece changes
          </p>
          {changedItems.length === 0 ? (
            <p className="rounded-md border bg-white p-3 text-sm text-muted-foreground">
              Measurements confirmed; no material Piece changed.
            </p>
          ) : (
            changedItems.map((item) => {
              const originalName = [
                item.originalSnapshot.productName,
                item.originalSnapshot.systemName,
                item.originalSnapshot.configName,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <div
                  key={item.id}
                  className="rounded-md border bg-white p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>
                      {item.action === "ADD" ? item.proposedPieceInput?.mark || "New piece" : item.originalSnapshot.mark ||
                        `Piece #${item.originalPieceId}`}{" "}
                      · Unit {item.sourceUnitIndex}
                    </strong>
                    <Badge
                      variant={
                        item.action === "REMOVE" ? "destructive" : "secondary"
                      }
                    >
                      {title(item.action)}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="min-w-0 rounded-md bg-slate-50 p-3">
                      <p className="mb-1 text-xs font-semibold text-slate-600">
                        Original
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.action === "ADD" ? "Not included in the original estimate" : originalName || "—"}
                      </p>
                      <p className="mt-1 font-medium">
                        {item.action === "ADD" ? "—" : dimensions(item.originalSnapshot)}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-md bg-blue-50 p-3">
                      <p className="mb-1 text-xs font-semibold text-blue-700">
                        Revised
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.action === "REMOVE"
                          ? "Remove from Estimate"
                          : proposedName(item) || "Configured Piece"}
                      </p>
                      {item.action !== "REMOVE" && (
                        <p className="mt-1 font-medium">
                          {dimensions({
                            pieceInput: item.proposedPieceInput ?? undefined,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs">
                    Reason: {title(item.reason)}
                    {item.reasonNote ? ` — ${item.reasonNote}` : ""}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
