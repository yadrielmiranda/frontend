"use client";

import { useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { warehouseRequestKey } from "@/app/api/warehouse.api";
import { MaterialBarcodeCamera } from "./material-barcode-camera";

export const materialInputClass = "flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50";
export const materialPanelClass = "space-y-4 rounded-xl border bg-white p-5";
export const money = (value: string | number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
export const quantity = (value: string | number) => Number(value).toLocaleString("en-US", { maximumFractionDigits: 3 });
export const errorText = (error: unknown) => error instanceof Error ? error.message : "Unable to complete this action. Please try again.";

export function MaterialField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block min-w-0 space-y-1.5 text-sm"><span className="font-medium">{label}</span>{children}{hint && <span className="block text-xs font-normal text-muted-foreground">{hint}</span>}</label>;
}

export function MaterialNotice({ error, success }: { error?: string; success?: string }) {
  return <>{error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{success && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}</>;
}

export function MaterialSubmit({ busy, children, disabled }: { busy: boolean; children: ReactNode; disabled?: boolean }) {
  return <Button type="submit" disabled={busy || disabled}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{children}</Button>;
}

export function MaterialScan({ onScan, disabled, embedded = false, buttonLabel = "Find material" }: { onScan: (code: string) => Promise<void>; disabled?: boolean; embedded?: boolean; buttonLabel?: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function find(value: string) {
    if (!value.trim() || disabled || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    setCode(value);
    try { await onScan(value.trim()); setCode(""); } catch (e) { setError(errorText(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  const controls = <>
    <Input aria-label="Scan or enter a material barcode" placeholder="Scan or enter a barcode" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={120} value={code} disabled={busy || disabled} onChange={event => setCode(event.target.value)} onKeyDown={event => {
      // Keyboard readers often finish with Enter. Never submit an enclosing stock form.
      if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); void find(event.currentTarget.value); }
    }} />
    <div className="flex flex-wrap gap-2 sm:flex-nowrap">
      <MaterialBarcodeCamera disabled={busy || disabled} onDetected={value => { void find(value); }} />
      <Button type="button" disabled={busy || disabled || !code.trim()} onClick={() => { void find(code); }}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{buttonLabel}</Button>
    </div>
  </>;
  return <div className="space-y-2">{embedded
    ? <div className="flex flex-col gap-2 sm:flex-row">{controls}</div>
    : <form className="flex flex-col gap-2 sm:flex-row" onSubmit={event => { event.preventDefault(); event.stopPropagation(); void find(code); }}>{controls}</form>
  }<MaterialNotice error={error} /></div>;
}

/** Pending mutations keep their keys across reads and retries until that mutation succeeds. */
export function useMaterialAction() {
  const lock = useRef(false);
  const pending = useRef(new Map<string, string>());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function execute(action: () => Promise<void>, message: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setSuccess("");
    try { await action(); setSuccess(message); }
    catch (e) { setError(errorText(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function run(body: unknown, action: (requestKey: string) => Promise<void>, message = "Saved.") {
    await execute(async () => {
      const encoded = JSON.stringify(body);
      const key = pending.current.get(encoded) ?? warehouseRequestKey();
      pending.current.set(encoded, key);
      await action(key);
      pending.current.delete(encoded);
    }, message);
  }
  const read = (action: () => Promise<void>, message = "") => execute(action, message);
  return { run, read, busy, error, success, clear: () => { setError(""); setSuccess(""); } };
}
