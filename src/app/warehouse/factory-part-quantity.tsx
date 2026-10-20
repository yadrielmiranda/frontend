"use client";
import type { FactoryPartCounts, FactoryPartTracking } from "@/app/api/warehouse.api";
import { Input } from "@/components/ui/input";
import { displayedFactoryParts, factoryPartLabel, factoryPartSource, factoryPartsTotal, factoryPartTypes } from "./factory-parts";

export function FactoryPartQuantity({ tracking, source, storeId, quantity, parts, disabled, label, max, onChange }: {
  tracking?: FactoryPartTracking; source: "TRANSIT" | "WAREHOUSE"; storeId: string;
  quantity: string; parts?: FactoryPartCounts; disabled?: boolean; label: string; max: number;
  onChange: (value: { quantity: string; parts?: FactoryPartCounts }) => void;
}) {
  const available = factoryPartSource(tracking, source, storeId);
  if (!available || (!tracking?.types.includes("FRAME") && factoryPartTypes.filter(type => (available[type] ?? 0) > 0).length < 2))
    return <Input className="w-24" aria-label={label} type="number" min={1} max={Math.min(max, 200)} step={1}
      value={quantity} disabled={disabled} onChange={event => onChange({ quantity: event.target.value })} />;
  const selected = displayedFactoryParts(available, Number(quantity), parts);
  const types = factoryPartTypes.filter(type => tracking?.types.includes(type as "DOOR" | "FRAME" | "WINDOW") || (available[type] ?? 0) > 0);
  return <div className="space-y-2" role="group" aria-label={label}>
    {types.map(type => {
      const limit = type === "UNKNOWN" ? available.UNKNOWN ?? 0 : Math.min(tracking?.expected[type] ?? 200, (available[type] ?? 0) + (available.UNKNOWN ?? 0));
      return <label key={type} className="flex items-center justify-between gap-3 text-xs">
      <span>{factoryPartLabel[type]} <span className="text-muted-foreground">({limit} available)</span></span>
      <Input className="w-20" type="number" min={0} max={limit} step={1}
        aria-label={`${factoryPartLabel[type]} — ${label}`} value={selected[type] ?? 0} disabled={disabled || (!limit && !(selected[type] ?? 0))}
        onChange={event => {
          const next = { ...selected, [type]: event.target.value === "" ? 0 : Number(event.target.value) };
          onChange({ quantity: String(factoryPartsTotal(next)), parts: next });
        }} />
    </label>})}
    {(available.UNKNOWN ?? 0) > 0 && <p className="max-w-xs text-xs text-muted-foreground">Earlier parts share one quantity. Select their type only when you can identify the physical parts, and reduce the earlier-parts quantity accordingly.</p>}
    <p className="text-xs text-muted-foreground">{factoryPartsTotal(selected)} physical parts selected</p>
  </div>;
}

export function FactoryPartProgress({ tracking }: { tracking?: FactoryPartTracking }) {
  if (!tracking?.types.includes("FRAME")) return null;
  const unknown = (tracking.inTransit.UNKNOWN ?? 0) + (tracking.onHand.UNKNOWN ?? 0) + (tracking.released.UNKNOWN ?? 0);
  return <div className="mt-2 space-y-1 text-sm">
    {tracking.types.map(type => {
      const total = (tracking.inTransit[type] ?? 0) + (tracking.onHand[type] ?? 0) + (tracking.released[type] ?? 0);
      const expected = tracking.expected[type] ?? 0;
      return <p key={type}>{factoryPartLabel[type]}: <b>{total} / {expected}</b>{!unknown && total < expected ? ` · ${expected - total} still at factory` : ""}</p>;
    })}
    {unknown > 0 && <p className="text-xs text-muted-foreground">{unknown} earlier parts have no recorded type. Their quantities are preserved.</p>}
  </div>;
}
