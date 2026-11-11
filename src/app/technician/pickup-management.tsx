"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { FactoryPickupRun } from "@/app/api/technician.api";
import { warehouseAddPickupPos, warehouseDeletePickup, warehousePickup, warehouseRemovePickupPo } from "@/app/api/warehouse.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UnitOrigin } from "@/app/warehouse/unit-origin";
import { errorMessage } from "@/app/warehouse/warehouse-shared";

export function PickupManagement({ run, disabled, onOpenChange, onChanged, onDeleted }: {
  run: FactoryPickupRun;
  disabled: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: (run: FactoryPickupRun) => void;
  onDeleted: () => void;
}) {
  const [mode, setMode] = useState<"orders" | "delete" | null>(null);
  const [poNumber, setPoNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; onOpenChange(false); };
  }, [onOpenChange]);

  function changeMode(next: typeof mode) {
    if (lock.current || (next && disabled)) return;
    setMode(next); setError(""); setPoNumber(""); onOpenChange(next !== null);
  }

  async function change(action: "add" | "remove" | "delete", poKey?: string) {
    if (lock.current || disabled) return;
    if (action === "delete" ? !run.canDelete : !run.canEditOrders) return;
    const value = poNumber.trim();
    if (action === "add" && !value) return;
    lock.current = true; setSaving(true); setError("");
    try {
      if (action === "delete") {
        await warehouseDeletePickup(run.id);
        if (mounted.current) { onOpenChange(false); onDeleted(); }
      } else {
        const next = action === "add"
          ? await warehouseAddPickupPos(run.id, [value])
          : await warehouseRemovePickupPo(run.id, poKey!);
        if (mounted.current) { onChanged(next); setPoNumber(""); }
      }
    } catch (reason) {
      if (mounted.current) setError(errorMessage(reason));
      // Reconcile a concurrent scan or an uncertain response before allowing another change.
      try {
        const current = await warehousePickup(run.id);
        if (mounted.current) onChanged(current);
      } catch { /* Keep the action error visible; retrying these operations is safe. */ }
    } finally {
      lock.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  return <>
    <div className="flex flex-wrap gap-2">
      {run.canEditOrders && <Button type="button" variant="outline" className="min-h-11" disabled={disabled} onClick={() => changeMode("orders")}>Edit POs</Button>}
      {run.canDelete && <Button type="button" variant="outline" className="min-h-11 text-red-700 hover:text-red-800" disabled={disabled} onClick={() => changeMode("delete")}><Trash2 className="mr-2 size-4" aria-hidden="true" />Delete pickup</Button>}
    </div>
    <Dialog open={mode !== null} onOpenChange={open => { if (!open) changeMode(null); }}>
      <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
        onEscapeKeyDown={event => { if (saving) event.preventDefault(); }}
        onInteractOutside={event => { if (saving) event.preventDefault(); }}>
        <DialogHeader className="pr-12 text-left">
          <DialogTitle>{mode === "delete" ? "Delete" : "Edit POs ·"} Pickup #{run.id}{mode === "delete" ? "?" : ""}</DialogTitle>
          <DialogDescription>{mode === "delete"
            ? "This pickup has no recorded movements. Deleting it removes the pickup and frees its POs for another pickup."
            : "Add or remove POs before the first scan. Each change is saved immediately."}</DialogDescription>
        </DialogHeader>
        <Button type="button" variant="ghost" size="icon" className="absolute right-3 top-3 size-11" aria-label="Close pickup management" disabled={saving} onClick={() => changeMode(null)}><X className="size-5" /></Button>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {mode === "orders" && !run.canEditOrders && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">POs can no longer be changed. This pickup must be open and have no recorded movements.</p>}
        {mode === "delete" && !run.canDelete && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This pickup can no longer be deleted because it has recorded movements.</p>}
        <ul className="space-y-2">
          {run.orders.map(order => <li key={order.key} className="flex items-start justify-between gap-3 rounded-xl border p-3">
            <div className="min-w-0"><p className="break-words font-semibold">PO {order.poNumber}</p><p className="break-words text-sm text-slate-600"><UnitOrigin unit={order} /></p><p className="text-xs text-slate-500">{order.pieces} pieces · {order.expectedParts} parts</p></div>
            {mode === "orders" && <Button type="button" variant="outline" className="min-h-11 shrink-0 text-red-700" aria-label={`Remove PO ${order.poNumber}`} disabled={disabled || saving || !run.canEditOrders || run.orders.length < 2} onClick={() => void change("remove", order.key)}>Remove</Button>}
          </li>)}
        </ul>
        {mode === "orders" && <>
          {run.orders.length === 1 && <p className="text-xs text-slate-600">Keep at least one PO. To remove the entire pickup, use Delete pickup.</p>}
          <form className="space-y-2" onSubmit={event => { event.preventDefault(); void change("add"); }}>
            <Label htmlFor={`pickup-add-po-${run.id}`}>Add PO</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id={`pickup-add-po-${run.id}`} value={poNumber} maxLength={50} placeholder="Factory PO number" className="h-11 text-base" disabled={disabled || saving || !run.canEditOrders} onChange={event => setPoNumber(event.target.value)} />
              <Button type="submit" className="min-h-11" disabled={disabled || saving || !run.canEditOrders || !poNumber.trim() || run.orders.length >= 50}><Plus className="mr-2 size-4" aria-hidden="true" />{saving ? "Saving…" : "Add PO"}</Button>
            </div>
          </form>
        </>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={saving} onClick={() => changeMode(null)}>{mode === "delete" ? "Cancel" : "Done"}</Button>
          {mode === "delete" && <Button type="button" variant="destructive" className="min-h-11" disabled={disabled || saving || !run.canDelete} onClick={() => void change("delete")}>{saving ? "Deleting…" : "Delete pickup"}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
