"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isApiError } from "@/app/api/_base";
import { technicianPending, technicianReceive, technicianDeliverToInstallation, type TechnicianUnit } from "@/app/api/technician.api";
import { warehouseRequestKey, type Paged, type ReceiptItem, type InstallationDestination } from "@/app/api/warehouse.api";

export const pendingReceiptKey = (actorId: number) => `technician-receipt:${actorId}`;
export const pendingInstallationDeliveryKey = (actorId: number) => `technician-installation-delivery:${actorId}`;
type Selected = Record<string, { unit: TechnicianUnit; quantity: string }>;
type PendingReceipt = { storeId: number; storeName: string; items: ReceiptItem[]; requestKey: string; installation?: InstallationDestination };
const LIMIT = 500;
const errorMessage = (e: unknown) => e instanceof Error ? e.message : "The receipt could not be completed.";

export function TechnicianReceipts({ actorId, storeId, storeName, blocked, offline, onBusy, onSaved, delivering = false }: {
  actorId: number; storeId: number | null; storeName: string; blocked: boolean; offline: boolean;
  onBusy: (busy: boolean) => void; onSaved: () => void;
  delivering?: boolean;
}) {
  const [data, setData] = useState<Paged<TechnicianUnit>>({ items: [], page: 1, pageSize: 25, total: 0 });
  const [search, setSearch] = useState(""), [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Selected>({});
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [selecting, setSelecting] = useState(false);
  const [confirm, setConfirm] = useState(false), [pending, setPending] = useState<PendingReceipt | null>(null);
  const [error, setError] = useState(""), [success, setSuccess] = useState("");
  const serial = useRef(0), saveLock = useRef(false);
  const key = delivering ? pendingInstallationDeliveryKey(actorId) : pendingReceiptKey(actorId);
  const chosen = Object.values(selected);
  const installation = chosen[0]?.unit.installation;
  const invalidInstallation = !installation?.address || chosen.some(({ unit }) =>
    unit.installation?.id !== installation.id || unit.installation?.address !== installation.address);
  const parts = chosen.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const staleSelection = chosen.some(({ unit }) => {
    const current = data.items.find((item) => item.lineNumber === unit.lineNumber);
    return current !== undefined && current.version !== unit.version;
  });
  const invalid = (delivering && invalidInstallation) || staleSelection || chosen.some(({ unit, quantity }) => !Number.isSafeInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > unit.inTransit || Number(quantity) > 200);
  const locked = saving || selecting || confirm || Boolean(pending);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null") as PendingReceipt | null;
      const destinationValid = delivering
        ? saved?.installation && Number.isSafeInteger(saved.installation.id) && saved.installation.id > 0 && typeof saved.installation.address === "string" && Boolean(saved.installation.address.trim())
        : saved && Number.isSafeInteger(saved.storeId) && saved.storeId > 0;
      if (saved && typeof saved.requestKey === "string" && destinationValid &&
        Array.isArray(saved.items) && saved.items.length > 0 && saved.items.length <= LIMIT && saved.items.every((i) =>
          typeof i.barcode === "string" && Number.isSafeInteger(i.version) && i.version >= 0 && Number.isSafeInteger(i.quantity) && i.quantity > 0 && i.quantity <= 200)) {
        setPending(saved); setConfirm(true);
        setError(`A previous ${delivering ? "delivery" : "receipt"} has not been confirmed. Retry the same operation to check whether it was saved.`);
      }
    } catch { /* Se ignoran datos locales no válidos. */ }
  }, [key, delivering]);
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
        if (result.total > LIMIT) throw new Error(`Select up to ${LIMIT} units per operation. Filter by order or PO.`);
        if (total !== undefined && total !== result.total) throw new Error("Pending units changed. Refresh and select again.");
        total = result.total;
        for (const unit of result.items) next[unit.lineNumber] = { unit, quantity: String(unit.inTransit) };
        if (current * 100 >= result.total) break;
      }
      if (Object.keys(next).length !== total) throw new Error("Pending units changed. Refresh and select again.");
      setSelected(delivering ? Object.fromEntries(Object.entries(next).filter(([, entry]) => entry.unit.installation?.address)) : next);
    } catch (e) { setError(errorMessage(e)); }
    finally { setSelecting(false); }
  }
  async function receive() {
    if (saveLock.current || offline) return;
    if (!pending && (blocked || (!delivering && !storeId) || invalid || !chosen.length || chosen.length > LIMIT)) return;
    const request: PendingReceipt = pending ?? {
      storeId: delivering ? 0 : storeId!, storeName, requestKey: warehouseRequestKey(),
      ...(delivering ? { installation: installation! } : {}),
      items: chosen.map(({ unit, quantity }) => ({ barcode: unit.barcode, version: unit.version, quantity: Number(quantity) })).sort((a, b) => a.barcode.localeCompare(b.barcode)),
    };
    saveLock.current = true; setSaving(true); setPending(request); setError(""); setSuccess("");
    try { localStorage.setItem(key, JSON.stringify(request)); } catch {
      // Sin persistencia no se envía una nueva operación que podría quedar sin confirmar.
      if (!pending) setPending(null);
      setError("Browser storage is unavailable. Enable site storage before confirming. Nothing was sent.");
      saveLock.current = false; setSaving(false); return;
    }
    try {
      const result = delivering
        ? await technicianDeliverToInstallation({ installationJobId: request.installation!.id, installationAddress: request.installation!.address, items: request.items, requestKey: request.requestKey })
        : await technicianReceive(request.storeId, request.items, request.requestKey);
      try { localStorage.removeItem(key); } catch { /* El servidor sigue siendo idempotente. */ }
      setPending(null); setConfirm(false); setSelected({});
      setSuccess(`${result.parts} parts ${"installation" in result ? `delivered to installation #${result.installation.id} at ${result.installation.address}` : `received into ${result.storeName}`}.${result.replayed ? " Already recorded; no duplicate added." : ""}`);
      onSaved(); await refresh();
    } catch (e) {
      if (isApiError(e) && e.status >= 400 && e.status < 500 && ![401, 403, 408, 429].includes(e.status)) {
        // Rechazo definitivo: no cambiar las versiones de una selección antigua sin nueva confirmación.
        try { localStorage.removeItem(key); } catch { /* Sin almacenamiento local. */ }
        setPending(null); setConfirm(false); setSelected({});
        setError(errorMessage(e)); await refresh();
      } else {
        setError(`The ${delivering ? "delivery" : "receipt"} has not been confirmed. Retry the same operation; it will only be recorded once.`);
      }
    } finally { saveLock.current = false; setSaving(false); }
  }
  const pendingParts = pending?.items.reduce((sum, item) => sum + item.quantity, 0) ?? parts;
  const pendingUnits = pending?.items.length ?? chosen.length;
  const targetName = pending?.storeName || storeName;
  const deliveryTarget = pending?.installation ?? installation;
  return <div className="space-y-4">
    <p className="text-sm text-slate-600">{delivering ? "Select only the parts that have arrived at one installation. Reduce a quantity for a partial delivery. No second scan is required." : "Select only the parts that have arrived. No second scan is required. Reduce a quantity to split the unit between stores."}</p>
    {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {confirm && <section className="space-y-4 rounded-xl border-2 border-slate-900 bg-white p-5">
      <h2 className="text-lg font-semibold">{pending ? "Check pending confirmation" : delivering ? "Confirm delivery to installation" : "Confirm warehouse receipt"}</h2>
      {delivering ? <><p>Deliver <b>{pendingParts} physical parts</b> across <b>{pendingUnits} units</b> to <b>installation #{deliveryTarget?.id}</b>.</p><p className="font-semibold">{deliveryTarget?.address}</p></> : <p>Receive <b>{pendingParts} physical parts</b> across <b>{pendingUnits} units</b> into <b>{targetName}</b>.</p>}
      <p className="text-sm text-slate-600">{delivering ? "Confirm only after the parts are physically present at this installation address." : "Confirm only after the parts are physically present in this store."}</p>
      <div className="flex gap-3">
        {!pending && <Button variant="outline" className="min-h-12" disabled={saving} onClick={() => setConfirm(false)}>Cancel</Button>}
        <Button className="min-h-12 flex-1" disabled={saving || offline || (!pending && blocked)} onClick={() => void receive()}>{saving ? "Saving…" : pending ? "Retry same confirmation" : delivering ? "Confirm delivery" : "Confirm receipt"}</Button>
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
      <Button className="min-h-12 w-full" disabled={loading || locked || blocked || (!delivering && !storeId) || invalid || chosen.length > LIMIT} onClick={() => { setError(""); setConfirm(true); }}>{delivering ? "Deliver selected" : `Receive selected${storeName ? ` into ${storeName}` : ""}`}</Button>
      {!delivering && !storeId && <p className="text-xs text-amber-800">Choose the destination store above.</p>}
      {delivering && !invalidInstallation && <p className="text-sm">Order #{chosen[0].unit.orderNumber} · Installation #{installation!.id}<br />{installation!.address}</p>}
      {invalid && <p className="text-xs text-red-700">{delivering && invalidInstallation ? "Select parts for one installation with a confirmed address. Filter by order or PO." : staleSelection ? "A selected unit changed. Deselect and select it again before confirming." : "Enter a whole quantity between 1 and the available parts."}</p>}
    </section>}
    {loading && <p role="status" className="text-sm text-slate-600">Updating pending parts…</p>}
    {data.items.map((unit) => {
      const entry = selected[unit.lineNumber];
      const stale = entry && entry.unit.version !== unit.version;
      return <section key={unit.lineNumber} className={`rounded-xl border bg-white p-4 ${entry ? "ring-1 ring-slate-800" : ""}`}>
        <label className="flex cursor-pointer items-start gap-3 py-1">
          <input type="checkbox" className="mt-1 h-6 w-6 shrink-0" checked={Boolean(entry)} disabled={locked || loading || (delivering && !unit.installation?.address) || (!entry && chosen.length >= LIMIT)} onChange={(event) => toggle(unit, event.target.checked)} />
          <div className="min-w-0 space-y-1"><p className="font-semibold">{unit.mark || "No mark"} · {unit.product}</p><p className="text-sm">Order #{unit.orderNumber}{unit.poNumber ? ` · PO ${unit.poNumber}` : ""}</p><p className="text-xs text-slate-500">{unit.system} · {unit.configuration}</p><p className="font-mono text-xs">{unit.barcode}</p><p className="text-sm">In transit: <b>{unit.inTransit}</b></p></div>
        </label>
        {entry && <div className="mt-3 flex items-center justify-between gap-4 border-t pt-3"><label htmlFor={`quantity-${unit.lineNumber}`} className="text-sm font-medium">{delivering ? "Parts to deliver" : "Parts to receive"}</label><Input id={`quantity-${unit.lineNumber}`} className="h-12 w-28 text-base" type="number" inputMode="numeric" min={1} max={unit.inTransit} step={1} disabled={locked || loading} value={entry.quantity} onChange={(event) => setSelected((prev) => ({ ...prev, [unit.lineNumber]: { ...prev[unit.lineNumber], quantity: event.target.value } }))} /></div>}
        {stale && <p className="mt-2 text-xs text-red-700">This unit changed. Deselect and select again before receiving.</p>}
      </section>;
    })}
    {!loading && !data.items.length && <p className="rounded-xl border bg-white p-6 text-center text-sm text-slate-600">{delivering ? "No parts in transit. Collect the parts at the factory first." : "No parts pending receipt. Collect them at the factory first, or choose Scan parts for a direct receipt."}</p>}
    <div className="flex items-center justify-between gap-3">
      <Button className="min-h-11" variant="outline" disabled={locked || loading || page <= 1} onClick={() => { serial.current++; setLoading(true); setPage((p) => p - 1); }}>Previous</Button>
      <span className="text-sm">Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
      <Button className="min-h-11" variant="outline" disabled={locked || loading || page * data.pageSize >= data.total} onClick={() => { serial.current++; setLoading(true); setPage((p) => p + 1); }}>Next</Button>
    </div>
  </div>;
}
