import type {
  EstimateRevision,
  EstimateRevisionItem,
  EstimateRevisionPieceSnapshot,
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

function dimensions(snapshot: EstimateRevisionPieceSnapshot | null | undefined) {
  const input = snapshot?.pieceInput;
  const width = input?.width ?? snapshot?.width;
  const height = input?.height ?? snapshot?.height;
  const parts: string[] = [];
  if (width && height) parts.push(`${Number(width)} × ${Number(height)}`);
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
}: {
  revision: EstimateRevision;
  compact?: boolean;
}) {
  const changedItems = revision.items.filter(
    (item) => item.action !== "UNCHANGED",
  );
  const original = revision.originalTotals;
  const revised = revision.revisedTotals;

  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <strong className="text-sm">Estimate revision v{revision.version}</strong>
          <p className="text-xs text-muted-foreground">
            {statusMessage(revision)}
          </p>
        </div>
        <Badge variant="outline">{title(revision.status)}</Badge>
      </div>

      <div className="overflow-hidden rounded-md border bg-white text-sm">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
          <span>Material</span>
          <span>Original</span>
          <span>Revised</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-t px-3 py-2">
          <span>Units</span>
          <span>{original.units}</span>
          <strong>{revised.units}</strong>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-t px-3 py-2">
          <span>Subtotal</span>
          <span>{money(original.priceT)}</span>
          <strong>{money(revised.priceT)}</strong>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-t px-3 py-2">
          <span>Tax</span>
          <span>{money(original.taxAmount)}</span>
          <strong>{money(revised.taxAmount)}</strong>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-t px-3 py-2 font-semibold">
          <span>Material + tax</span>
          <span>{money(original.totalPayable)}</span>
          <span>{money(revised.totalPayable)}</span>
        </div>
      </div>

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
                <div key={item.id} className="rounded-md border bg-white p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>
                      {item.originalSnapshot.mark || `Piece #${item.originalPieceId}`} · Unit {item.sourceUnitIndex}
                    </strong>
                    <Badge variant={item.action === "REMOVE" ? "destructive" : "secondary"}>
                      {title(item.action)}
                    </Badge>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <span>Original: {originalName || "—"} · {dimensions(item.originalSnapshot)}</span>
                    <span>
                      Proposed: {item.action === "REMOVE" ? "Remove from Estimate" : `${proposedName(item) || "Configured Piece"} · ${dimensions({ pieceInput: item.proposedPieceInput ?? undefined })}`}
                    </span>
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
