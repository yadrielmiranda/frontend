"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { warehouseRequestKey, warehouseTransfer, type WarehouseStore, type WarehouseUnit, type ScanResult, type FactoryPartCounts } from "@/app/api/warehouse.api";
import { StoreSelect } from "./store-select";
import { errorMessage } from "./warehouse-shared";
import { FactoryPartQuantity } from "./factory-part-quantity";
import { factoryPartSource, selectedFactoryParts } from "./factory-parts";

export function TransferForm({ unit, stores, disabled, onSaved, onPendingChange }: {
  unit: WarehouseUnit;
  stores: WarehouseStore[];
  disabled?: boolean;
  onSaved: (result: ScanResult) => void;
  onPendingChange: (busy: boolean) => void;
}) {
  const [from, setFrom] = useState(""), [to, setTo] = useState(""), [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [parts, setParts] = useState<FactoryPartCounts | undefined>();
  const lock = useRef(false), request = useRef<{ signature: string; key: string } | null>(null);
  const available = from === "unassigned" ? unit.unassigned : unit.stores.find((s) => String(s.id) === from)?.onHand ?? 0;
  const destination = stores.find((s) => s.isActive && String(s.id) === to && to !== from);
  let selected: FactoryPartCounts | undefined, partsValid = true;
  try { selected = selectedFactoryParts(factoryPartSource(unit.partTracking, "WAREHOUSE", from), Number(quantity), parts); } catch { partsValid = false; }
  const valid = from && destination && Number.isInteger(Number(quantity)) && Number(quantity) > 0 && Number(quantity) <= available && partsValid;
  async function transfer() {
    if (!valid || !destination || lock.current) return;
    lock.current = true; setBusy(true); onPendingChange(true); setError("");
    const fromId = from === "unassigned" ? null : Number(from);
    const signature = JSON.stringify([unit.lineNumber, unit.version, fromId, destination.id, Number(quantity), selected]);
    if (request.current?.signature !== signature) request.current = { signature, key: warehouseRequestKey() };
    try {
      const result = await warehouseTransfer(unit, fromId, destination.id, Number(quantity), request.current!.key, selected);
      onSaved(result);
    } catch (e) { setError(errorMessage(e)); }
    finally { lock.current = false; setBusy(false); onPendingChange(false); }
  }
  if (unit.onHand === 0) return null;
  return (
    <section className="space-y-3 rounded-xl border p-4">
      <h3 className="font-semibold">Assign / transfer parts</h3>
      <p className="text-xs text-muted-foreground">Move existing parts between stores, or assign Unassigned stock. This does not receive new stock or change the warehouse total.</p>
      <div className="space-y-2">
        <p className="text-sm font-medium">From</p>
        <StoreSelect stores={unit.stores} value={from} allowUnassigned={unit.unassigned > 0} includeInactive disabled={busy || disabled}
          label="Transfer source" onChange={(value) => { setFrom(value); setTo(""); setQuantity("1"); setParts(undefined); setError(""); }} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">To</p>
        <StoreSelect stores={stores.filter((s) => String(s.id) !== from)} value={to} onChange={setTo} disabled={busy || disabled} label="Transfer destination" />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2"><p className="text-sm font-medium">Physical parts</p><FactoryPartQuantity tracking={unit.partTracking} source="WAREHOUSE" storeId={from} quantity={quantity} parts={parts} max={available || 1} label="Parts to transfer" disabled={busy || disabled || !from}
          onChange={next => { setQuantity(next.quantity); setParts(next.parts); }} /></div>
        {from && <p className="pb-2 text-xs text-muted-foreground">{available} available</p>}
        <Button onClick={transfer} disabled={busy || disabled || !valid}>{busy ? "Moving…" : from === "unassigned" ? "Assign to store" : "Transfer parts"}</Button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </section>
  );
}
