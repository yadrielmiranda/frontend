"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, CheckCircle2, ChevronRight, Factory, LogOut, Warehouse, WifiOff } from "lucide-react";
import brandLogo from "../../../public/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import type { AuthUser } from "@/app/types/auth";
import { logoutUser } from "@/app/api/auth/me/auth.api";
import { navigateAfterSessionChange } from "@/lib/auth-session";
import { technicianLogin, technicianScan, technicianState, type TechnicianState, type TechnicianScanResult } from "@/app/api/technician.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanPad } from "@/app/warehouse/scan-pad";
import { InstallApp } from "./install-app";
import { TechnicianReceipts, pendingReceiptKey, pendingInstallationDeliveryKey } from "./technician-receipts";
import { FactoryPickups } from "./factory-pickups";

type View = { operation: "HOME" | "COLLECT" | "RECEIVE" | "INSTALLATION_DELIVERY"; mode: "scan" | "select"; storeId: string };
const home: View = { operation: "HOME", mode: "scan", storeId: "" };
const message = (e: unknown) => e instanceof Error ? e.message : "The operation could not be completed.";

export function TechnicianPortal() {
  const { user, isLoading } = useAuth();
  // Colores limitados al portal técnico; no se modifica el tema del sistema general.
  return <div className="min-h-dvh bg-slate-50 [--primary:#dc2626] [--primary-foreground:#ffffff] [--ring:#dc2626] [--accent:#fef2f2] [--accent-foreground:#b91c1c]">
    <header className="bg-slate-950/95 shadow-lg shadow-slate-950/10">
      <div className="mx-auto flex min-h-20 max-w-2xl items-center gap-3 px-4 py-3">
        <Image
          src={brandLogo}
          alt=""
          width={25}
          height={60}
          className="h-12 w-auto shrink-0 object-contain"
          style={{ filter: "drop-shadow(0 0 1px rgba(226, 232, 240, 0.8)) drop-shadow(0 0 3px rgba(226, 232, 240, 0.3))" }}
          priority
        />
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-tight text-white">Authentic Evolution</p>
          <p className="mt-0.5 text-xs font-medium tracking-wide text-red-300">AE Technician</p>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-red-600/80 to-transparent" />
    </header>
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      {isLoading && !user ? <p role="status" className="py-12 text-center text-slate-600">Loading…</p> :
        user?.role.name === "technician" ? <TechnicianWorkspace key={user.id} user={user} /> : <TechnicianLogin />}
      <div className="mt-8"><InstallApp /></div>
    </div>
  </div>;
}

function TechnicianLogin() {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <section className="mx-auto max-w-md rounded-2xl border border-slate-200 border-t-4 border-t-red-600 bg-white p-5 shadow-lg shadow-slate-950/5 sm:p-6">
    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Technician sign in</h1>
    <p className="mt-2 text-sm text-slate-600">Use the technician account provided by your administrator.</p>
    <form className="mt-6 space-y-5" onSubmit={async (event) => {
      event.preventDefault(); if (busy) return;
      const form = new FormData(event.currentTarget);
      setBusy(true); setError("");
      try {
        await technicianLogin(String(form.get("username") ?? "").trim(), String(form.get("password") ?? ""));
        // Recarga completa: elimina el estado en memoria de cualquier cuenta anterior.
        navigateAfterSessionChange("/technician");
      } catch (e) { setError(message(e)); setBusy(false); }
    }}>
      <div className="space-y-2"><Label htmlFor="staff-username">Username</Label><Input id="staff-username" name="username" className="h-12 text-base" required autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={busy} /></div>
      <div className="space-y-2"><Label htmlFor="staff-password">Password</Label><Input id="staff-password" name="password" className="h-12 text-base" type="password" required minLength={8} autoComplete="current-password" disabled={busy} /></div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <Button className="h-12 w-full rounded-xl text-base font-semibold shadow-sm hover:bg-red-700" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
    <p className="mt-5 text-xs text-slate-500">Forgot your password? Contact your administrator.</p>
  </section>;
}

function TechnicianWorkspace({ user }: { user: AuthUser }) {
  const [view, setView] = useState<View>(home), [restored, setRestored] = useState(false);
  const [state, setState] = useState<TechnicianState | null>(null);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [signingOut, setSigningOut] = useState(false);
  const [offline, setOffline] = useState(false), [last, setLast] = useState<TechnicianScanResult | null>(null);
  const refreshLock = useRef(false);
  const storageKey = `technician-workspace:${user.id}`;
  const changeView = (next: View) => {
    setView(next); setLast(null); setError("");
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* El estado actual sigue en memoria. */ }
  };
  useEffect(() => {
    try {
      const receipt = JSON.parse(localStorage.getItem(pendingReceiptKey(user.id)) || "null");
      const delivery = JSON.parse(localStorage.getItem(pendingInstallationDeliveryKey(user.id)) || "null");
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (receipt && Number.isSafeInteger(receipt.storeId)) {
        setView({ operation: "RECEIVE", mode: "select", storeId: String(receipt.storeId) });
      } else if (delivery && Number.isSafeInteger(delivery.installation?.id)) {
        setView({ operation: "INSTALLATION_DELIVERY", mode: "select", storeId: "" });
      } else if (saved && ["HOME", "COLLECT", "RECEIVE", "INSTALLATION_DELIVERY"].includes(saved.operation) &&
        ["scan", "select"].includes(saved.mode) && typeof saved.storeId === "string") setView(saved);
    } catch { /* No se recuperan datos de navegador inválidos. */ }
    setRestored(true);
    const connection = () => setOffline(!navigator.onLine);
    connection(); window.addEventListener("online", connection); window.addEventListener("offline", connection);
    return () => { window.removeEventListener("online", connection); window.removeEventListener("offline", connection); };
  }, [storageKey, user.id]);
  const refresh = useCallback(async () => {
    if (refreshLock.current) return;
    refreshLock.current = true;
    try { setState(await technicianState()); setError(""); }
    catch (e) { setError(message(e)); }
    finally { refreshLock.current = false; }
  }, []);
  useEffect(() => {
    void refresh();
    const poll = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = setInterval(poll, 20000);
    window.addEventListener("focus", poll); window.addEventListener("online", poll);
    return () => { clearInterval(timer); window.removeEventListener("focus", poll); window.removeEventListener("online", poll); };
  }, [refresh]);
  const target = state?.stores.find((store) => String(store.id) === view.storeId);
  const blocked = offline || !state || state.countOpen || (view.operation === "RECEIVE" && !target);
  const scanning = view.operation === "RECEIVE" && view.mode === "scan";
  return <div className="space-y-5">
    <header className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-0 [overflow-wrap:anywhere]"><p className="font-semibold text-slate-950">{user.firstName} {user.lastName}</p><p className="mt-1 text-xs text-slate-500">{user.username} · Technician</p></div>
      <Button variant="outline" className="min-h-11 shrink-0 rounded-xl border-slate-200 text-slate-700" disabled={busy || signingOut} onClick={async () => {
        setSigningOut(true); setError("");
        try {
          window.dispatchEvent(new Event("auth:manual-logout"));
          await logoutUser();
          navigateAfterSessionChange("/technician");
        }
        catch (e) { setError(message(e)); setSigningOut(false); }
      }}><LogOut className="mr-2 h-4 w-4" />{signingOut ? "Signing out…" : "Sign out"}</Button>
    </header>
    {offline && <p role="alert" className="flex gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><WifiOff className="h-5 w-5 shrink-0" />No connection. Reconnect before scanning or receiving. Unconfirmed operations are not shown as saved.</p>}
    {state?.countOpen && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">A physical count is in progress. Material movements are paused until it is closed by authorized staff.</p>}
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-800"><p>{error}</p><Button variant="outline" className="mt-3 min-h-11" onClick={() => void refresh()}>Retry connection</Button></div>}
    {!restored ? <p role="status">Loading workspace…</p> : view.operation === "HOME" ? <>
      <h1 className="pt-1 text-2xl font-semibold tracking-tight text-slate-950">Choose an operation</h1>
      <button type="button" onClick={() => changeView({ operation: "COLLECT", mode: "scan", storeId: "" })} className="group flex min-h-32 w-full items-center gap-3 rounded-2xl border border-red-200 border-l-4 border-l-red-600 bg-white p-4 text-left shadow-sm transition-colors hover:bg-red-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 sm:gap-5 sm:p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100 sm:h-14 sm:w-14"><Factory className="h-7 w-7" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h2 className="text-lg font-semibold text-slate-950 sm:text-xl">Collect from factory</h2><p className="mt-1 text-sm text-slate-600">View your assigned pickups and scan parts together with other assigned technicians.</p></div>
        <ChevronRight className="hidden h-5 w-5 shrink-0 text-red-600 sm:block" aria-hidden="true" />
      </button>
      <button type="button" onClick={() => changeView({ operation: "RECEIVE", mode: "select", storeId: "" })} className="group flex min-h-32 w-full items-center gap-3 rounded-2xl border border-slate-200 border-l-4 border-l-slate-900 bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 sm:gap-5 sm:p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white sm:h-14 sm:w-14"><Warehouse className="h-7 w-7" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h2 className="text-lg font-semibold text-slate-950 sm:text-xl">Receive at warehouse</h2><p className="mt-1 text-sm text-slate-600">Choose the store and receive by selection or scan.</p></div>
        <ChevronRight className="hidden h-5 w-5 shrink-0 text-slate-500 sm:block" aria-hidden="true" />
      </button>
      <button type="button" onClick={() => changeView({ operation: "INSTALLATION_DELIVERY", mode: "select", storeId: "" })} className="group flex min-h-32 w-full items-center gap-3 rounded-2xl border border-slate-200 border-l-4 border-l-slate-900 bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 sm:gap-5 sm:p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white sm:h-14 sm:w-14"><CheckCircle2 className="h-7 w-7" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h2 className="text-lg font-semibold text-slate-950 sm:text-xl">Deliver to installation</h2><p className="mt-1 text-sm text-slate-600">Confirm factory-collected parts that have arrived at the job site.</p></div>
        <ChevronRight className="hidden h-5 w-5 shrink-0 text-slate-500 sm:block" aria-hidden="true" />
      </button>
    </> : <>
      <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => changeView(home)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{view.operation === "COLLECT" ? "Collect from factory" : view.operation === "INSTALLATION_DELIVERY" ? "Deliver to installation" : "Receive at warehouse"}</h1>
      {view.operation === "COLLECT" && <FactoryPickups
        actorId={user.id}
        offline={offline}
        blocked={!state || state.countOpen}
        onBusy={setBusy}
      />}
      {view.operation === "RECEIVE" && <div className="space-y-4 rounded-xl border bg-white p-4">
        <div className="space-y-2"><Label htmlFor="tech-store">Destination store</Label><select id="tech-store" className="h-12 w-full rounded-md border bg-white px-3 text-base" value={view.storeId} disabled={busy} onChange={(e) => changeView({ ...view, storeId: e.target.value })}>
          <option value="">Choose a store</option>
          {state?.stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
          {view.storeId && !target && <option value={view.storeId}>Previously selected store (unavailable)</option>}
        </select></div>
        {state && !state.stores.length && <p className="text-sm text-amber-800">An administrator must create an active store before receiving parts.</p>}
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Receipt method">
          {(["select", "scan"] as const).map((mode) => <Button key={mode} className="min-h-12" variant={view.mode === mode ? "default" : "outline"} disabled={busy} aria-pressed={view.mode === mode} onClick={() => changeView({ ...view, mode })}>{mode === "select" ? "Select pending parts" : "Scan parts"}</Button>)}
        </div>
      </div>}
      {scanning && (view.operation === "COLLECT" || view.storeId) && <ScanPad<TechnicianScanResult>
        key={`${user.id}:${view.operation}:${view.storeId}`}
        scope={`technician:${user.id}:${view.operation}:${view.storeId}`}
        persistent
        disabled={offline || (!busy && blocked)}
        onPendingChange={setBusy}
        onRead={(barcode, key) => technicianScan(barcode, "RECEIVE", key, Number(view.storeId))}
        onSaved={(result) => { setLast(result); void refresh(); }}
      />}
      {scanning && last && <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4" role="status">
        <p className="flex items-center gap-2 font-semibold text-emerald-800"><CheckCircle2 className="h-5 w-5" />{last.replayed ? "Already recorded. No duplicate added." : last.movement.type === "COLLECT" ? "Collected · In transit" : `Received · ${last.movement.toStore?.name ?? "Warehouse"}`}</p>
        <p className="text-sm font-semibold">{last.stock.mark || "No mark"} · {last.stock.product}</p>
        <p className="text-sm">Order #{last.stock.orderNumber}{last.stock.poNumber ? ` · PO ${last.stock.poNumber}` : ""}</p>
        <p className="font-mono text-sm">{last.stock.barcode}</p>
        <p className="text-sm">In transit: <b>{last.stock.inTransit}</b> · At warehouse: <b>{last.stock.onHand}</b>{last.stock.expectedParts !== null ? ` · Expected: ${last.stock.expectedParts}` : ""}</p>
        <p className="text-xs text-slate-600">Saved {new Date(last.movement.createdAt).toLocaleString()}</p>
      </section>}
      {view.operation === "RECEIVE" && view.mode === "select" && <TechnicianReceipts actorId={user.id} storeId={target?.id ?? null} storeName={target?.name ?? ""} blocked={blocked} offline={offline} onBusy={setBusy} onSaved={() => void refresh()} />}
      {view.operation === "INSTALLATION_DELIVERY" && <TechnicianReceipts delivering actorId={user.id} storeId={null} storeName="" blocked={blocked} offline={offline} onBusy={setBusy} onSaved={() => void refresh()} />}
    </>}
  </div>;
}
