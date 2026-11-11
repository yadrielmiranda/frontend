import Link from "next/link";

type PoNamed = {
  poName?: string | null;
  customer?: string | null;
  project?: string | null;
  customerName?: string | null;
  projectName?: string | null;
};
type Origin = PoNamed & { source: "ORDER" | "EXTERNAL"; orderNumber: string; orderId?: number | null };

export function poDisplayName(unit: PoNamed) {
  return [unit.poName, unit.customer, unit.customerName, unit.project, unit.projectName]
    .find(value => typeof value === "string" && value.trim())?.trim() ?? "";
}

export function PoName({ unit }: { unit: PoNamed }) {
  const name = poDisplayName(unit);
  return name ? <span className="break-words [overflow-wrap:anywhere]"> · {name}</span> : null;
}

export function unitOriginLabel(unit: Origin) {
  return unit.source === "EXTERNAL" ? "External PO" : unit.orderNumber ? `Order #${unit.orderNumber}` : "Order —";
}

export function UnitOrigin({ unit, link = false, showName = true }: { unit: Origin; link?: boolean; showName?: boolean }) {
  const origin = unit.source === "EXTERNAL"
    ? <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">External PO</span>
    : link && unit.orderId
    ? <Link className="font-medium underline" href={`/orders/${unit.orderId}`}>{unitOriginLabel(unit)}</Link>
    : <span>{unitOriginLabel(unit)}</span>;
  return <>{origin}{showName && <PoName unit={unit} />}</>;
}

export function ExternalDescription({ unit }: { unit: { source: "ORDER" | "EXTERNAL"; description: string; supplierName?: string } }) {
  if (unit.source !== "EXTERNAL" || !unit.description) return null;
  return <details className="mt-2 text-sm"><summary className="cursor-pointer text-muted-foreground">Factory description</summary>
    {unit.supplierName && <p className="mt-2 text-xs font-medium text-muted-foreground">{unit.supplierName}</p>}
    <p className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">{unit.description}</p>
  </details>;
}
