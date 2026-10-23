"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { technicianScan, technicianState, type TechnicianScanResult, type TechnicianState } from "@/app/api/technician.api";
import { Button } from "@/components/ui/button";
import { ScanPad } from "@/app/warehouse/scan-pad";
import { StoreSelect } from "@/app/warehouse/store-select";
import { UnitOrigin } from "@/app/warehouse/unit-origin";

export function TechnicianReleaseScan({ actorId, initial, initialStoreId }: { actorId: number; initial: TechnicianState; initialStoreId: string }) {
  const { user, revalidate } = useAuth();
  const identity = useRef({ id: user?.id, role: user?.role?.name });
  identity.current = { id: user?.id, role: user?.role?.name };
  const [state, setState] = useState(initial), [storeId, setStoreId] = useState(initialStoreId);
  const [busy, setBusy] = useState(false), [offline, setOffline] = useState(false);
  const [last, setLast] = useState<TechnicianScanResult | null>(null);
  const ownerMatches = user?.id === actorId && user?.role?.name === "technician";
  const target = state.stores.find(store => String(store.id) === storeId);
  const selected = storeId === "unassigned" || Boolean(target);
  useEffect(() => {
    const refresh = () => { setOffline(!navigator.onLine); if (navigator.onLine) void technicianState().then(setState).catch(() => {}); };
    refresh(); window.addEventListener("online", refresh); window.addEventListener("offline", refresh); window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("online", refresh); window.removeEventListener("offline", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  if (!ownerMatches) return <p role="alert">Your account has changed. Return to technician home and sign in with the original account.</p>;
  return <div className="space-y-5">
    <Button asChild variant="outline" disabled={busy}><Link href={`/technician/warehouse/releases${storeId ? `?storeId=${storeId}` : ""}`} onClick={event => { if (busy) event.preventDefault(); }}>Back to release selection</Link></Button>
    <h1 className="text-2xl font-semibold">Release to installation</h1>
    <section className="space-y-3 rounded-xl border bg-white p-4"><p className="text-sm font-medium">Source store</p><StoreSelect stores={state.stores} value={storeId} onChange={value => { setStoreId(value); setLast(null); }} allowUnassigned disabled={busy} /><p className="text-sm text-slate-600">Each scan releases one part from this store for installation.</p></section>
    {offline && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm">No connection. Reconnect before releasing parts.</p>}
    {state.countOpen && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm">A physical count is in progress. Releases are paused until it is closed.</p>}
    {selected && <ScanPad<TechnicianScanResult> key={`${actorId}:${storeId}`} scope={`technician:${actorId}:RELEASE:${storeId}`} persistent disabled={offline || (!busy && state.countOpen)} onPendingChange={setBusy}
      onRead={async (barcode, requestKey) => {
        const account = await revalidate();
        if (account?.id !== actorId || account.role?.name !== "technician" || identity.current.id !== actorId || identity.current.role !== "technician") throw new Error("Your account has changed. Sign in with the original technician account to continue.");
        return technicianScan(barcode, "RELEASE", requestKey, storeId === "unassigned" ? null : Number(storeId));
      }}
      onSaved={result => { setLast(result); void technicianState().then(setState).catch(() => {}); }} />}
    {last && <section role="status" className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="flex items-center gap-2 font-semibold text-emerald-900"><CheckCircle2 className="size-5" />{last.replayed ? "Already recorded. No duplicate added." : "Released to installation"}</p><p className="text-sm">{last.stock.mark || "No mark"} · {last.stock.product}</p><p className="text-sm"><UnitOrigin unit={last.stock} /> · PO {last.stock.poNumber || "—"}</p><p className="font-mono text-sm">{last.stock.barcode}</p><p className="text-sm">From {target?.name ?? "Unassigned"} · {new Date(last.movement.createdAt).toLocaleString()}</p><Link className="text-sm font-medium underline" href="/technician/warehouse/history">My releases</Link></section>}
  </div>;
}
