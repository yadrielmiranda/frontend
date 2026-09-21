"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isApiError } from "@/app/api/_base";
import { technicianPending, technicianReceive, type TechnicianUnit } from "@/app/api/technician.api";
import { warehouseRequestKey, type Paged, type ReceiptItem } from "@/app/api/warehouse.api";

export const pendingReceiptKey = (actorId: number) => `technician-receipt:${actorId}`;
type Selected = Record<string, { unit: TechnicianUnit; quantity: string }>;
type PendingReceipt = { storeId: number; storeName: string; items: ReceiptItem[]; requestKey: string };
const LIMIT = 500;
const errorMessage = (e: unknown) => e instanceof Error ? e.message : "The receipt could not be completed.";

export function TechnicianReceipts({ actorId, storeId, storeName, blocked, offline, onBusy, onSaved }: {
  actorId: number; storeId: number | null; storeName: string; blocked: boolean; offline: boolean;
  onBusy: (busy: boolean) => void; onSaved: () => void;
}) {
  const [data, setData] = useState<Paged<TechnicianUnit>>({ items: [], page: 1, pageSize: 25, total: 0 });
  const [search, setSearch] = useState(""), [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Selected>({});
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [selecting, setSelecting] = useState(false);
  const [confirm, setConfirm] = useState(false), [pending, setPending] = useState<PendingReceipt | null>(null);
  const [error, setError] = useState(""), [success, setSuccess] = useState("");
  const serial = useRef(0), saveLock = useRef(false);
  const key = pendingReceiptKey(actorId);
  const chosen = Object.values(selected);
  const parts = chosen.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const staleSelection = chosen.some(({ unit }) => {
    const current = data.items.find((item) => item.lineNumber === unit.lineNumber);
    return current !== undefined && current.version !== unit.version;
  });
  const invalid = staleSelection || chosen.some(({ unit, quantity }) => !Number.isSafeInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > unit.inTransit || Number(quantity) > 200);
  const locked = saving || selecting || confirm || Boolean(pending);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null") as PendingReceipt | null;
      if (saved && typeof saved.requestKey === "string" && Number.isSafeInteger(saved.storeId) && saved.storeId > 0 &&
        Array.isArray(saved.items) && saved.items.length > 0 && saved.items.length <= LIMIT && saved.items.every((i) =>
          typeof i.barcode === "string" && Number.isSafeInteger(i.version) && i.version >= 0 && Number.isSafeInteger(i.quantity) && i.quantity > 0 && i.quantity <= 200)) {
        setPending(saved); setConfirm(true);
        setError("A previous receipt has not been confirmed. Retry the same receipt to check whether it was saved.");
      }
    } catch { /* Se ignoran datos locales no válidos. */ }
  }, [key]);
  useEffect(() => { onBusy(locked); }, [locked, onBusy]);

  const refresh = useCallback(async () => {
    const seq = ++serial.current;
    setLoading(true);
    try {
      const result = await technicianPending({ search, page, pageSize: 25 });
      if (seq === serial.current) setData(result);
    } catch (e) { if (seq === serial.current) setError(errorMessage(e)); }
    finally { if (seq === serial.current) setLoading(false); }
  }, [search, page]);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 250);
    return () => { clearTimeout(timer); serial.current++; };
  }, [refresh]);
  useEffect(() => {
    if (locked || chosen.length) return;
    const poll = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = setInterval(poll, 20000);
    window.addEventListener("focus", poll);
    return () => { clearInterval(timer); window.removeEventListener("focus", poll); };
  }, [locked, chosen.length, refresh]);

  function toggle(unit: TechnicianUnit, checked: boolean) {
    setSuccess(""); setError("");
    setSelected((prev) => {
      const next = { ...prev };
      if (checked && Object.keys(next).length < LIMIT) next[unit.lineNumber] = { unit, quantity: String(unit.inTransit) };
      else if (!checked) delete next[unit.lineNumber];
      return next;
    });
  }
  async function selectAll() {
    setSelecting(true); setError(""); setSuccess("");
    try {
      const next: Selected = {};
      let total: number | undefined;
      for (let current = 1; ; current++) {
        const result = await technicianPending({ search, page: current, pageSize: 100 });
        if (result.total > LIMIT) throw new Error(`Select up to ${LIMIT} units per receipt. Filter by order or PO.`);
        if (total !== undefined && total !== result.total) throw new Error("Pending units changed. Refresh and select again.");
        total = result.total;
        for (const unit of result.items) next[unit.lineNumber] = { unit, quantity: String(unit.inTransit) };
        if (current * 100 >= result.total) break;
      }
      if (Object.keys(next).length !== total) throw new Error("Pending units changed. Refresh and select again.");
      setSelected(next);
    } catch (e) { setError(errorMessage(e)); }
    finally { setSelecting(false); }
  }
  async function receive() {
    if (saveLock.current || offline) return;
    if (!pending && (blocked || !storeId || invalid || !chosen.length || chosen.length > LIMIT)) return;
    const request: PendingReceipt = pending ?? {
      storeId: storeId!, storeName, requestKey: warehouseRequestKey(),
      items: chosen.map(({ unit, quantity }) => ({ barcode: unit.barcode, version: unit.version, quantity: Number(quantity) })).sort((a, b) => a.barcode.localeCompare(b.barcode)),
    };
    saveLock.current = true; setSaving(true); setPending(request); setError(""); setSuccess("");
    try { localStorage.setItem(key, JSON.stringify(request)); } catch {
      // Sin persistencia no se envía una nueva operación que podría quedar sin confirmar.
      if (!pending) setPending(null);
      setError("Browser storage is unavailable. Enable site storage before receiving. Nothing was sent.");
      saveLock.current = false; setSaving(false); return;
    }
    try {
      const result = await technicianReceive(request.storeId, request.items, request.requestKey);
      try { localStorage.removeItem(key); } catch { /* El servidor sigue siendo idempotente. */ }
      setPending(null); setConfirm(false); setSelected({});
      setSuccess(`${result.parts} parts received into ${result.storeName}.${result.replayed ? " Already recorded; no duplicate added." : ""}`);
      onSaved(); await refresh();
    } catch (e) {
      if (isApiError(e) && e.status >= 400 && e.status < 500 && ![401, 403, 408, 429].includes(e.status)) {
        // Rechazo definitivo: no cambiar las versiones de una selección antigua sin nueva confirmación.
        try { localStorage.removeItem(key); } catch { /* Sin almacenamiento local. */ }
        setPending(null); setConfirm(false); setSelected({});
        setError(errorMessage(e)); await refresh();
      } else {
        setError("The receipt has not been confirmed. Retry the same receipt; it will only be recorded once.");
      }
    } finally { saveLock.current = false; setSaving(false); }
  }
  const pendingParts = pending?.items.reduce((sum, item) => sum + item.quantity, 0) ?? parts;
  const pendingUnits = pending?.items.length ?? chosen.length;
  const targetName = pending?.storeName || storeName;
  return <div className="space-y-4">
    <p className="text-sm text-slate-600">Select only the parts that have arrived. No second scan is required. Reduce a quantity to split the unit between stores.</p>
    {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {confirm && <section className="space-y-4 rounded-xl border-2 border-slate-900 bg-white p-5">
      <h2 className="text-lg font-semibold">{pending ? "Check pending receipt" : "Confirm warehouse receipt"}</h2>
      <p>Receive <b>{pendingParts} physical parts</b> across <b>{pendingUnits} units</b> into <b>{targetName}</b>.</p>
      <p className="text-sm text-slate-600">Confirm only after the parts are physically present in this store.</p>
      <div className="flex gap-3">
        {!pending && <Button variant="outline" className="min-h-12" disabled={saving} onClick={() => setConfirm(false)}>Cancel</Button>}
        <Button className="min-h-12 flex-1" disabled={saving || offline || (!pending && blocked)} onClick={() => void receive()}>{saving ? "Receiving…" : pending ? "Retry same receipt" : "Confirm receipt"}</Button>
      </div>
    </section>}
    <Input aria-label="Search pending parts" className="h-12 text-base" value={search} maxLength={150} placeholder="Order, PO, mark or barcode" disabled={locked} onChange={(event) => {
      serial.current++; setSearch(event.target.value); setPage(1); setSelected({}); setSuccess(""); setError(""); setLoading(true);
    }} />
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="min-h-11" disabled={locked || loading || offline || !data.total || data.total > LIMIT} onClick={() => void selectAll()}>{selecting ? "Selecting…" : `Select all ${data.total} matching units`}</Button>
      <Button variant="outline" className="min-h-11" disabled={locked || loading || offline} onClick={() => { setSelected({}); setError(""); void refresh(); }}>Refresh / clear</Button>
    </div>
    {chosen.length > 0 && !confirm && <section className="sticky top-2 z-10 space-y-2 rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-sm"><b>{chosen.length}</b> units selected · <b>{parts}</b> physical parts</p>
      <Button className="min-h-12 w-full" disabled={loading || locked || blocked || !storeId || invalid || chosen.length > LIMIT} onClick={() => { setError(""); setConfirm(true); }}>Receive selected{storeName ? ` into ${storeName}` : ""}</Button>
      {!storeId && <p className="text-xs text-amber-800">Choose the destination store above.</p>}
      {invalid && <p className="text-xs text-red-700">{staleSelection ? "A selected unit changed. Deselect and select it again before receiving." : "Enter a whole quantity between 1 and the available parts."}</p>}
    </section>}
    {loading && <p role="status" className="text-sm text-slate-600">Updating pending parts…</p>}
    {data.items.map((unit) => {
      const entry = selected[unit.lineNumber];
      const stale = entry && entry.unit.version !== unit.version;
      return <section key={unit.lineNumber} className={`rounded-xl border bg-white p-4 ${entry ? "ring-1 ring-slate-800" : ""}`}>
        <label className="flex cursor-pointer items-start gap-3 py-1">
          <input type="checkbox" className="mt-1 h-6 w-6 shrink-0" checked={Boolean(entry)} disabled={locked || loading || (!entry && chosen.length >= LIMIT)} onChange={(event) => toggle(unit, event.target.checked)} />
          <div className="min-w-0 space-y-1"><p className="font-semibold">{unit.mark || "No mark"} · {unit.product}</p><p className="text-sm">Order #{unit.orderNumber}{unit.poNumber ? ` · PO ${unit.poNumber}` : ""}</p><p className="text-xs text-slate-500">{unit.system} · {unit.configuration}</p><p className="font-mono text-xs">{unit.barcode}</p><p className="text-sm">In transit: <b>{unit.inTransit}</b></p></div>
        </label>
        {entry && <div className="mt-3 flex items-center justify-between gap-4 border-t pt-3"><label htmlFor={`quantity-${unit.lineNumber}`} className="text-sm font-medium">Parts to receive</label><Input id={`quantity-${unit.lineNumber}`} className="h-12 w-28 text-base" type="number" inputMode="numeric" min={1} max={unit.inTransit} step={1} disabled={locked || loading} value={entry.quantity} onChange={(event) => setSelected((prev) => ({ ...prev, [unit.lineNumber]: { ...prev[unit.lineNumber], quantity: event.target.value } }))} /></div>}
        {stale && <p className="mt-2 text-xs text-red-700">This unit changed. Deselect and select again before receiving.</p>}
      </section>;
    })}
    {!loading && !data.items.length && <p className="rounded-xl border bg-white p-6 text-center text-sm text-slate-600">No parts pending receipt. Collect them at the factory first, or choose Scan parts for a direct receipt.</p>}
    <div className="flex items-center justify-between gap-3">
      <Button className="min-h-11" variant="outline" disabled={locked || loading || page <= 1} onClick={() => { serial.current++; setLoading(true); setPage((p) => p - 1); }}>Previous</Button>
      <span className="text-sm">Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
      <Button className="min-h-11" variant="outline" disabled={locked || loading || page * data.pageSize >= data.total} onClick={() => { serial.current++; setLoading(true); setPage((p) => p + 1); }}>Next</Button>
    </div>
  </div>;
}
