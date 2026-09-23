"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, PackageCheck, Plus, Undo2, X } from "lucide-react";
import {
  technicianFinishPickup,
  technicianPickupCurrent,
  technicianPickupPo,
  technicianPickupScan,
  technicianStartPickup,
  type FactoryPickupCandidate,
  type FactoryPickupLine,
  type FactoryPickupPartialReason,
  type FactoryPickupPoPreview,
  type FactoryPickupRun,
  type FactoryPickupScanResult,
} from "@/app/api/technician.api";
import {
  warehouseFinishPickup,
  warehousePickupCurrent,
  warehousePickupPo,
  warehousePickupScan,
  warehouseRequestKey,
  warehouseStartPickup,
  warehouseUndo,
} from "@/app/api/warehouse.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanPad } from "@/app/warehouse/scan-pad";
import { errorMessage } from "@/app/warehouse/warehouse-shared";

const reasonOptions: Array<{ value: FactoryPickupPartialReason; label: string }> = [
  { value: "NOT_READY_AT_FACTORY", label: "Not ready at factory" },
  { value: "MANUFACTURER_HELD_MATERIAL", label: "Manufacturer held material" },
  { value: "DAMAGED_NOT_ACCEPTED", label: "Damaged / not accepted" },
  { value: "OTHER", label: "Other" },
];

type CandidatePending = {
  barcode: string;
  requestKey: string;
  candidate: FactoryPickupCandidate;
};

type ReadResult = FactoryPickupScanResult & { barcode: string; requestKey: string };

type FactoryPickupSurface = "technician" | "warehouse";

const candidateKey = (surface: FactoryPickupSurface, actorId: number, runId: number) =>
  `${surface}-pickup-candidate:${actorId}:${runId}`;


function RemainingList({ lines }: { lines: FactoryPickupLine[] }) {
  const partial = lines.filter((line) => line.remaining > 0 && line.collected > 0);
  const untouched = lines.filter((line) => line.remaining > 0 && line.collected === 0);
  const group = (title: string, items: FactoryPickupLine[]) =>
    items.length ? (
      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        {items.map((line) => (
          <div key={line.lineNumber} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">PO {line.poNumber} · Mark {line.mark || "—"}</p>
                <p className="mt-1 font-semibold text-slate-950">{line.product}</p>
                <p className="text-xs text-slate-500">{[line.system, line.configuration].filter(Boolean).join(" · ")}</p>
                <p className="mt-1 font-mono text-xs text-slate-600">Line {line.lineNumber}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-red-700">{line.remaining} missing</p>
                <p className="text-xs text-slate-500">{line.collected} / {line.targetParts} collected</p>
              </div>
            </div>
          </div>
        ))}
      </section>
    ) : null;
  return (
    <div className="space-y-4">
      {group("Partially collected", partial)}
      {group("Not collected", untouched)}
    </div>
  );
}

export function FactoryPickup({
  actorId,
  offline,
  blocked,
  onBusy,
  onFinished,
  onScanModeChange,
  surface = "technician",
  finishedActionLabel,
}: {
  actorId: number;
  offline: boolean;
  blocked: boolean;
  onBusy: (busy: boolean) => void;
  onFinished: () => void;
  onScanModeChange?: (active: boolean) => void;
  surface?: FactoryPickupSurface;
  finishedActionLabel?: string;
}) {
  const [run, setRun] = useState<FactoryPickupRun | null>(null);
  const [finished, setFinished] = useState<FactoryPickupRun | null>(null);
  const [planned, setPlanned] = useState<FactoryPickupPoPreview[]>([]);
  const [poNumber, setPoNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState<Extract<FactoryPickupScanResult, { kind: "COLLECTED" }> | null>(null);
  const [candidate, setCandidate] = useState<CandidatePending | null>(null);
  const [showRemaining, setShowRemaining] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [reason, setReason] = useState<FactoryPickupPartialReason | "">("");
  const [note, setNote] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [undoMessage, setUndoMessage] = useState("");
  const mounted = useRef(true);
  const undoKey = useRef("");
  const pickupCurrent = surface === "warehouse" ? warehousePickupCurrent : technicianPickupCurrent;
  const pickupPo = surface === "warehouse" ? warehousePickupPo : technicianPickupPo;
  const startPickupRequest = surface === "warehouse" ? warehouseStartPickup : technicianStartPickup;
  const pickupScan = surface === "warehouse" ? warehousePickupScan : technicianPickupScan;
  const finishPickupRequest = surface === "warehouse" ? warehouseFinishPickup : technicianFinishPickup;

  const busy = working || scanBusy || undoing;
  useEffect(() => onBusy(busy), [busy, onBusy]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      onBusy(false);
      onScanModeChange?.(false);
    };
  }, [onBusy, onScanModeChange]);

  const loadCurrent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const current = await pickupCurrent();
      if (!mounted.current) return;
      setRun(current);
      if (current) {
        try {
          const saved = localStorage.getItem(candidateKey(surface, actorId, current.id));
          if (saved) {
            const parsed = JSON.parse(saved) as CandidatePending;
            if (parsed?.candidate?.poNumber && parsed.barcode && parsed.requestKey)
              setCandidate(parsed);
          }
        } catch { /* La recogida sigue disponible sin restaurar la confirmación local. */ }
      }
    } catch (e) {
      if (mounted.current) setError(errorMessage(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [actorId, pickupCurrent, surface]);

  useEffect(() => { void loadCurrent(); }, [loadCurrent]);

  async function addPlannedPo() {
    const value = poNumber.trim();
    if (!value || working) return;
    if (planned.some((po) => po.poNumber.toLowerCase() === value.toLowerCase())) {
      setError("This PO is already in the pickup list.");
      return;
    }
    setWorking(true); setError("");
    try {
      const preview = await pickupPo(value);
      setPlanned((items) => [...items, preview]);
      setPoNumber("");
    } catch (e) { setError(errorMessage(e)); }
    finally { setWorking(false); }
  }

  async function startPickup() {
    if (!planned.length || working || offline || blocked) return;
    setWorking(true); setError("");
    try {
      const next = await startPickupRequest(planned.map((po) => po.poNumber));
      setRun(next); setPlanned([]); setLast(null); setShowRemaining(false);
    } catch (e) { setError(errorMessage(e)); }
    finally { setWorking(false); }
  }

  function saveCandidate(next: CandidatePending | null) {
    setCandidate(next);
    if (!run) return;
    try {
      if (next) localStorage.setItem(candidateKey(surface, actorId, run.id), JSON.stringify(next));
      else localStorage.removeItem(candidateKey(surface, actorId, run.id));
    } catch { /* El servidor sigue validando cada lectura. */ }
  }

  async function confirmAddPo() {
    if (!run || !candidate || working || offline || blocked) return;
    setWorking(true); setError("");
    try {
      const result = await pickupScan(
        run.id,
        candidate.barcode,
        candidate.requestKey,
        true,
      );
      if (result.kind !== "COLLECTED") throw new Error("The PO could not be added to this pickup.");
      setRun(result.pickup); setLast(result); setUndoMessage(""); undoKey.current = ""; saveCandidate(null);
    } catch (e) { setError(errorMessage(e)); }
    finally { setWorking(false); }
  }

  async function undoLastCollection() {
    if (surface !== "warehouse" || !run || !last || undoing || working || scanBusy) return;
    if (!undoKey.current) undoKey.current = warehouseRequestKey();
    setUndoing(true); setError(""); setUndoMessage("");
    try {
      await warehouseUndo(last.movement.id, undoKey.current);
      const current = await pickupCurrent();
      if (!current) throw new Error("The active pickup could not be reloaded after reversing the reading.");
      setRun(current);
      setLast(null);
      setUndoMessage("Last collected part was reversed.");
      undoKey.current = "";
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUndoing(false);
    }
  }

  async function finishPickup() {
    if (!run || working || offline || blocked) return;
    if (run.remainingParts > 0 && !reason) {
      setError("Choose why this pickup is being finished with parts remaining.");
      return;
    }
    setWorking(true); setError("");
    try {
      const result = await finishPickupRequest(run.id, {
        ...(run.remainingParts > 0 ? { partialReason: reason as FactoryPickupPartialReason } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      saveCandidate(null);
      setFinished(result); setRun(null); setFinishing(false); setLast(null);
    } catch (e) { setError(errorMessage(e)); }
    finally { setWorking(false); }
  }

  const remaining = useMemo(() => run?.lines.filter((line) => line.remaining > 0) ?? [], [run]);
  const plannedParts = planned.reduce((sum, po) => sum + po.parts, 0);

  if (loading) return <p role="status" className="rounded-xl border bg-white p-5 text-sm text-slate-600">Loading factory pickup…</p>;

  if (finished) return (
    <section className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Pickup {finished.status === "COMPLETED" ? "complete" : "finished as partial"}</h2>
          <p className="mt-1 text-sm text-slate-600">{finished.collectedParts} of {finished.expectedParts} expected physical parts were collected across {finished.poCount} PO{finished.poCount === 1 ? "" : "s"}.</p>
        </div>
      </div>
      {finished.remainingParts > 0 && <RemainingList lines={finished.lines} />}
      <Button className="min-h-12 w-full" onClick={onFinished}>
        {finishedActionLabel ?? (surface === "warehouse" ? "Start another pickup" : "Back to technician home")}
      </Button>
    </section>
  );

  if (!run) return (
    <section className="space-y-5">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Plan this factory pickup</h2>
        <p className="mt-1 text-sm text-slate-600">Add the POs you expect to collect. The factory can hand you their parts in any order.</p>
        <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); void addPlannedPo(); }}>
          <Input value={poNumber} onChange={(event) => setPoNumber(event.target.value)} placeholder="Factory PO number" maxLength={50} disabled={working || offline || blocked} className="h-12 text-base" />
          <Button type="submit" variant="outline" className="h-12 shrink-0" disabled={working || offline || blocked || !poNumber.trim()}><Plus className="mr-2 h-4 w-4" />Add PO</Button>
        </form>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {planned.length > 0 && <section className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-950">Pickup list</h3><span className="text-sm text-slate-600">{planned.length} PO{planned.length === 1 ? "" : "s"} · {plannedParts} parts</span></div>
        {planned.map((po) => <div key={po.orderId} className="flex items-center justify-between gap-3 rounded-xl border bg-slate-50 p-3">
          <div><p className="font-semibold">PO {po.poNumber}</p><p className="text-sm text-slate-600">Order #{po.orderNumber} · {po.pieces} pieces · {po.parts} parts to collect</p></div>
          <Button type="button" size="icon" variant="ghost" aria-label={`Remove PO ${po.poNumber}`} disabled={working} onClick={() => setPlanned((items) => items.filter((item) => item.orderId !== po.orderId))}><X className="h-4 w-4" /></Button>
        </div>)}
        <Button className="min-h-12 w-full" disabled={working || offline || blocked} onClick={() => void startPickup()}>{working ? "Starting…" : "Start pickup"}</Button>
      </section>}
      {!planned.length && <p className="rounded-xl border border-dashed bg-white p-5 text-center text-sm text-slate-500">Add at least one PO to start the pickup.</p>}
    </section>
  );

  return (
    <section className="space-y-4">
      <div className="sticky top-2 z-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Active factory pickup</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{run.collectedParts} / {run.expectedParts}</p>
            <p className="text-sm text-slate-600">physical parts collected · {run.remainingParts} remaining</p>
          </div>
          <div className="text-right text-sm"><p className="font-semibold">{run.poCount} PO{run.poCount === 1 ? "" : "s"}</p><p className="text-slate-500">Pickup #{run.id}</p></div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-red-600 transition-all" style={{ width: `${run.expectedParts ? Math.min(100, (run.collectedParts / run.expectedParts) * 100) : 0}%` }} /></div>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {undoMessage && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{undoMessage}</p>}

      {candidate && <section className="space-y-4 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4">
        <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><h3 className="font-semibold text-amber-950">PO {candidate.candidate.poNumber} is not included in this pickup.</h3><p className="mt-1 text-sm text-amber-900">This part belongs to Order #{candidate.candidate.orderNumber}. Add the entire PO to the pickup and record this same scan?</p></div></div>
        <div className="rounded-xl bg-white/80 p-3 text-sm"><p className="font-semibold">Mark {candidate.candidate.mark || "—"} · {candidate.candidate.product}</p><p className="text-slate-600">{[candidate.candidate.system, candidate.candidate.configuration].filter(Boolean).join(" · ")}</p><p className="mt-1 font-mono text-xs">Line {candidate.candidate.lineNumber}</p><p className="mt-2">PO adds <b>{candidate.candidate.pieces} pieces · {candidate.candidate.parts} parts</b> remaining at the factory.</p></div>
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="min-h-12" disabled={working} onClick={() => saveCandidate(null)}>Cancel</Button><Button className="min-h-12" disabled={working || offline || blocked} onClick={() => void confirmAddPo()}>{working ? "Adding…" : "Add PO to pickup"}</Button></div>
      </section>}

      {!candidate && !finishing && <ScanPad<ReadResult>
        key={`${surface}:${actorId}:pickup:${run.id}`}
        scope={`${surface}:${actorId}:pickup:${run.id}`}
        persistent
        mobileFocus
        disabled={offline || blocked || working}
        onPendingChange={setScanBusy}
        onScanModeChange={onScanModeChange}
        onRead={async (barcode, requestKey) => ({ ...(await pickupScan(run.id, barcode, requestKey)), barcode, requestKey } as ReadResult)}
        onSaved={(result) => {
          setError("");
          if (result.kind === "PO_NOT_INCLUDED") {
            saveCandidate({ barcode: result.barcode, requestKey: result.requestKey, candidate: result.candidate });
            return;
          }
          setRun(result.pickup); setLast(result); setUndoMessage(""); undoKey.current = "";
        }}
      />}

      {last && !candidate && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4" role="status">
        <p className="flex items-center gap-2 font-semibold text-emerald-800"><PackageCheck className="h-5 w-5" />{last.replayed ? "Already recorded. No duplicate added." : "Collected · In transit"}</p>
        <p className="mt-2 font-semibold">PO {last.stock.poNumber} · Mark {last.stock.mark || "—"} · {last.stock.product}</p>
        <p className="text-sm text-slate-600">{[last.stock.system, last.stock.configuration].filter(Boolean).join(" · ")}</p>
        <p className="mt-1 font-mono text-xs">Line {last.stock.lineNumber}</p>
        <p className="mt-2 text-sm">This line: <b>{last.pickup.lines.find((line) => line.lineNumber === last.stock.lineNumber)?.collected ?? 0} / {last.pickup.lines.find((line) => line.lineNumber === last.stock.lineNumber)?.targetParts ?? last.stock.expectedParts ?? "—"}</b> collected for this pickup.</p>
        {surface === "warehouse" && <Button type="button" variant="outline" className="mt-3 min-h-11" disabled={busy || offline || blocked} onClick={() => void undoLastCollection()}>
          <Undo2 className="mr-2 h-4 w-4" />{undoing ? "Reversing…" : "Undo last reading"}
        </Button>}
      </section>}

      <section className="space-y-2 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-950">PO progress</h3><span className="text-xs text-slate-500">Any scan order</span></div>
        {run.orders.map((order) => <div key={order.orderId} className="rounded-xl border bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">PO {order.poNumber}</p><p className="text-xs text-slate-500">Order #{order.orderNumber} · {order.pieces} pieces{order.addedDuringPickup ? " · Added during pickup" : ""}</p></div><div className="text-right"><p className={`font-semibold ${order.remainingParts ? "text-slate-950" : "text-emerald-700"}`}>{order.collectedParts} / {order.expectedParts}</p><p className="text-xs text-slate-500">{order.remainingParts ? `${order.remainingParts} remaining` : "Complete"}</p></div></div>
        </div>)}
      </section>

      <Button variant="outline" className="min-h-12 w-full" onClick={() => setShowRemaining((value) => !value)}>
        {showRemaining ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
        {showRemaining ? "Hide remaining parts" : `View remaining (${run.remainingParts})`}
      </Button>
      {showRemaining && (remaining.length ? <RemainingList lines={remaining} /> : <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">All expected parts in this pickup have been scanned.</p>)}

      {!finishing ? <Button className="min-h-12 w-full" variant={run.remainingParts ? "outline" : "default"} disabled={busy || offline || blocked || Boolean(candidate)} onClick={() => { setFinishing(true); setShowRemaining(run.remainingParts > 0); setError(""); }}>Finish pickup</Button> : <section className="space-y-4 rounded-2xl border-2 border-slate-900 bg-white p-5">
        <h3 className="text-lg font-semibold">{run.remainingParts ? "Finish partial pickup" : "Complete pickup"}</h3>
        {run.remainingParts ? <><p className="text-sm text-slate-600"><b>{run.remainingParts} parts are still remaining.</b> Review the pieces above before leaving the factory.</p><div className="space-y-2"><Label htmlFor="pickup-reason">Reason</Label><select id="pickup-reason" value={reason} onChange={(event) => setReason(event.target.value as FactoryPickupPartialReason | "")} className="h-12 w-full rounded-md border bg-white px-3 text-base"><option value="">Choose a reason</option>{reasonOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div></> : <p className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">All {run.expectedParts} expected physical parts have been collected.</p>}
        <div className="space-y-2"><Label htmlFor="pickup-note">Note (optional)</Label><textarea id="pickup-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} className="w-full rounded-md border bg-white p-3 text-sm" /></div>
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="min-h-12" disabled={working} onClick={() => setFinishing(false)}>Continue scanning</Button><Button className="min-h-12" disabled={working || offline || blocked || (run.remainingParts > 0 && !reason)} onClick={() => void finishPickup()}>{working ? "Finishing…" : run.remainingParts ? "Finish partial pickup" : "Complete pickup"}</Button></div>
      </section>}
    </section>
  );
}
