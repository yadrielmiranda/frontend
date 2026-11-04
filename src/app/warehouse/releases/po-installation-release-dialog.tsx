"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, PackageMinus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, isApiError } from "@/app/api/_base";
import { warehouseRequestKey, type FactoryPartCounts, type WarehousePoGroup, type WarehouseUnit } from "@/app/api/warehouse.api";
import { poInstallationReleaseOptions, releasePoToInstallation, type PoInstallationReleaseRequest, type PoInstallationReleaseResult } from "@/app/api/po-installation-release.api";
import { FactoryPartQuantity } from "../factory-part-quantity";
import { displayedFactoryParts, factoryBarcode, factoryPartSource, factoryPartsText, factoryPartsTotal, factoryPartTypes, selectedFactoryParts } from "../factory-parts";
import { CountNotice, errorMessage } from "../warehouse-shared";

type SelectionLine = { unit: WarehouseUnit; storeId: number | null; storeName: string; available: number; quantity: string; parts?: FactoryPartCounts };
type SnapshotLine = { barcode: string; lineNumber: string; description: string; mark: string; storeId: number | null; storeName: string; quantity: number; parts?: FactoryPartCounts };
type PendingRelease = { body: PoInstallationReleaseRequest; poLabel: string; storeId: string; lines: SnapshotLine[] };
const storageKey = (actorId: number) => `warehouse-po-installation-release:${actorId}`;
const positiveId = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const validScope = (value: unknown): value is string => typeof value === "string" && (value === "all" || value === "unassigned" || (/^[1-9]\d*$/.test(value) && positiveId(Number(value))));
const validParts = (parts: FactoryPartCounts | undefined, quantity: number) => parts === undefined || (parts !== null && typeof parts === "object" && Object.keys(parts).every(type => factoryPartTypes.includes(type as typeof factoryPartTypes[number])) && Object.values(parts).every(count => Number.isInteger(count) && count! >= 0) && factoryPartsTotal(parts) === quantity);
const definitive = (error: unknown) => isApiError(error) && error.status >= 400 && error.status < 500 && ![401, 403, 408, 429].includes(error.status);

function readPending(actorId: number): PendingRelease | null {
  const raw = localStorage.getItem(storageKey(actorId));
  if (!raw) return null;
  const value = JSON.parse(raw) as PendingRelease;
  const body = value?.body;
  if (!body || !/^(order|external):[1-9]\d*$/.test(body.poKey) || !Number.isSafeInteger(Number(body.poKey.split(":")[1])) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestKey) ||
    !validScope(value.storeId) || typeof value.poLabel !== "string" || !Array.isArray(body.items) || !body.items.length || body.items.length > 2000 ||
    !Array.isArray(value.lines) || value.lines.length !== body.items.length) throw new Error("The pending installation release could not be recovered. Keep this page open and contact an administrator.");
  const origins = new Set<string>();
  for (let index = 0; index < body.items.length; index++) {
    const item = body.items[index], line = value.lines[index];
    if (!item || typeof item.barcode !== "string" || !factoryBarcode(item.barcode) || (item.storeId !== null && !positiveId(item.storeId)) ||
      !Number.isSafeInteger(item.version) || item.version < 0 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 200 || !validParts(item.parts, item.quantity) ||
      !line || line.barcode !== item.barcode || line.storeId !== item.storeId || line.quantity !== item.quantity || line.lineNumber !== factoryBarcode(item.barcode)?.lineNumber ||
      typeof line.description !== "string" || typeof line.mark !== "string" || typeof line.storeName !== "string" || !validParts(line.parts, line.quantity)) throw new Error("The saved installation release is incomplete. Keep this page open and contact an administrator.");
    const key = `${line.lineNumber}:${item.storeId}`;
    if (origins.has(key)) throw new Error("The saved installation release contains duplicate parts. Contact an administrator before continuing.");
    origins.add(key);
  }
  return value;
}

export function pendingPoInstallationRelease(actorId: number): { poKey: string; poLabel: string; storeId: string } | null {
  const pending = readPending(actorId);
  return pending ? { poKey: pending.body.poKey, poLabel: pending.poLabel, storeId: pending.storeId } : null;
}

function selectAvailable(group: WarehousePoGroup, scope: string): SelectionLine[] {
  if (!validScope(scope)) throw new Error("Choose a valid storage filter before continuing.");
  const lines = group.units.flatMap(unit => [
    ...unit.stores.filter(store => store.onHand > 0 && (scope === "all" || scope === String(store.id))).map(store => ({ unit, storeId: store.id, storeName: store.name, available: store.onHand, quantity: String(store.onHand) })),
    ...(unit.unassigned > 0 && (scope === "all" || scope === "unassigned") ? [{ unit, storeId: null, storeName: "Unassigned", available: unit.unassigned, quantity: String(unit.unassigned) }] : []),
  ]);
  if (new Set(lines.map(line => line.unit.lineNumber)).size > 500 || lines.length > 2000) throw new Error("This PO has too many pieces or locations for one release. Choose one storage and try again.");
  return lines;
}

function prepare(lines: SelectionLine[], poKey: string, poLabel: string, storeId: string, requestKey: string): PendingRelease {
  const items: PoInstallationReleaseRequest["items"] = [], snapshot: SnapshotLine[] = [];
  for (const line of lines) {
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 200 || quantity > line.available) throw new Error(`Enter an available whole number from 0 to ${Math.min(line.available, 200)} for line ${line.unit.lineNumber}.`);
    if (!quantity) continue;
    const available = factoryPartSource(line.unit.partTracking, "WAREHOUSE", line.storeId === null ? "unassigned" : String(line.storeId));
    const parts = selectedFactoryParts(available, quantity, line.parts);
    items.push({ barcode: line.unit.barcode, storeId: line.storeId, version: line.unit.version, quantity, ...(parts ? { parts } : {}) });
    snapshot.push({ barcode: line.unit.barcode, lineNumber: line.unit.lineNumber, description: line.unit.description || [line.unit.product, line.unit.system, line.unit.configuration].filter(Boolean).join(" · "), mark: line.unit.mark,
      storeId: line.storeId, storeName: line.storeName, quantity, ...(available ? { parts: displayedFactoryParts(available, quantity, parts) } : {}) });
  }
  if (!items.length) throw new Error("Select at least one physical part to release.");
  return { body: { requestKey, poKey, items }, poLabel, storeId, lines: snapshot };
}

export function PoInstallationReleaseDialog({ open, onOpenChange, poKey, poLabel, storeId = "all", onComplete }: {
  open: boolean; onOpenChange: (open: boolean) => void; poKey: string; poLabel?: string; storeId?: string; onComplete?: () => void;
}) {
  const { user, revalidate } = useAuth();
  const actorId = user?.id, actorRole = user?.role?.name;
  const allowed = actorRole === "admin" || actorRole === "operator" || actorRole === "technician";
  const identity = `${actorId ?? ""}:${actorRole ?? ""}:${poKey}:${storeId}`;
  const liveIdentity = useRef(identity); liveIdentity.current = identity;
  const mounted = useRef(true), savingRef = useRef(false), notified = useRef("");
  const completion = useRef(onComplete); completion.current = onComplete;
  const [lines, setLines] = useState<SelectionLine[]>([]);
  const [pending, setPending] = useState<PendingRelease | null>(null);
  const [saved, setSaved] = useState<PoInstallationReleaseResult | null>(null);
  const [ready, setReady] = useState(false), [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [offline, setOffline] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [legacyPath, setLegacyPath] = useState("");
  const [countId, setCountId] = useState<number | null>(null), [refresh, setRefresh] = useState(0);
  const label = poLabel || poKey;
  let preview = pending, selectionError = "";
  if (!pending && lines.length) { try { preview = prepare(lines, poKey, label, storeId, "preview"); } catch (e) { selectionError = errorMessage(e); } }
  const totalParts = preview?.body.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const totalPieces = new Set(preview?.lines.map(line => line.lineNumber) ?? []).size;
  const locked = saving || Boolean(pending) || Boolean(saved) || !ready || loading || offline;

  useEffect(() => {
    mounted.current = true;
    const connection = () => setOffline(!navigator.onLine); connection();
    window.addEventListener("online", connection); window.addEventListener("offline", connection);
    return () => { mounted.current = false; window.removeEventListener("online", connection); window.removeEventListener("offline", connection); };
  }, []);

  useEffect(() => { savingRef.current = false; setSaving(false); setNotice(""); }, [identity, open, storeId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const current = () => !cancelled && mounted.current && liveIdentity.current === identity;
    setReady(false); setLoading(false); setLines([]); setPending(null); setSaved(null); setLegacyPath(""); setCountId(null); setError("");
    if (!allowed || !actorId) { setError("Sign in with an authorized warehouse account before continuing."); return; }
    try {
      const previous = readPending(actorId);
      if (previous) {
        if (previous.body.poKey !== poKey) { setError(`An unconfirmed release for PO ${previous.poLabel} must be recovered first. Reload inventory to recover it.`); return; }
        setPending(previous); setReady(true); return;
      }
      for (const prefix of ["warehouse", "technician"]) {
        if (sessionStorage.getItem(`${prefix}-installation-release:${actorId}`)) {
          setLegacyPath(prefix === "technician" ? "/technician/warehouse/releases/new" : "/warehouse/releases/new");
          setError("Another installation release is waiting for confirmation. Recover it before starting a new release."); return;
        }
      }
      if (!validScope(storeId)) throw new Error("Choose a valid storage filter before continuing.");
      if (!navigator.onLine) { setError("Reconnect and refresh to load the available parts."); return; }
      setLoading(true);
      poInstallationReleaseOptions(poKey, storeId).then(result => {
        if (!current()) return;
        if (result.group.key !== poKey) throw new Error("The returned PO does not match this release. Refresh and try again.");
        setLines(selectAvailable(result.group, storeId)); setCountId(result.activeCountId); setReady(true);
      }).catch(e => { if (current()) setError(errorMessage(e)); }).finally(() => { if (current()) setLoading(false); });
    } catch (e) { if (current()) setError(errorMessage(e)); }
    return () => { cancelled = true; };
  }, [open, identity, actorId, allowed, poKey, storeId, refresh]);

  async function confirm() {
    if (savingRef.current || saved || !open || !ready || !allowed || !actorId || !navigator.onLine || (!pending && (loading || countId || selectionError || !preview))) return;
    savingRef.current = true; setSaving(true); setError(""); setNotice("");
    let attempt = pending;
    const current = () => mounted.current && liveIdentity.current === identity;
    try {
      const account = await revalidate();
      if (!current() || account?.id !== actorId || account?.role?.name !== actorRole) throw new ApiError("Your account changed. Sign in with the original account to recover this release.", 403);
      const stored = readPending(actorId);
      if (stored && (!attempt || stored.body.requestKey !== attempt.body.requestKey)) {
        if (stored.body.poKey === poKey) setPending(stored);
        else { setReady(false); setError(`An unconfirmed release for PO ${stored.poLabel} must be recovered first. Reload inventory to recover it.`); }
        return;
      }
      if (!attempt) {
        for (const prefix of ["warehouse", "technician"]) {
          if (sessionStorage.getItem(`${prefix}-installation-release:${actorId}`)) throw new Error("Another installation release is waiting for confirmation. Recover it before starting a new release.");
        }
        attempt = prepare(lines, poKey, label, storeId, warehouseRequestKey());
        localStorage.setItem(storageKey(actorId), JSON.stringify(attempt)); setPending(attempt);
      }
      const result = await releasePoToInstallation(attempt.body);
      if (!current()) return;
      setSaved(result); setPending(null);
      try { if (readPending(actorId)?.body.requestKey === attempt.body.requestKey) localStorage.removeItem(storageKey(actorId)); } catch { /* The same saved request remains safe to recover after a reload. */ }
      if (notified.current !== attempt.body.requestKey) {
        notified.current = attempt.body.requestKey;
        try { completion.current?.(); } catch { /* The release remains confirmed if the inventory refresh fails. */ }
      }
    } catch (e) {
      if (!current()) return;
      if (attempt && definitive(e)) {
        try { if (readPending(actorId)?.body.requestKey === attempt.body.requestKey) localStorage.removeItem(storageKey(actorId)); }
        catch { setError("The rejected release could not be cleared. Keep this page open and contact an administrator."); return; }
        setPending(null); setLines([]); setReady(false); setRefresh(value => value + 1);
        setNotice(`${errorMessage(e)} Review the updated available quantities before confirming again.`);
      } else setError(attempt ? `${errorMessage(e)} Use Check release to confirm the original request without releasing parts twice.` : errorMessage(e));
    } finally { if (current()) { savingRef.current = false; setSaving(false); } }
  }

  function close(next: boolean) { if (!savingRef.current) onOpenChange(next); }
  return <Dialog open={open} onOpenChange={close}>
    <DialogContent showCloseButton={!saving} className="flex max-h-[90dvh] flex-col sm:max-w-2xl" onEscapeKeyDown={event => { if (savingRef.current) event.preventDefault(); }} onInteractOutside={event => { if (savingRef.current) event.preventDefault(); }}>
      <DialogHeader><DialogTitle>Release PO {label} to installation</DialogTitle><DialogDescription>{saved ? "The warehouse release is complete." : "Review the pieces and quantities. Set a quantity to zero to leave it in storage."}</DialogDescription></DialogHeader>
      <div className="min-h-0 space-y-4 overflow-y-auto py-1">
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="text-sm text-amber-800">{notice}</p>}
        {legacyPath && <Button asChild variant="outline"><Link href={legacyPath}>Recover previous release</Link></Button>}
        {offline && <p role="status" className="text-sm text-amber-800">Reconnect before confirming this release.</p>}
        {saved ? <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-emerald-800"><CheckCircle2 className="h-5 w-5" />Release recorded</p>
          <p>{saved.units} pieces · {saved.parts} physical parts</p>
          {saved.stores.map(store => <p key={store.storeId ?? "unassigned"} className="text-sm">{store.storeName}: {store.parts} parts</p>)}
        </div> : <>
          {!pending && countId && <CountNotice id={countId} />}
          {loading && <p role="status" className="text-sm text-muted-foreground">Loading this PO’s available parts…</p>}
          {pending ? <>
            <p className="text-sm text-amber-800">This release is waiting for confirmation. Its original quantities are saved below.</p>
            {pending.lines.map(line => <div key={`${line.lineNumber}:${line.storeId}`} className="rounded-lg border p-3 text-sm"><p className="font-medium">{line.description || `Line ${line.lineNumber}`}</p><p className="text-muted-foreground">Line {line.lineNumber}{line.mark ? ` · Mark ${line.mark}` : ""} · {line.storeName}</p><p className="mt-1">{line.quantity} parts{line.parts ? ` · ${factoryPartsText(line.parts)}` : ""}</p></div>)}
          </> : [...new Set(lines.map(line => line.unit.lineNumber))].map(lineNumber => {
            const origins = lines.filter(line => line.unit.lineNumber === lineNumber), unit = origins[0].unit;
            return <section key={lineNumber} className="rounded-xl border p-4">
              <p className="text-sm font-medium">{unit.description || [unit.product, unit.system, unit.configuration].filter(Boolean).join(" · ") || `Line ${lineNumber}`}</p>
              <p className="mt-1 text-xs text-muted-foreground">Line {lineNumber}{unit.mark ? ` · Mark ${unit.mark}` : ""}</p>
              <div className="mt-3 divide-y">{origins.map(line => <div key={line.storeId ?? "unassigned"} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="text-sm"><p className="font-medium">{line.storeName}</p><p className="text-xs text-muted-foreground">{line.available} parts available</p></div>
                <FactoryPartQuantity tracking={unit.partTracking} source="WAREHOUSE" storeId={line.storeId === null ? "unassigned" : String(line.storeId)} quantity={line.quantity} parts={line.parts} max={line.available} min={0} label={`Release line ${lineNumber} from ${line.storeName}`} disabled={locked || Boolean(countId)} onChange={next => setLines(previous => previous.map(row => row.unit.lineNumber === lineNumber && row.storeId === line.storeId ? { ...row, ...next } : row))} />
              </div>)}</div>
            </section>;
          })}
          {!loading && ready && !pending && !lines.length && <p className="text-sm text-muted-foreground">This PO has no available parts in the selected storage.</p>}
          {!pending && selectionError && <p role="alert" className="text-sm text-red-700">{selectionError}</p>}
        </>}
      </div>
      <DialogFooter className="items-center gap-3 border-t pt-4">
        {saved ? <Button onClick={() => close(false)}>Done</Button> : <>
          <p className="mr-auto text-sm">{totalPieces} pieces · {totalParts} physical parts</p>
          {!pending && <Button variant="outline" size="icon" aria-label="Refresh available parts" disabled={saving || loading || offline || Boolean(legacyPath)} onClick={() => setRefresh(value => value + 1)}><RefreshCw className="h-4 w-4" /></Button>}
          <Button disabled={saving || !ready || offline || !allowed || (!pending && (loading || Boolean(countId) || Boolean(selectionError) || !preview))} onClick={confirm}><PackageMinus className="mr-2 h-4 w-4" />{saving ? "Confirming…" : pending ? "Check release" : "Confirm release"}</Button>
        </>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
