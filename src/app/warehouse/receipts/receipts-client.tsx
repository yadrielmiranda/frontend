"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PackageCheck, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  warehouseInventory, warehouseReceive, warehouseStores, warehouseRequestKey,
  type Inventory, type WarehouseStore, type WarehouseUnit, type ReceiptItem,
} from "@/app/api/warehouse.api";
import { CountNotice, errorMessage, Pagination } from "../warehouse-shared";
import { StoreSelect } from "../store-select";

type Selection = Record<string, { unit: WarehouseUnit; quantity: string }>;
const LIMIT = 500;

export function ReceiptsClient({ initial, initialStores }: {
  initial: Inventory; initialStores: WarehouseStore[];
}) {
  const [data, setData] = useState(initial), [stores, setStores] = useState(initialStores);
  const [search, setSearch] = useState(""), [page, setPage] = useState(1);
  const [selection, setSelection] = useState<Selection>({}), [storeId, setStoreId] = useState("");
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [selecting, setSelecting] = useState(false);
  const [error, setError] = useState(""), [success, setSuccess] = useState(""), [confirm, setConfirm] = useState(false);
  const serial = useRef(0), request = useRef<{ signature: string; key: string } | null>(null), saveLock = useRef(false);
  const chosen = Object.values(selection), busy = loading || saving || selecting;
  const target = stores.find((s) => String(s.id) === storeId && s.isActive);
  const totalParts = chosen.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0);
  const invalid = chosen.some(({ unit, quantity }) => !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > unit.inTransit);
  const refresh = useCallback(async () => {
    const seq = ++serial.current;
    setLoading(true);
    try {
      const [next, nextStores] = await Promise.all([
        warehouseInventory({ view: "in_transit", search, page }), warehouseStores(),
      ]);
      if (seq === serial.current) { setData(next); setStores(nextStores); }
    } catch (e) {
      if (seq === serial.current) setError(errorMessage(e));
    } finally {
      if (seq === serial.current) setLoading(false);
    }
  }, [search, page]);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 250);
    return () => { clearTimeout(timer); serial.current++; };
  }, [refresh]);
  useEffect(() => {
    // Se conserva la fotografía seleccionada; el servidor valida sus versiones.
    if (chosen.length || saving || selecting) return;
    const poll = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = setInterval(poll, 20000);
    window.addEventListener("focus", poll);
    return () => { clearInterval(timer); window.removeEventListener("focus", poll); };
  }, [chosen.length, saving, selecting, refresh]);
  function toggle(unit: WarehouseUnit, checked: boolean) {
    setSuccess("");
    setSelection((prev) => {
      const next = { ...prev };
      if (checked && Object.keys(next).length < LIMIT) next[unit.lineNumber] = { unit, quantity: String(unit.inTransit) };
      else if (!checked) delete next[unit.lineNumber];
      return next;
    });
  }
  function selectPage(checked: boolean) {
    setSuccess("");
    setSelection((prev) => {
      const next = { ...prev };
      for (const unit of data.items) {
        if (!checked) delete next[unit.lineNumber];
        else if (!next[unit.lineNumber] && Object.keys(next).length < LIMIT)
          next[unit.lineNumber] = { unit, quantity: String(unit.inTransit) };
      }
      return next;
    });
  }
  async function selectAll() {
    setSelecting(true); setError(""); setSuccess("");
    try {
      const next: Selection = {};
      let total: number | undefined;
      for (let current = 1; ; current++) {
        const result = await warehouseInventory({ view: "in_transit", search, page: current, pageSize: 100 });
        if (result.total > LIMIT) throw new Error(`Receive at most ${LIMIT} units at a time. Filter by order or select individual pages.`);
        if (total !== undefined && total !== result.total)
          throw new Error("Pending units changed while selecting. Refresh and try again.");
        total = result.total;
        for (const unit of result.items) next[unit.lineNumber] = { unit, quantity: String(unit.inTransit) };
        if (current * 100 >= result.total) break;
      }
      if (Object.keys(next).length !== total) throw new Error("Pending units changed while selecting. Refresh and try again.");
      setSelection(next);
    } catch (e) { setError(errorMessage(e)); }
    finally { setSelecting(false); }
  }
  async function receive() {
    if (saveLock.current || !target || invalid || !chosen.length || chosen.length > LIMIT) return;
    saveLock.current = true; setSaving(true); setError(""); setSuccess("");
    const items: ReceiptItem[] = chosen.map(({ unit, quantity }) => ({
      barcode: unit.barcode, version: unit.version, quantity: Number(quantity),
    })).sort((a, b) => a.barcode.localeCompare(b.barcode));
    const signature = JSON.stringify([target.id, items]);
    if (request.current?.signature !== signature) request.current = { signature, key: warehouseRequestKey() };
    try {
      const result = await warehouseReceive(target.id, items, request.current!.key);
      setSuccess(`${result.parts} parts across ${result.units} units received into ${result.storeName}.${result.replayed ? " This receipt was already recorded; no duplicate was added." : ""}`);
      setSelection({}); setConfirm(false); request.current = null;
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
      // Conservar la misma clave y selección permite verificar una respuesta perdida.
    } finally { setSaving(false); saveLock.current = false; }
  }
  const allPage = data.items.length > 0 && data.items.every((u) => Boolean(selection[u.lineNumber]));
  return (
    <div className="space-y-5">
      <CountNotice id={data.activeCountId} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Pending receipt</h2>
          <p className="mt-1 text-sm text-muted-foreground">Parts collected from the factory and still in transit. Select the parts that have actually arrived; no second scan is required.</p>
        </div>
        <Button asChild variant="outline"><Link href="/warehouse/scan">Receive by scanning</Link></Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input aria-label="Search pending receipts" className="pl-9" placeholder="Order, customer, PO, mark or barcode" maxLength={150}
            value={search} disabled={saving || selecting || confirm}
            onChange={(e) => { serial.current++; setLoading(true); setSearch(e.target.value); setPage(1); setSelection({}); setError(""); }} />
        </div>
        <Button variant="outline" disabled={busy || confirm} onClick={() => { setSelection({}); setError(""); void refresh(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh / clear selection
        </Button>
      </div>
      <section className="space-y-3 rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full space-y-2 sm:max-w-xs">
            <p className="text-sm font-medium">Destination store</p>
            <StoreSelect stores={stores} value={storeId} onChange={setStoreId} disabled={saving || confirm} label="Receipt destination store" />
          </div>
          <div className="flex-1 text-sm"><b>{chosen.length}</b> units selected · <b>{totalParts}</b> physical parts</div>
          <Button disabled={busy || Boolean(data.activeCountId) || !target || !chosen.length || invalid || chosen.length > LIMIT} onClick={() => { setError(""); setConfirm(true); }}>
            <PackageCheck className="mr-2 h-4 w-4" />Receive selected
          </Button>
        </div>
        {!stores.some((s) => s.isActive) && <p className="text-sm text-amber-800">An administrator must create an active store in <Link href="/warehouse/stores" className="underline">Stores</Link> first.</p>}
        {chosen.length > 0 && <p className="text-xs text-muted-foreground">Each selected row receives its entered quantity. To split stock between stores, receive only the quantity for this store and then receive the remaining parts into another store.</p>}
      </section>
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
      {error && !confirm && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={allPage} disabled={busy || confirm || !data.items.length} onChange={(e) => selectPage(e.target.checked)} />Select this page</label>
        <Button variant="outline" size="sm" disabled={busy || confirm || data.total === 0 || data.total > LIMIT} onClick={selectAll}>
          {selecting ? "Selecting…" : `Select all ${data.total} matching units`}
        </Button>
        {data.total > LIMIT && <span className="text-xs text-muted-foreground">Maximum {LIMIT} units per receipt. Narrow the search to select all.</span>}
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
            {["Select", "Order / customer", "Piece / barcode", "In transit", "Receive now"].map((h) => <th className="px-4 py-3 font-medium" key={h}>{h}</th>)}
          </tr></thead>
          <tbody className="divide-y">
            {data.items.map((unit) => {
              const entry = selection[unit.lineNumber];
              const stale = entry && entry.unit.version !== unit.version;
              return <tr key={unit.lineNumber} className={entry ? "bg-slate-50" : ""}>
                <td className="px-4 py-4"><input type="checkbox" aria-label={`Select ${unit.barcode}`} checked={Boolean(entry)} disabled={busy || confirm || (!entry && chosen.length >= LIMIT)} onChange={(e) => toggle(unit, e.target.checked)} /></td>
                <td className="px-4 py-4"><Link href={`/orders/${unit.orderId}`} className="font-medium underline">#{unit.orderNumber}</Link><p className="text-xs text-muted-foreground">{unit.customer}</p>{unit.poNumber && <p className="text-xs text-muted-foreground">PO {unit.poNumber}</p>}</td>
                <td className="px-4 py-4"><p className="font-medium">{unit.mark || "—"} · {unit.product}</p><p className="text-xs text-muted-foreground">{unit.system} · {unit.configuration}</p><p className="font-mono text-xs">{unit.barcode}</p>{stale && <p className="text-xs text-red-700">Changed. Deselect and select again.</p>}</td>
                <td className="px-4 py-4 font-semibold">{unit.inTransit}</td>
                <td className="px-4 py-4"><Input type="number" min={1} max={unit.inTransit} step={1} className="w-24" aria-label={`Quantity to receive for ${unit.barcode}`} disabled={busy || confirm || !entry} value={entry?.quantity ?? ""}
                  onChange={(e) => setSelection((prev) => ({ ...prev, [unit.lineNumber]: { ...prev[unit.lineNumber], quantity: e.target.value } }))} /></td>
              </tr>;
            })}
            {!data.items.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">No parts pending receipt. Collect parts from the factory first, or use Scan for a direct receipt.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination {...data} onPage={(next) => { serial.current++; setLoading(true); setPage(next); }} disabled={busy || confirm} />
      <Dialog open={confirm} onOpenChange={(open) => { if (!saving) setConfirm(open); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm warehouse receipt</DialogTitle><DialogDescription>Only confirm parts that are physically present at the selected store.</DialogDescription></DialogHeader>
          <p className="text-sm">Receive <b>{totalParts} physical parts</b> across <b>{chosen.length} units</b> into <b>{target?.name ?? "the selected store"}</b>. These quantities will leave transit and enter that store.</p>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setConfirm(false)}>Cancel</Button><Button disabled={saving || !target || invalid || !chosen.length} onClick={receive}>{saving ? "Receiving…" : "Confirm receipt"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
