import Link from "next/link";

type Origin = { source: "ORDER" | "EXTERNAL"; orderNumber: string; orderId?: number | null };

export function unitOriginLabel(unit: Origin) {
  return unit.source === "EXTERNAL" ? "External PO" : unit.orderNumber ? `Order #${unit.orderNumber}` : "Order —";
}

export function UnitOrigin({ unit, link = false }: { unit: Origin; link?: boolean }) {
  if (unit.source === "EXTERNAL") return <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">External PO</span>;
  return link && unit.orderId
    ? <Link className="font-medium underline" href={`/orders/${unit.orderId}`}>{unitOriginLabel(unit)}</Link>
    : <span>{unitOriginLabel(unit)}</span>;
}

export function ExternalDescription({ unit }: { unit: { source: "ORDER" | "EXTERNAL"; description: string; supplierName?: string } }) {
  if (unit.source !== "EXTERNAL" || !unit.description) return null;
  return <details className="mt-2 text-sm"><summary className="cursor-pointer text-muted-foreground">Factory description</summary>
    {unit.supplierName && <p className="mt-2 text-xs font-medium text-muted-foreground">{unit.supplierName}</p>}
    <p className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">{unit.description}</p>
  </details>;
}
