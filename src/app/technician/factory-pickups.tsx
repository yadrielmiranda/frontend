"use client";

import { useCallback, useEffect, useState } from "react";
import { technicianPickups, type FactoryPickupListItem } from "@/app/api/technician.api";
import { warehousePickups } from "@/app/api/warehouse.api";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/app/warehouse/warehouse-shared";
import { FactoryPickup } from "./factory-pickup";

export function FactoryPickups({ actorId, offline, blocked, onBusy, onScanModeChange, surface = "technician" }: {
  actorId: number;
  offline: boolean;
  blocked: boolean;
  onBusy: (busy: boolean) => void;
  onScanModeChange?: (active: boolean) => void;
  surface?: "technician" | "warehouse";
}) {
  const [selection, setSelection] = useState<number | "new" | null>(null);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<FactoryPickupListItem[]>([]);
  const [status, setStatus] = useState<"ACTIVE" | "CLOSED">("ACTIVE");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const list = surface === "warehouse" ? warehousePickups : technicianPickups;
  const storageKey = `${surface}-selected-pickup:${actorId}`;

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (Number.isSafeInteger(saved) && saved > 0) setSelection(saved);
    } catch { /* Permite abrir manualmente una recogida si no hay almacenamiento. */ }
    setRestored(true);
  }, [storageKey]);

  const choose = useCallback((next: number | "new" | null) => {
    setSelection(next); setBusy(false); onBusy(false); onScanModeChange?.(false);
    try {
      if (typeof next === "number") localStorage.setItem(storageKey, String(next));
      else localStorage.removeItem(storageKey);
    } catch { /* Las lecturas conservan sus claves de reintento por recogida. */ }
  }, [storageKey, onBusy, onScanModeChange]);
  const reportBusy = useCallback((value: boolean) => { setBusy(value); onBusy(value); }, [onBusy]);
  const back = useCallback(() => choose(null), [choose]);
  const created = useCallback((id: number) => choose(id), [choose]);

  useEffect(() => {
    if (!restored || selection !== null || offline) return;
    let canceled = false;
    let pending = false;
    setLoading(true);
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const result = await list({ status, page, pageSize: 20 });
        if (!canceled) { setItems(result.items); setTotal(result.total); setError(""); }
      } catch (e) { if (!canceled) setError(errorMessage(e)); }
      finally { pending = false; if (!canceled) setLoading(false); }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { canceled = true; window.clearInterval(timer); };
  }, [restored, selection, offline, list, status, page, revision]);

  if (!restored) return <p role="status">Loading pickups…</p>;
  if (selection !== null) return <section className="space-y-4">
    <Button variant="outline" disabled={busy} onClick={back}>Back to pickups</Button>
    <FactoryPickup key={selection} actorId={actorId} surface={surface}
      pickupId={typeof selection === "number" ? selection : null} onCreated={created}
      offline={offline} blocked={blocked} onBusy={reportBusy} onScanModeChange={onScanModeChange}
      onFinished={back} finishedActionLabel="Back to pickups" />
  </section>;

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-semibold">{surface === "warehouse" ? "Factory pickups" : "Assigned factory pickups"}</h2>
        <p className="text-sm text-slate-600">Open a pickup to see who has collected parts and continue scanning together.</p></div>
      {surface === "warehouse" && <Button disabled={offline || blocked} onClick={() => choose("new")}>Create pickup</Button>}
    </div>
    <div className="flex flex-wrap gap-2">
      {(["ACTIVE", "CLOSED"] as const).map((value) => <Button key={value} variant={status === value ? "default" : "outline"} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); setItems([]); }}>{value === "ACTIVE" ? "Active" : "Closed"}</Button>)}
      <Button variant="outline" disabled={offline} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {offline && <p role="status">Connect to load the latest pickup progress.</p>}
    {loading && !offline && <p role="status">Loading pickups…</p>}
    {!loading && !items.length && !error && <p className="rounded-xl border border-dashed bg-white p-5 text-slate-600">{surface === "technician" && status === "ACTIVE" ? "No active pickups assigned to you. An administrator can assign you to a pickup." : "No pickups in this view."}</p>}
    {items.map((run) => <article key={run.id} className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">Pickup #{run.id}</h3><span className="text-sm">{run.status === "ACTIVE" ? "Active" : run.status === "PARTIAL" ? "Partial · Closed" : "Completed"}</span></div>
      <p className="font-medium">PO {run.orders.map((order) => order.poNumber).join(", ")}</p>
      <p className="text-sm">{run.collectedParts} / {run.expectedParts} parts collected · {run.remainingParts} remaining</p>
      <p className="text-sm text-slate-600">Assigned: {run.technicians.map((person) => person.name).join(", ") || "No technicians assigned"}</p>
      <p className="text-sm text-slate-600">{run.collectors.length ? `Collected by ${run.collectors.map((person) => `${person.name} (${person.parts})`).join(", ")}` : "No parts scanned yet."}</p>
      {run.closedBy && <p className="text-sm text-slate-600">Closed by {run.closedBy.name}{run.finishedAt ? ` · ${new Date(run.finishedAt).toLocaleString()}` : ""}</p>}
      <Button variant="outline" disabled={offline} onClick={() => choose(run.id)}>{run.status === "ACTIVE" ? "Open pickup" : "View pickup"}</Button>
    </article>)}
    {total > 20 && <div className="flex items-center justify-between"><Button variant="outline" disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button><span>Page {page} of {Math.ceil(total / 20)}</span><Button variant="outline" disabled={page * 20 >= total || loading} onClick={() => setPage((value) => value + 1)}>Next</Button></div>}
  </section>;
}
