import type { ReactNode } from "react";
import type { CompanyLocale } from "@/components/company/company-content";
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

type RevisionLabel = EstimateRevision["status"] | EstimateRevisionItem["action"] | EstimateRevisionItem["reason"];
const spanishLabels: Record<RevisionLabel, string> = {
  DRAFT: "Borrador",
  PENDING_ADMIN_APPROVAL: "Pendiente de aprobación interna",
  PENDING_CUSTOMER_APPROVAL: "Pendiente de aprobación del cliente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  SUPERSEDED: "Sustituida",
  ADD: "Agregada",
  UNCHANGED: "Sin cambios",
  UPDATE: "Actualizada",
  REPLACE: "Reemplazada",
  REMOVE: "Eliminada",
  REMEASUREMENT: "Nueva medición",
  EGRESS: "Salida de emergencia",
  DIMENSION_LIMITS: "Límites de dimensiones",
  STRUCTURAL_CONDITION: "Condición estructural",
  CUSTOMER_REQUEST: "Solicitud del cliente",
  OTHER: "Otro",
};
export const estimateRevisionLabel = (value: RevisionLabel, locale: CompanyLocale) =>
  locale === "es" ? spanishLabels[value] : value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

function dimensions(
  snapshot: EstimateRevisionPieceSnapshot | null | undefined,
  locale: CompanyLocale,
) {
  const spanish = locale === "es";
  const inch = spanish ? "pulg." : "in";
  const input = snapshot?.pieceInput;
  const width = input?.width ?? snapshot?.width;
  const height = input?.height ?? snapshot?.height;
  const parts: string[] = [];
  if (width && height)
    parts.push(spanish ? `${Number(width)} de ancho × ${Number(height)} de alto (pulg.)` : `${Number(width)} W × ${Number(height)} H in`);
  else if (width) parts.push(`${Number(width)} ${inch}`);
  if (input?.heightLeft || input?.heightRight) {
    parts.push(
      `${spanish ? "Izq./der." : "L/R"} ${Number(input.heightLeft ?? 0)} / ${Number(input.heightRight ?? 0)}`,
    );
  }
  if (input?.sashHeight || input?.windowHeight) {
    parts.push(
      `${spanish ? "Hoja/ventana" : "Sash/window"} ${Number(input.sashHeight ?? 0)} / ${Number(input.windowHeight ?? 0)}`,
    );
  }
  if (input?.doorWidth || input?.doorHeight) {
    parts.push(
      `${spanish ? "Puerta" : "Door"} ${Number(input.doorWidth ?? 0)} × ${Number(input.doorHeight ?? 0)}`,
    );
  }
  if (input?.leftSideliteWidth || input?.rightSideliteWidth) {
    parts.push(
      `${spanish ? "Paneles laterales" : "Sidelites"} ${Number(input.leftSideliteWidth ?? 0)} / ${Number(input.rightSideliteWidth ?? 0)}`,
    );
  }
  if (input?.panelCount) parts.push(`${input.panelCount} ${spanish ? "paneles" : "panels"}`);
  if (input?.legHeight) parts.push(`${spanish ? "Altura del tramo vertical" : "Leg height"} ${Number(input.legHeight)} ${inch}`);
  if (input?.leftPanels != null || input?.rightPanels != null) {
    parts.push(`${spanish ? "Paneles izq./der." : "Panels L/R"} ${input.leftPanels ?? 0} / ${input.rightPanels ?? 0}`);
  }
  if (input?.horizontalHeights?.length) {
    parts.push(`${spanish ? "Alturas de los travesaños" : "Horizontal heights"} ${input.horizontalHeights.map(Number).join(' / ')} ${inch}`);
  }
  return parts.join(" · ") || "—";
}

function statusMessage(revision: EstimateRevision, locale: CompanyLocale) {
  const spanish = locale === "es";
  if (revision.status === "APPROVED") {
    return spanish ? "Se aplicaron los cambios aprobados a la cotización." : "Approved changes are now applied to the Estimate.";
  }
  if (revision.status === "REJECTED") {
    return spanish ? "Se rechazó la revisión. La cotización conserva sus datos anteriores." : "This revision was rejected and was not applied to the Estimate.";
  }
  if (revision.status === "SUPERSEDED") {
    return spanish ? "Una versión más reciente sustituyó esta revisión." : "This historical revision was replaced by a newer version.";
  }
  return spanish ? "Los cambios se aplicarán cuando el cliente los apruebe." : "The current Estimate remains unchanged until customer approval.";
}

function proposedName(item: EstimateRevisionItem) {
  const display = item.calculatedSnapshot?.display;
  return [display?.productName, display?.systemName, display?.configName]
    .filter(Boolean)
    .join(" · ");
}

export function EstimateRevisionSummary({
  revision,
  locale = "en",
  compact = false,
  showFinancials = true,
  comparison,
  action,
}: {
  revision: EstimateRevision;
  locale?: CompanyLocale;
  compact?: boolean;
  showFinancials?: boolean;
  comparison?: InstallationRevisionComparison | null;
  action?: ReactNode;
}) {
  const spanish = locale === "es";
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
          label: spanish ? "Unidades" : "Units",
          original: financialComparison.original.units,
          revised: financialComparison.revised.units,
        },
        {
          label: spanish ? "Subtotal de materiales" : "Material subtotal",
          original: amount(financialComparison.original.materialSubtotal),
          revised: amount(financialComparison.revised.materialSubtotal),
        },
        {
          label: spanish ? "Impuesto" : "Tax",
          original: amount(financialComparison.original.materialTax),
          revised: amount(financialComparison.revised.materialTax),
        },
        {
          label: spanish ? "Materiales con impuesto" : "Material + tax",
          original: amount(financialComparison.original.materialTotal),
          revised: amount(financialComparison.revised.materialTotal),
          strong: true,
        },
        {
          label: spanish ? "Instalación y servicios" : "Installation & services",
          original: amount(financialComparison.original.installationTotal),
          revised: amount(financialComparison.revised.installationTotal),
        },
        ...(Number(financialComparison.original.additionalCharges ?? 0) > 0 || Number(financialComparison.revised.additionalCharges ?? 0) > 0
          ? [{
              label: spanish ? "Cargos adicionales" : "Additional charges",
              original: amount(financialComparison.original.additionalCharges ?? "0"),
              revised: amount(financialComparison.revised.additionalCharges ?? "0"),
            }]
          : []),
        ...(financialComparison.includesPermit
          ? [
              {
                label: spanish ? "Gestión del permiso" : "Permit management",
                original: amount(financialComparison.original.permitFee),
                revised: amount(financialComparison.revised.permitFee),
              },
              {
                label: spanish ? "Tasa municipal" : "City Fee",
                original: financialComparison.cityFeePending
                  ? (spanish ? "Pendiente" : "Pending")
                  : amount(financialComparison.original.cityFee),
                revised: financialComparison.cityFeePending
                  ? (spanish ? "Pendiente" : "Pending")
                  : amount(financialComparison.revised.cityFee),
              },
            ]
          : []),
        {
          label: financialComparison.cityFeePending
            ? (spanish ? "Total conocido del proyecto" : "Known project total")
            : (spanish ? "Total del proyecto" : "Project total"),
          original: amount(financialComparison.original.projectTotal),
          revised: amount(financialComparison.revised.projectTotal),
          strong: true,
        },
      ]
    : [
        { label: spanish ? "Unidades" : "Units", original: original.units, revised: revised.units },
        {
          label: "Subtotal",
          original: money(original.priceT),
          revised: money(revised.priceT),
        },
        {
          label: spanish ? "Impuesto" : "Tax",
          original: money(original.taxAmount),
          revised: money(revised.taxAmount),
        },
        {
          label: spanish ? "Materiales con impuesto" : "Material + tax",
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
              ? (spanish ? "Cambios propuestos a la cotización" : "Proposed estimate changes")
              : (spanish ? `Revisión de la cotización v${revision.version}` : `Estimate revision v${revision.version}`)}
          </strong>
          <p className="text-xs text-muted-foreground">
            {statusMessage(revision, locale)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{estimateRevisionLabel(revision.status, locale)}</Badge>
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
                        ? (spanish ? "Tu costo" : "Your cost")
                        : (spanish ? "Proyecto" : "Project")
                      : "Material"}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Original
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    {spanish ? "Revisado" : "Revised"}
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
                ? (spanish ? "Aumento total" : "Total increase")
                : difference < 0
                  ? (spanish ? "Reducción total" : "Total decrease")
                  : (spanish ? "Total sin cambios" : "Total unchanged")}
              {" · "}
              {difference > 0 ? "+" : difference < 0 ? "−" : ""}
              {money(Math.abs(difference))}
            </p>
          )}
          {(financialComparison?.original.discountApplied ||
            financialComparison?.revised.discountApplied) && (
            <p className="text-xs text-muted-foreground">
              {spanish ? "Los totales incluyen los descuentos aplicables." : "Totals include applicable discounts."}
            </p>
          )}
          {financialComparison?.cityFeePending && (
            <p className="text-xs text-muted-foreground">
              {spanish ? "La tasa municipal está pendiente y se sumará cuando se conozca el importe." : "The City Fee is pending and is not included in either total."}
            </p>
          )}
          {financialComparison &&
            financialComparison.originalQuoteId == null && (
              <p className="text-xs text-muted-foreground">
                {spanish ? "Falta el importe original de instalación para calcular la diferencia entre los totales." : "The original installation amount is unavailable; a total difference cannot be calculated."}
              </p>
            )}
        </div>
      )}

      {!compact && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            {spanish ? "Cambios en las piezas" : "Piece changes"}
          </p>
          {changedItems.length === 0 ? (
            <p className="rounded-md border bg-white p-3 text-sm text-muted-foreground">
              {spanish ? "Se confirmaron las medidas. Todas las piezas conservan sus especificaciones." : "Measurements confirmed; no material Piece changed."}
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
                      {item.action === "ADD" ? item.proposedPieceInput?.mark || (spanish ? "Pieza nueva" : "New piece") : item.originalSnapshot.mark ||
                        `${spanish ? "Pieza" : "Piece"} #${item.originalPieceId}`}{" "}
                      · {spanish ? "Unidad" : "Unit"} {item.sourceUnitIndex}
                    </strong>
                    <Badge
                      variant={
                        item.action === "REMOVE" ? "destructive" : "secondary"
                      }
                    >
                      {estimateRevisionLabel(item.action, locale)}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="min-w-0 rounded-md bg-slate-50 p-3">
                      <p className="mb-1 text-xs font-semibold text-slate-600">
                        Original
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.action === "ADD" ? (spanish ? "Pieza agregada después de la cotización original" : "Not included in the original estimate") : originalName || "-"}
                      </p>
                      <p className="mt-1 font-medium">
                        {item.action === "ADD" ? "-" : dimensions(item.originalSnapshot, locale)}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-md bg-blue-50 p-3">
                      <p className="mb-1 text-xs font-semibold text-blue-700">
                        {spanish ? "Revisado" : "Revised"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.action === "REMOVE"
                          ? (spanish ? "Quitar de la cotización" : "Remove from Estimate")
                          : proposedName(item) || (spanish ? "Pieza configurada" : "Configured Piece")}
                      </p>
                      {item.action !== "REMOVE" && (
                        <p className="mt-1 font-medium">
                          {dimensions({
                            pieceInput: item.proposedPieceInput ?? undefined,
                          }, locale)}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs">
                    {spanish ? "Motivo:" : "Reason:"} {estimateRevisionLabel(item.reason, locale)}
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
