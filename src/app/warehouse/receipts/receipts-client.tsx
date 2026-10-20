"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, PackageCheck, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  warehouseInventoryByPo, warehouseReceive, warehouseStores, warehouseRequestKey, warehouseDeliverToInstallation,
  type WarehousePoInventory, type WarehousePoGroup, type WarehouseStore, type WarehouseUnit, type ReceiptItem,
} from "@/app/api/warehouse.api";
import { CountNotice, errorMessage, Pagination } from "../warehouse-shared";
import { StoreSelect } from "../store-select";
import { UnitOrigin } from "../unit-origin";
import { deliveryItems, deliveryPoSelected, selectDeliveryPos, type DeliverySelection } from "../customer-deliveries/customer-delivery-selection";
import { FactoryPartQuantity } from "../factory-part-quantity";

type Selection = DeliverySelection;
const LIMIT = 500;

export function ReceiptsClient({ initial, initialStores }: {
  initial: WarehousePoInventory; initialStores: WarehouseStore[];
}) {
  const [data, setData] = useState(initial), [stores, setStores] = useState(initialStores);
  const [search, setSearch] = useState(""), [page, setPage] = useState(1);
  const [selection, setSelection] = useState<Selection>({}), [storeId, setStoreId] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [destination, setDestination] = useState<"warehouse" | "installation">("warehouse");
  const delivering = destination === "installation";
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [selecting, setSelecting] = useState(false);
  const [error, setError] = useState(""), [success, setSuccess] = useState(""), [confirm, setConfirm] = useState(false);
  const serial = useRef(0), request = useRef<{ signature: string; key: string } | null>(null), saveLock = useRef(false);
  const chosen = Object.values(selection), busy = loading || saving || selecting;
  const target = stores.find((s) => String(s.id) === storeId && s.isActive);
  const installation = chosen[0]?.unit.installation;
  const invalidInstallation = !installation?.address || chosen.some(({ unit }) =>
    unit.source === "EXTERNAL" || unit.installation?.id !== installation.id || unit.installation?.address !== installation.address);
  const targetValid = delivering ? !invalidInstallation : Boolean(target);
  const totalParts = chosen.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0);
  let invalid = false;
  try { deliveryItems(selection, "TRANSIT", ""); } catch { invalid = true; }
  const refresh = useCallback(async () => {
    const seq = ++serial.current;
    setLoading(true);
    try {
      const [next, nextStores] = await Promise.all([
        warehouseInventoryByPo({ view: "in_transit", search, page, pageSize: 20, completePo: true }), warehouseStores(),
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
  function eligibleGroups(groups: WarehousePoGroup[]) {
    return groups.map((group) => ({ ...group, units: group.units.filter((unit) => unit.inTransit > 0 && (!delivering || (unit.source !== "EXTERNAL" && Boolean(unit.installation?.address)))) })).filter((group) => group.units.length > 0);
  }
  function selectPos(groups: WarehousePoGroup[], checked: boolean) {
    setSuccess(""); setError("");
    try { setSelection(selectDeliveryPos(selection, eligibleGroups(groups), "TRANSIT", "", checked)); }
    catch (e) { setError(errorMessage(e)); }
  }
  async function selectAll() {
    setSelecting(true); setError(""); setSuccess("");
    try {
      let next: Selection = {};
      let total: number | undefined;
      let received = 0;
      for (let current = 1; ; current++) {
        const result = await warehouseInventoryByPo({ view: "in_transit", search, page: current, pageSize: 20, completePo: true });
        if (total !== undefined && total !== result.total)
          throw new Error("Pending POs changed while selecting. Refresh and try again.");
        total = result.total;
        received += result.items.length;
        next = selectDeliveryPos(next, eligibleGroups(result.items), "TRANSIT", "", true);
        if (current * 20 >= result.total) break;
      }
      if (received !== total) throw new Error("Pending POs changed while selecting. Refresh and try again.");
      setSelection(next);
    } catch (e) { setError(errorMessage(e)); }
    finally { setSelecting(false); }
  }
  async function receive() {
    if (saveLock.current || !targetValid || invalid || !chosen.length || chosen.length > LIMIT) return;
    saveLock.current = true; setSaving(true); setError(""); setSuccess("");
    const items: ReceiptItem[] = deliveryItems(selection, "TRANSIT", "");
    const signature = JSON.stringify([destination, delivering ? installation : target!.id, items]);
    if (request.current?.signature !== signature) request.current = { signature, key: warehouseRequestKey() };
    try {
      if (delivering) {
        const result = await warehouseDeliverToInstallation({ installationJobId: installation!.id, installationAddress: installation!.address, items, requestKey: request.current!.key });
        setSuccess(`${result.parts} parts delivered to installation #${result.installation.id} at ${result.installation.address}.${result.replayed ? " Already recorded; no duplicate was added." : ""}`);
      } else {
        const result = await warehouseReceive(target!.id, items, request.current!.key);
        setSuccess(`${result.parts} parts across ${result.units} units received into ${result.storeName}.${result.replayed ? " This receipt was already recorded; no duplicate was added." : ""}`);
      }
      setSelection({}); setConfirm(false); request.current = null;
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
      // Conservar la misma clave y selección permite verificar una respuesta perdida.
    } finally { setSaving(false); saveLock.current = false; }
  }
  const pageGroups = eligibleGroups(data.items);
  const allPage = pageGroups.length > 0 && pageGroups.every((group) => deliveryPoSelected(group, selection, "TRANSIT", ""));
  const selectedPos = new Map<string, { poNumber: string; orderNumber: string; customer: string; pieces: number; parts: number }>();
  for (const { unit, quantity } of chosen) {
    const key = unit.source === "EXTERNAL" ? `external:${unit.externalPoId}` : unit.orderId ? `order:${unit.orderId}` : `line:${unit.lineNumber}`;
    const entry = selectedPos.get(key) ?? { poNumber: unit.poNumber, orderNumber: unit.orderNumber, customer: unit.customer || unit.project, pieces: 0, parts: 0 };
    entry.pieces++; entry.parts += Number(quantity) || 0; selectedPos.set(key, entry);
  }
  return (
    <div className="space-y-5">
      <CountNotice id={data.activeCountId} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Pending receipt</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose the POs that have arrived from the factory. Only previously collected parts are included; no second scan is required.</p>
        </div>
        <Button asChild variant="outline"><Link href="/warehouse/scan">Receive by scanning</Link></Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input aria-label="Search pending receipts" className="pl-9" placeholder="Search by customer, order or PO (optional)" maxLength={150}
            value={search} disabled={saving || selecting || confirm}
            onChange={(e) => { serial.current++; setLoading(true); setSearch(e.target.value); setPage(1); setSelection({}); setError(""); }} />
        </div>
        <Button variant="outline" disabled={busy || confirm} onClick={() => { setSelection({}); setError(""); void refresh(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh / clear selection
        </Button>
      </div>
      <section className="z-10 space-y-3 rounded-xl border bg-white p-4 shadow-sm sm:sticky sm:top-24">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Material destination">
          <Button asChild variant="outline" disabled={busy || confirm}>
            <Link href={`/warehouse/customer-deliveries/new?source=TRANSIT&search=${encodeURIComponent(search)}`}
              aria-disabled={busy || confirm} tabIndex={busy || confirm ? -1 : undefined}
              onClick={(event) => { if (busy || confirm) event.preventDefault(); }}>
              Deliver directly to customer
            </Link>
          </Button>
          {(["warehouse", "installation"] as const).map((value) => <Button key={value} variant={destination === value ? "default" : "outline"} aria-pressed={destination === value} disabled={busy || confirm} onClick={() => { setDestination(value); setSelection({}); setError(""); setSuccess(""); }}>
            {value === "warehouse" ? "Receive at warehouse" : "Deliver to installation"}
          </Button>)}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          {!delivering && <div className="w-full space-y-2 sm:max-w-xs">
            <p className="text-sm font-medium">Destination store</p>
            <StoreSelect stores={stores} value={storeId} onChange={setStoreId} disabled={saving || confirm} label="Receipt destination store" />
          </div>}
          <div className="flex-1 text-sm"><b>{selectedPos.size}</b> POs · <b>{chosen.length}</b> pieces selected · <b>{totalParts}</b> physical parts</div>
          <Button disabled={busy || Boolean(data.activeCountId) || !targetValid || !chosen.length || invalid || chosen.length > LIMIT} onClick={() => { setError(""); setConfirm(true); }}>
            <PackageCheck className="mr-2 h-4 w-4" />{delivering ? "Deliver selected" : "Receive selected"}
          </Button>
        </div>
        {!delivering && !stores.some((s) => s.isActive) && <p className="text-sm text-amber-800">An administrator must create an active store in <Link href="/warehouse/stores" className="underline">Stores</Link> first.</p>}
        {delivering && <p className="text-sm text-muted-foreground">Select parts for one installation. Confirm only the quantities that have physically arrived at the job site.</p>}
        {delivering && chosen.length > 0 && (invalidInstallation ? <p role="alert" className="text-sm text-amber-800">Select parts for one installation with a confirmed address. Filter by order or PO.</p> : <p className="text-sm">Order #{chosen[0].unit.orderNumber} · <Link href={`/installations/${installation!.id}`} className="underline">Installation #{installation!.id}</Link><br />{installation!.address}</p>)}
        {!delivering && chosen.length > 0 && <p className="text-xs text-muted-foreground">To split a PO between stores, open Pieces and enter only the parts for this store. Receive the remaining parts into another store afterward.</p>}
      </section>
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
      {error && !confirm && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex min-h-10 items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={allPage} disabled={busy || confirm || !pageGroups.length} onChange={(e) => selectPos(pageGroups, e.target.checked)} />Select POs on this page</label>
        <Button variant="outline" size="sm" disabled={busy || confirm || data.total === 0} onClick={selectAll}>
          {selecting ? "Selecting…" : `Select all ${data.total} matching POs`}
        </Button>
      </div>
      <div><h3 className="font-semibold">POs pending receipt</h3><p className="mt-1 text-sm text-muted-foreground">Select a PO to include all its parts in transit. Open Pieces to select individual pieces or change quantities.</p></div>
      <div className="space-y-3" aria-busy={loading}>{data.items.map((group) => {
        const eligible = eligibleGroups([group])[0];
        const all = Boolean(eligible && deliveryPoSelected(eligible, selection, "TRANSIT", ""));
        const some = group.units.some((unit) => Boolean(selection[unit.lineNumber]));
        const open = Boolean(expanded[group.key]);
        const parts = group.units.reduce((sum, unit) => sum + unit.inTransit, 0);
        return <section key={group.key} className={`overflow-hidden rounded-xl border bg-white ${some ? "border-slate-400" : ""}`}>
          <div className="flex flex-wrap items-center gap-4 p-4">
            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" aria-label={`Select PO ${group.poNumber || group.orderNumber || group.key}`} aria-checked={all ? true : some ? "mixed" : false} checked={all} disabled={busy || confirm || !eligible} onChange={(e) => selectPos([group], e.target.checked)} />
              <span className="min-w-0 space-y-1"><span className="block text-base font-semibold">PO {group.poNumber || "—"}</span><span className="block text-sm"><UnitOrigin unit={group} /></span>{group.customer && <span className="block break-words text-sm font-medium">{group.customer}</span>}{group.project && group.project !== group.customer && <span className="block break-words text-sm text-muted-foreground">{group.project}</span>}<span className="block text-sm text-muted-foreground">{group.units.length} pieces · {parts} physical parts in transit</span>{some && <span className="block text-xs font-medium text-emerald-700">{all ? "All available parts selected" : "Partial quantities selected"}</span>}{delivering && !eligible && <span className="block text-xs text-muted-foreground">{group.source === "EXTERNAL" ? "External POs can be received at a warehouse or delivered directly to a customer." : "A confirmed installation address is required."}</span>}</span>
            </label>
            <Button variant="outline" size="sm" aria-label={`${open ? "Hide" : "Show"} pieces for PO ${group.poNumber || group.orderNumber || group.key}`} aria-expanded={open} disabled={busy || confirm} onClick={() => setExpanded((previous) => ({ ...previous, [group.key]: !open }))}>{open ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}Pieces</Button>
          </div>
          {open && <div className="divide-y border-t bg-slate-50/50">{group.units.map((unit) => {
            const entry = selection[unit.lineNumber];
            const stale = entry && entry.unit.version !== unit.version;
            return <div key={unit.lineNumber} className="flex flex-wrap items-start gap-3 p-4">
              <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" aria-label={`Select ${unit.barcode}`} checked={Boolean(entry)} disabled={busy || confirm || (delivering && (unit.source === "EXTERNAL" || !unit.installation?.address)) || (!entry && chosen.length >= LIMIT)} onChange={(e) => toggle(unit, e.target.checked)} />
              <div className="min-w-40 flex-1 text-sm"><p className="break-words font-medium">{unit.description || [unit.mark, unit.product, unit.system, unit.configuration].filter(Boolean).join(" · ")}</p>{unit.description && unit.mark && unit.mark !== unit.description && <p className="text-xs text-muted-foreground">Mark: {unit.mark}</p>}<p className="text-xs text-muted-foreground">Line {unit.lineNumber} · {unit.inTransit} parts in transit</p><p className="font-mono text-xs text-muted-foreground">{unit.barcode}</p>{stale && <p className="text-xs text-red-700">Changed. Deselect and select again.</p>}</div>
              <div className="space-y-1 text-xs"><span className="block">{delivering ? "Deliver now" : "Receive now"}</span><FactoryPartQuantity tracking={unit.partTracking} source="TRANSIT" storeId="" max={unit.inTransit}
                label={`Quantity to ${delivering ? "deliver" : "receive"} for ${unit.barcode}`} disabled={busy || confirm || !entry} quantity={entry?.quantity ?? ""} parts={entry?.parts}
                onChange={(next) => setSelection((prev) => ({ ...prev, [unit.lineNumber]: { ...prev[unit.lineNumber], ...next } }))} /></div>
            </div>;
          })}</div>}
        </section>;
      })}{!data.items.length && <p className="rounded-xl border bg-white px-5 py-12 text-center text-sm text-muted-foreground">No POs pending receipt. Collect parts from the factory first, or use Scan for a direct receipt.</p>}</div>
      <Pagination {...data} label="POs" onPage={(next) => { serial.current++; setLoading(true); setPage(next); }} disabled={busy || confirm} />
      <Dialog open={confirm} onOpenChange={(open) => { if (!saving) setConfirm(open); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{delivering ? "Confirm delivery to installation" : "Confirm warehouse receipt"}</DialogTitle><DialogDescription>{delivering ? "Only confirm parts that are physically present at this installation address." : "Only confirm parts that are physically present at the selected store."}</DialogDescription></DialogHeader>
          {delivering ? <div className="space-y-2 text-sm"><p>Deliver <b>{totalParts} physical parts</b> across <b>{chosen.length} units</b> for <b>Order #{chosen[0]?.unit.orderNumber}</b>.</p><p className="font-semibold">Installation #{installation?.id} · {installation?.address}</p></div> : <p className="text-sm">Receive <b>{totalParts} physical parts</b> across <b>{chosen.length} units</b> into <b>{target?.name ?? "the selected store"}</b>. These quantities will leave transit and enter that store.</p>}
          <div className="max-h-56 overflow-y-auto rounded-lg border px-3 text-sm">{[...selectedPos.entries()].map(([key, po]) => <div key={key} className="border-b py-3 last:border-0"><p className="font-medium">PO {po.poNumber || "—"}{po.orderNumber ? ` · Order #${po.orderNumber}` : ""}</p>{po.customer && <p className="text-xs text-muted-foreground">{po.customer}</p>}<p className="text-xs">{po.pieces} pieces · {po.parts} physical parts</p></div>)}</div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setConfirm(false)}>Cancel</Button><Button disabled={saving || !targetValid || invalid || !chosen.length} onClick={receive}>{saving ? "Saving…" : delivering ? "Confirm delivery" : "Confirm receipt"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
