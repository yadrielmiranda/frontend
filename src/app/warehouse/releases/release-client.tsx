"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, PackageMinus, RefreshCw, ScanLine, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { isApiError } from "@/app/api/_base";
import {
  warehouseRelease, warehouseInventoryByPo, warehouseStores, warehouseRequestKey,
  type WarehousePoGroup, type WarehousePoInventory, type WarehouseStore, type WarehouseUnit, type WarehouseReleaseResult,
} from "@/app/api/warehouse.api";
import { CountNotice, errorMessage, Pagination } from "../warehouse-shared";
import { StoreSelect } from "../store-select";
import { UnitOrigin } from "../unit-origin";
import { deliveryAvailable, deliveryItems, deliveryPoSelected, deliveryPoUnits, MAX_DELIVERY_PIECES, selectDeliveryPos, type DeliverySelection } from "../customer-deliveries/customer-delivery-selection";
import { parsePendingRelease, prepareRelease, releasePoTotals, type PendingRelease } from "./release-selection";
import { FactoryPartQuantity } from "../factory-part-quantity";

export function ReleaseClient({ actorId, actorRole, initial, initialStores, initialStoreId, initialSearch = "", initialPoKey = "" }: {
  actorId: number; actorRole: string; initial: WarehousePoInventory; initialStores: WarehouseStore[];
  initialStoreId: string; initialSearch?: string; initialPoKey?: string;
}) {
  const { user, revalidate } = useAuth();
  const identity = useRef({ id: user?.id, role: user?.role?.name });
  identity.current = { id: user?.id, role: user?.role?.name };
  const ownerMatches = user?.id === actorId && user?.role?.name === actorRole;
  const [data, setData] = useState(initial), [stores, setStores] = useState(initialStores);
  const [storeId, setStoreId] = useState(initialStoreId), [search, setSearch] = useState(initialSearch), [page, setPage] = useState(1);
  const [initialChoice] = useState(() => {
    const group = initial.items.find((item) => item.key === initialPoKey);
    const missing = initialPoKey && initialStoreId && (!group || !deliveryPoUnits(group, "WAREHOUSE", initialStoreId).length);
    try { return { selection: initialStoreId && group ? selectDeliveryPos({}, [group], "WAREHOUSE", initialStoreId, true) : {} as DeliverySelection, error: missing ? "The requested PO has no available parts at this store. Choose another source store or select a different PO." : "" }; }
    catch (e) { return { selection: {} as DeliverySelection, error: errorMessage(e) }; }
  });
  const [selection, setSelection] = useState<DeliverySelection>(initialChoice.selection);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialPoKey ? { [initialPoKey]: true } : {});
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [ready, setReady] = useState(false);
  const [pending, setPending] = useState<PendingRelease | null>(null), [confirm, setConfirm] = useState(false);
  const [saved, setSaved] = useState<WarehouseReleaseResult | null>(null), [error, setError] = useState(initialChoice.error), [offline, setOffline] = useState(false);
  const serial = useRef(0), saveLock = useRef(false), prefill = useRef(Boolean(initialPoKey && !initialStoreId));
  const pageSnapshot = useRef({ query: JSON.stringify([initialStoreId, initialSearch, 1]), units: initial.items.flatMap((group) => group.units) });
  const storageKey = `warehouse-installation-release:${actorId}`;
  const target = stores.find((store) => String(store.id) === storeId);
  const validSource = storeId === "unassigned" || Boolean(target);
  const storeName = target?.name ?? "Unassigned";
  const chosen = Object.values(selection), totalParts = chosen.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  const busy = !ready || loading || saving, locked = Boolean(pending) || Boolean(saved);
  let selectionError = "", preview: PendingRelease | null = pending;
  try {
    deliveryItems(selection, "WAREHOUSE", storeId);
    if (!pending) preview = prepareRelease(selection, storeId, storeName, "preview");
  } catch (e) { selectionError = errorMessage(e); }

  useEffect(() => {
    if (!ownerMatches) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const value = parsePendingRelease(raw);
        setPending(value); setStoreId(value.body.storeId === null ? "unassigned" : String(value.body.storeId)); setConfirm(true);
        setError("A previous release has not been confirmed. Use Check release to recover the result without releasing the parts twice.");
      }
      setReady(true);
    } catch { setError("The pending release could not be loaded. Keep this page open and contact an administrator before recording another release."); }
  }, [ownerMatches, storageKey]);

  useEffect(() => {
    const connection = () => setOffline(!navigator.onLine);
    connection(); window.addEventListener("online", connection); window.addEventListener("offline", connection);
    return () => { window.removeEventListener("online", connection); window.removeEventListener("offline", connection); };
  }, []);

  const refresh = useCallback(async (clearSelection = false) => {
    if (!ownerMatches || !ready || pending || saved || !storeId) return;
    const sequence = ++serial.current;
    const queryKey = JSON.stringify([storeId, search, page]);
    const previousVisible = new Set(pageSnapshot.current.query === queryKey ? pageSnapshot.current.units.map((unit) => unit.lineNumber) : []);
    setLoading(true);
    if (clearSelection) { setSelection({}); setExpanded({}); }
    try {
      const [next, nextStores] = await Promise.all([
        warehouseInventoryByPo({ view: "on_hand", storeId, search, page, completePo: true, pageSize: 20 }), warehouseStores(),
      ]);
      if (sequence !== serial.current) return;
      setData(next); setStores(nextStores);
      const freshUnits = new Map(next.items.flatMap((group) => group.units).map((unit) => [unit.lineNumber, unit]));
      pageSnapshot.current = { query: queryKey, units: [...freshUnits.values()] };
      // Revalidate this page without dropping selections on other pages or increasing quantities.
      setSelection((previous) => Object.fromEntries(Object.entries(previous).filter(([lineNumber, entry]) => {
        const fresh = freshUnits.get(lineNumber);
        return fresh ? fresh.version === entry.unit.version && deliveryAvailable(fresh, "WAREHOUSE", storeId) >= Number(entry.quantity) : !previousVisible.has(lineNumber);
      })));
      if (prefill.current) {
        prefill.current = false;
        const group = next.items.find((item) => item.key === initialPoKey);
        if (group && deliveryPoUnits(group, "WAREHOUSE", storeId).length) { setSelection(selectDeliveryPos({}, [group], "WAREHOUSE", storeId, true)); setExpanded({ [group.key]: true }); }
        else setError("The requested PO has no available parts at this store. Choose another source store or select a different PO.");
      }
    } catch (e) { if (sequence === serial.current) { setSelection({}); setError(errorMessage(e)); } }
    finally { if (sequence === serial.current) setLoading(false); }
  }, [ownerMatches, ready, pending, saved, storeId, search, page, initialPoKey]);
  useEffect(() => {
    if (confirm) return;
    const requests = serial;
    const timer = setTimeout(() => void refresh(), 250);
    return () => { clearTimeout(timer); requests.current++; };
  }, [refresh, confirm]);
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);

  function changeFilters(next: { storeId?: string; search?: string; page?: number }) {
    if (locked || saving) return;
    serial.current++; setExpanded({}); setError("");
    if (next.storeId !== undefined || next.search !== undefined) setSelection({});
    if (next.storeId !== undefined) setStoreId(next.storeId);
    if (next.search !== undefined) { setSearch(next.search.slice(0, 150)); prefill.current = false; }
    setPage(next.page ?? 1); setLoading(true);
  }
  function toggle(unit: WarehouseUnit, checked: boolean) {
    if (busy || locked || confirm) return;
    setSelection((previous) => {
      const next = { ...previous };
      if (!checked) delete next[unit.lineNumber];
      else if (Object.keys(next).length < MAX_DELIVERY_PIECES) next[unit.lineNumber] = { unit, quantity: String(deliveryAvailable(unit, "WAREHOUSE", storeId)) };
      return next;
    }); setError("");
  }
  function selectPos(groups: WarehousePoGroup[], checked: boolean) {
    if (busy || locked || confirm || !validSource) return;
    try { setSelection(selectDeliveryPos(selection, groups, "WAREHOUSE", storeId, checked)); setError(""); }
    catch (e) { setError(errorMessage(e)); }
  }
  function review() {
    if (busy || locked || !ownerMatches || !validSource || selectionError || data.activeCountId || offline) return;
    serial.current++; setError(""); setConfirm(true);
  }
  async function confirmRelease() {
    if (saveLock.current || saved || !ready || !confirm || !ownerMatches || offline) return;
    if (!pending && (loading || !validSource || selectionError || data.activeCountId)) return;
    saveLock.current = true; setSaving(true); setError("");
    let attempt = pending;
    let verified = false;
    try {
      const account = await revalidate();
      if (!account || account.id !== actorId || account.role?.name !== actorRole ||
        identity.current.id !== actorId || identity.current.role !== actorRole || !["admin", "operator"].includes(actorRole))
        throw new Error("Your account has changed. Sign in with the original account and reopen this release before continuing.");
      verified = true;
      if (!attempt) {
        const proposed = prepareRelease(selection, storeId, storeName, warehouseRequestKey());
        try { sessionStorage.setItem(storageKey, JSON.stringify(proposed)); }
        catch { throw new Error("Browser storage is unavailable. Enable site storage before confirming the release. Nothing was sent."); }
        attempt = proposed; setPending(proposed);
      }
      const result = await warehouseRelease(attempt.body);
      setSaved(result); setPending(null); setSelection({}); setConfirm(false);
      try { sessionStorage.removeItem(storageKey); } catch { /* A reload can safely recover this same release. */ }
    } catch (e) {
      if (!verified) setError(errorMessage(e));
      else if (isApiError(e) && [400, 403, 404, 409, 422].includes(e.status)) {
        try { sessionStorage.removeItem(storageKey); }
        catch { setError("The rejected release could not be cleared from browser storage. Keep this page open and contact an administrator."); return; }
        setPending(null); setConfirm(false); setSelection({}); setExpanded({});
        setError(`${errorMessage(e)} The selection was cleared. Refresh the available parts and review a new release.`);
        // Invalidate the displayed snapshot immediately. The normal refresh effect loads current versions.
        setData((previous) => ({ ...previous, items: [], total: 0 })); setLoading(true);
      } else if (attempt) setError("The release could not be confirmed. Use Check release to recover the result. The same parts will not be released twice.");
      else setError(errorMessage(e));
    } finally { setSaving(false); saveLock.current = false; }
  }

  const visible = data.items.filter((group) => deliveryPoUnits(group, "WAREHOUSE", storeId).length > 0);
  const allVisible = visible.length > 0 && visible.every((group) => deliveryPoSelected(group, selection, "WAREHOUSE", storeId));
  const previewParts = preview?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
  const scanParams = new URLSearchParams({ action: "RELEASE", destination: "installation", ...(storeId ? { storeId } : {}) });
  if (!ownerMatches) return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Your account has changed. Sign in with the original account and reopen this release before continuing.</p>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-semibold">Release to installation</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Choose the source store and the parts leaving the warehouse for installation. Review the quantities before confirming.</p></div>
      {!locked && !saving && <Button asChild variant="outline"><Link href="/warehouse">Back to inventory</Link></Button>}
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {offline && !saved && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">You are offline. Reconnect before confirming this release.</p>}
    {saved ? <section role="status" className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" /><div><h3 className="font-semibold text-emerald-900">Release recorded</h3><p className="mt-1 text-sm text-emerald-900">{saved.parts} physical parts across {saved.units} pieces released from {saved.storeName ?? "Unassigned"}.{saved.replayed ? " This release was already recorded; no duplicate was added." : ""}</p></div></div><div className="flex flex-wrap gap-3"><Button asChild><Link href="/warehouse">Back to inventory</Link></Button><Button asChild variant="outline"><Link href="/warehouse/history">View history</Link></Button></div></section> : <>
      <CountNotice id={data.activeCountId} />
      <section className="space-y-4 rounded-xl border bg-white p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(200px,1fr)_minmax(200px,2fr)]">
          <div className="space-y-2"><Label>Source store</Label><StoreSelect stores={stores} value={storeId} onChange={(value) => changeFilters({ storeId: value })} allowUnassigned includeInactive label="Source store" disabled={!ready || saving || locked || confirm} /></div>
          <div className="space-y-2"><Label htmlFor="release-search">Find a PO or customer</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="release-search" className="pl-9" aria-label="Search release POs" placeholder="PO, customer, order or barcode" maxLength={150} value={search} disabled={!ready || saving || locked || confirm} onChange={(event) => changeFilters({ search: event.target.value })} /></div></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Only parts currently in the selected store are shown.</p><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={busy || locked || confirm || !validSource} onClick={() => { setError(""); void refresh(true); }}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>{!locked && !confirm && <Button asChild variant="outline" size="sm"><Link href={`/warehouse/scan?${scanParams}`}><ScanLine className="mr-2 h-4 w-4" />Release by scanning</Link></Button>}</div></div>
      </section>
      {!validSource ? <p className="rounded-xl border bg-slate-50 px-5 py-12 text-center text-sm text-muted-foreground">Choose the source store to see its available parts.</p> : <>
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Available POs</h3><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" aria-label="Select all visible POs" checked={allVisible} disabled={busy || locked || confirm || !visible.length} onChange={(event) => selectPos(visible, event.target.checked)} />Select all visible POs</label></div>
        <div className="space-y-3" aria-busy={loading}>{visible.map((group) => {
          const units = deliveryPoUnits(group, "WAREHOUSE", storeId), all = deliveryPoSelected(group, selection, "WAREHOUSE", storeId);
          const some = units.some((unit) => Boolean(selection[unit.lineNumber])), open = Boolean(expanded[group.key]);
          const count = units.reduce((sum, unit) => sum + deliveryAvailable(unit, "WAREHOUSE", storeId), 0);
          return <section key={group.key} className={`overflow-hidden rounded-xl border bg-white ${some ? "border-slate-400" : ""} ${group.key === initialPoKey ? "ring-2 ring-slate-200" : ""}`}>
            <div className="flex flex-wrap items-center gap-4 p-4"><label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" aria-label={`Select PO ${group.poNumber || group.orderNumber || group.key}`} aria-checked={all ? true : some ? "mixed" : false} checked={all} disabled={busy || locked || confirm} onChange={(event) => selectPos([group], event.target.checked)} /><span className="min-w-0 space-y-1"><span className="block font-semibold">PO {group.poNumber || "—"}</span><span className="block text-sm"><UnitOrigin unit={group} /></span><span className="block break-words text-sm font-medium">{group.customer || group.project}</span><span className="block text-sm text-muted-foreground">{units.length} pieces · {count} physical parts available</span>{some && <span className="block text-xs font-medium text-emerald-700">{all ? "All available parts selected" : "Partial release selected"}</span>}</span></label><Button variant="outline" size="sm" aria-label={`${open ? "Hide" : "Show"} pieces for PO ${group.poNumber || group.orderNumber || group.key}`} aria-expanded={open} disabled={busy || locked || confirm} onClick={() => setExpanded((previous) => ({ ...previous, [group.key]: !open }))}>{open ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}Pieces</Button></div>
            {open && <div className="divide-y border-t bg-slate-50/50">{units.map((unit) => {
              const entry = selection[unit.lineNumber], available = deliveryAvailable(unit, "WAREHOUSE", storeId);
              return <div key={unit.lineNumber} className="flex flex-wrap items-start gap-3 p-4"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" aria-label={`Select ${unit.barcode}`} checked={Boolean(entry)} disabled={busy || locked || confirm || (!entry && chosen.length >= MAX_DELIVERY_PIECES)} onChange={(event) => toggle(unit, event.target.checked)} /><div className="min-w-40 flex-1 text-sm"><p className="break-words font-medium">{unit.description || [unit.product, unit.system, unit.configuration].filter(Boolean).join(" · ")}</p>{unit.mark && <p className="text-xs text-muted-foreground">Mark: {unit.mark}</p>}<p className="text-xs text-muted-foreground">Line {unit.lineNumber} · {available} parts available</p></div><div className="space-y-1"><Label className="text-xs" htmlFor={`release-quantity-${unit.lineNumber}`}>Release now</Label><FactoryPartQuantity tracking={unit.partTracking} source="WAREHOUSE" storeId={storeId} max={available} label={`Release parts for ${unit.barcode}`} quantity={entry?.quantity ?? ""} parts={entry?.parts} disabled={busy || locked || confirm || !entry} onChange={(next) => setSelection((previous) => previous[unit.lineNumber] ? { ...previous, [unit.lineNumber]: { ...previous[unit.lineNumber], ...next } } : previous)} /></div></div>;
            })}</div>}
          </section>;
        })}{!visible.length && <p className="rounded-xl border bg-white px-5 py-12 text-center text-sm text-muted-foreground">{loading ? "Loading available parts…" : "No POs with available parts match this selection."}</p>}</div>
        <Pagination {...data} label="POs" disabled={busy || locked || confirm} onPage={(next) => changeFilters({ page: next })} />
      </>}
      {chosen.length > 0 && <section className="space-y-3 rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Selected for release</h3><p className="text-sm">{chosen.length} pieces · {totalParts} physical parts</p></div><div className="max-h-64 divide-y overflow-y-auto">{chosen.map(({ unit, quantity }) => <div key={unit.lineNumber} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0 text-sm"><p className="font-medium">PO {unit.poNumber || "—"} · Line {unit.lineNumber}</p><p className="break-words text-xs text-muted-foreground">{unit.description || unit.product}</p></div><div className="flex shrink-0 items-center gap-2"><span className="text-sm">{quantity} parts</span><Button size="icon" variant="ghost" aria-label={`Remove ${unit.barcode}`} disabled={busy || locked || confirm} onClick={() => toggle(unit, false)}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>{selectionError && <p role="alert" className="text-sm text-red-700">{selectionError}</p>}<div className="flex justify-end"><Button disabled={busy || locked || confirm || !validSource || Boolean(selectionError) || Boolean(data.activeCountId) || offline} onClick={review}><ClipboardCheck className="mr-2 h-4 w-4" />Review release</Button></div></section>}
      {pending && !confirm && <Button disabled={saving || offline} onClick={() => setConfirm(true)}>Check release</Button>}
      <Dialog open={confirm} onOpenChange={(open) => { if (!saving && !pending) setConfirm(open); }}>
        <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PackageMinus className="h-5 w-5" />{pending ? "Check warehouse release" : "Confirm release to installation"}</DialogTitle><DialogDescription>Review the source and quantities. Confirming records these parts as released from the warehouse.</DialogDescription></DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto py-2">
            <div className="rounded-lg border bg-slate-50 p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source store</p><p className="mt-1 font-semibold">{preview?.storeName}</p><p className="mt-2 text-sm">{preview?.lines.length ?? 0} pieces · {previewParts} physical parts</p></div>
            <div className="space-y-2">{releasePoTotals(preview?.lines ?? []).map((po) => <div key={po.key} className="flex flex-wrap justify-between gap-2 rounded-lg border p-3 text-sm"><div><p className="font-semibold">PO {po.poNumber}</p><p className="text-muted-foreground">{po.customer}</p></div><p>{po.pieces} pieces · {po.parts} parts</p></div>)}</div>
            <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Review individual pieces</summary><div className="mt-2 divide-y">{preview?.lines.map((line) => <div key={line.barcode} className="flex justify-between gap-3 py-2 text-sm"><div className="min-w-0"><p>Line {line.lineNumber} · PO {line.poNumber}</p><p className="break-words text-xs text-muted-foreground">{line.description}</p></div><span className="shrink-0">{line.quantity} parts</span></div>)}</div></details>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {offline && <p role="status" className="text-sm text-amber-800">Reconnect before confirming this release.</p>}
          </div>
          <DialogFooter><Button variant="outline" disabled={saving || Boolean(pending)} onClick={() => setConfirm(false)}>Back to selection</Button><Button disabled={saving || offline || (!pending && (Boolean(selectionError) || !validSource || Boolean(data.activeCountId)))} onClick={confirmRelease}>{saving ? "Confirming…" : pending ? "Check release" : "Confirm release"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>}
  </div>;
}
