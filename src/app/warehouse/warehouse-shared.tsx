"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { WarehouseUnit, WarehouseMovement, CountInfo } from "@/app/api/warehouse.api";

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unable to complete this operation.";
export const movementLabels: Record<string, string> = {
  COLLECT: "Factory collection",
  RECEIVE: "Warehouse receipt",
  TRANSFER: "Store transfer / assignment",
  RELEASE: "Warehouse release",
  UNDO: "Reading reversed",
  PARTS: "Expected parts updated",
  ADJUST: "Inventory adjustment",
  COUNT: "Physical count reading",
  COUNT_UNDO: "Count reading reversed",
};
export const countLocation = (count: Pick<CountInfo, "scope" | "store">) =>
  count.scope === "STORE" ? count.store?.name ?? "Store" : count.scope === "UNASSIGNED" ? "Unassigned" : "All warehouse";
export const storeBreakdown = (unit: WarehouseUnit) => [
  ...unit.stores.map((s) => `${s.name}: ${s.onHand}`),
  ...(unit.unassigned > 0 ? [`Unassigned: ${unit.unassigned}`] : []),
].join(" · ");
export function MovementLocation({ movement: m }: { movement: WarehouseMovement }) {
  if (!m.fromStore && !m.toStore && !["RECEIVE", "RELEASE", "TRANSFER"].includes(m.type)) return null;
  let text: string;
  if (m.type === "TRANSFER" || (m.type === "UNDO" && m.onHandDelta === 0))
    text = `${m.fromStore?.name ?? "Unassigned"} → ${m.toStore?.name ?? "Unassigned"}`;
  else if (m.onHandDelta > 0) text = `To ${m.toStore?.name ?? "Unassigned"}`;
  else if (m.onHandDelta < 0) text = `From ${m.fromStore?.name ?? "Unassigned"}`;
  else text = m.toStore?.name ?? m.fromStore?.name ?? "";
  return <p className="text-sm text-muted-foreground">{m.quantity} {m.quantity === 1 ? "part" : "parts"} · {text}</p>;
}
export const dateLabel = (value: string) => new Date(value).toLocaleString();
export function Pagination({
  page,
  total,
  pageSize,
  onPage,
  disabled = false,
  label = "records",
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm text-muted-foreground">
      <span>
        {total.toLocaleString()} {label} · Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={disabled || page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={disabled || page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
export function UnitSummary({ unit }: { unit: WarehouseUnit }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold">
          {unit.mark || "No mark"} · {unit.product} {unit.configuration}
        </p>
        <p className="text-sm text-muted-foreground">
          {unit.customer} · Order{" "}
          {unit.orderId ? (
            <Link className="underline" href={`/orders/${unit.orderId}`}>
              #{unit.orderNumber}
            </Link>
          ) : (
            "—"
          )}
        </p>
        <p className="mt-1 font-mono text-sm">{unit.barcode}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Expected", unit.expectedParts ?? "Not set"],
          ["In transit", unit.inTransit],
          ["In warehouse", unit.onHand],
          ["Released", unit.released],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      {unit.onHand > 0 && <p className="text-sm text-muted-foreground">Locations · {storeBreakdown(unit)}</p>}
    </div>
  );
}
export function CountNotice({ id }: { id: number | null }) {
  if (!id) return null;
  return (
    <p
      role="status"
      className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      Physical count #{id} is open. Stock movements are paused.{" "}
      <Link
        href={`/warehouse/counts/${id}`}
        className="font-semibold underline"
      >
        Continue count
      </Link>
    </p>
  );
}
