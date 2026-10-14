"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, RefreshCw, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isApiError } from "@/app/api/_base";
import { technicianCustomerDeliveryOptions, technicianDeliverToCustomer, type TechnicianCustomerDeliveryOptions, type TechnicianCustomerDeliveryPo } from "@/app/api/technician.api";
import { warehouseRequestKey, type CustomerDelivery, type CustomerDeliveryRequest } from "@/app/api/warehouse.api";
import type { SignatureStrokes } from "@/app/api/contracts.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/estimates/agreements/signature-pad";
import { CustomerDeliveryReceipt, type CustomerDeliveryPreview } from "@/app/warehouse/customer-deliveries/customer-delivery-receipt";
import { hasDeliverySignature, MAX_DELIVERY_PIECES } from "@/app/warehouse/customer-deliveries/customer-delivery-selection";
import { pendingCustomerDeliveryKey, selectedCustomerDeliveryLines, technicianCustomerDeliveryPreview, technicianCustomerDeliveryRequest, type TechnicianPoSelection } from "./customer-delivery-selection";

type PendingDelivery = { body: CustomerDeliveryRequest; receipt: CustomerDeliveryPreview };
const message = (reason: unknown) => reason instanceof Error ? reason.message : "The delivery could not be completed.";

export function TechnicianCustomerDeliveryClient({ actorId, initial, initialPoKey, embedded }: {
  actorId: number;
  initial: TechnicianCustomerDeliveryOptions;
  initialPoKey?: string;
  embedded?: { pickupRunId: number; blocked?: boolean; onClose: () => void; onComplete: (delivery: CustomerDelivery) => void };
}) {
  const { user, isLoading, revalidate } = useAuth();
  const router = useRouter();
  const embeddedMode = Boolean(embedded), pickupRunId = embedded?.pickupRunId;
  const ownerMatches = user?.id === actorId && user?.role?.name === "technician";
  const liveIdentity = useRef({ id: user?.id, role: user?.role?.name });
  liveIdentity.current = { id: user?.id, role: user?.role?.name };
  const [data, setData] = useState(initial);
  const [poKey, setPoKey] = useState(initialPoKey);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<TechnicianPoSelection>(() => {
    const chosen = initial.items.find(po => po.key === initialPoKey);
    return chosen ? { [chosen.key]: chosen } : {};
  });
  const [review, setReview] = useState(() => {
    if (!initialPoKey || initial.countOpen) return false;
    try { selectedCustomerDeliveryLines(selection); return true; } catch { return false; }
  });
  const [firstName, setFirstName] = useState(""), [lastName, setLastName] = useState("");
  const [signature, setSignature] = useState<SignatureStrokes>([]), [accepted, setAccepted] = useState(false);
  const [ready, setReady] = useState(false), [loading, setLoading] = useState(false), [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingDelivery | null>(null);
  const [error, setError] = useState(""), [needsReview, setNeedsReview] = useState(false);
  const [offline, setOffline] = useState(false), [savedId, setSavedId] = useState<number | null>(null);
  const [savedDelivery, setSavedDelivery] = useState<CustomerDelivery | null>(null);
  const serial = useRef(0), saveLock = useRef(false), heading = useRef<HTMLHeadingElement>(null);
  const storageKey = pendingCustomerDeliveryKey(actorId);
  const selected = Object.values(selection);
  const preview = pending?.receipt ?? technicianCustomerDeliveryPreview(selection, firstName, lastName, signature);
  const locked = Boolean(pending) || savedId !== null;
  const busy = !ready || loading || saving;
  const deliveryBlocked = data.countOpen || Boolean(embedded?.blocked);
  const visiblePos = embedded ? data.items.filter(po => po.key === initialPoKey) : data.items;
  let selectionError = "";
  try { selectedCustomerDeliveryLines(selection); } catch (reason) { selectionError = message(reason); }

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const value = JSON.parse(saved) as PendingDelivery;
        if (value.body?.source !== "TRANSIT" || !value.body.requestKey || !Array.isArray(value.body.items) || !value.body.items.length || !value.receipt?.items?.length)
          throw new Error("Invalid pending delivery");
        setPending(value); setFirstName(value.body.firstName); setLastName(value.body.lastName);
        setSignature(value.body.signatureStrokes); setAccepted(true); setReview(true);
        setError("A previous delivery is awaiting confirmation. Use Check delivery to recover its receipt without releasing the parts twice.");
      }
      setReady(true);
    } catch {
      setError("The pending delivery could not be loaded. Keep this page open and contact an administrator before recording another delivery.");
    }
  }, [storageKey]);
  useEffect(() => {
    const connection = () => setOffline(!navigator.onLine);
    connection(); window.addEventListener("online", connection); window.addEventListener("offline", connection);
    return () => { window.removeEventListener("online", connection); window.removeEventListener("offline", connection); };
  }, []);
  const refresh = useCallback(async () => {
    if (!ready || !ownerMatches || review || locked || offline) return;
    const sequence = ++serial.current;
    setLoading(true);
    try {
      const next = await technicianCustomerDeliveryOptions({ search: embeddedMode ? "" : search, poKey: embeddedMode ? initialPoKey : poKey, page: embeddedMode ? 1 : page, pageSize: 20, ...(pickupRunId ? { pickupRunId } : {}) });
      if (sequence === serial.current) {
        setData(next); setError("");
        if (embeddedMode) {
          const chosen = next.items.find(po => po.key === initialPoKey);
          setSelection(chosen ? { [chosen.key]: chosen } : {});
          setSignature([]); setAccepted(false);
        }
      }
    } catch (reason) { if (sequence === serial.current) setError(message(reason)); }
    finally { if (sequence === serial.current) setLoading(false); }
  }, [ready, ownerMatches, review, locked, offline, search, poKey, page, embeddedMode, initialPoKey, pickupRunId]);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 250);
    return () => { clearTimeout(timer); serial.current++; };
  }, [refresh]);
  useEffect(() => {
    if (review) { heading.current?.focus(); heading.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  }, [review]);
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);

  function toggle(po: TechnicianCustomerDeliveryPo, checked: boolean) {
    if (busy || locked || review || embedded) return;
    const next = { ...selection };
    if (checked) next[po.key] = po; else delete next[po.key];
    if (Object.values(next).reduce((sum, value) => sum + value.lines.length, 0) > MAX_DELIVERY_PIECES) {
      setError(`Select at most ${MAX_DELIVERY_PIECES} pieces in one delivery.`); return;
    }
    setSelection(next); setSignature([]); setAccepted(false); setError("");
  }
  function beginReview() {
    if (busy || locked || offline || selectionError || deliveryBlocked) return;
    setSignature([]); setAccepted(false); setNeedsReview(false); setError(""); setReview(true);
  }
  function changeRecipient(field: "first" | "last", value: string) {
    if (field === "first") setFirstName(value); else setLastName(value);
    setSignature([]); setAccepted(false);
  }
  async function confirmDelivery() {
    if (saveLock.current || !ready || !review || !ownerMatches || offline || savedId !== null) return;
    if (!pending && (!accepted || needsReview || selectionError || deliveryBlocked)) return;
    saveLock.current = true; setSaving(true); setError("");
    let attempt = pending, verified = false;
    try {
      const account = await revalidate();
      if (account?.id !== actorId || account.role?.name !== "technician" || liveIdentity.current.id !== actorId || liveIdentity.current.role !== "technician")
        throw new Error("Your account has changed. Sign in with the original technician account to continue this delivery.");
      verified = true;
      if (!attempt) {
        const body = { ...technicianCustomerDeliveryRequest(selection, firstName, lastName, signature, warehouseRequestKey()), ...(pickupRunId ? { pickupRunId } : {}) };
        const proposed = { body, receipt: { ...preview, firstName: body.firstName, lastName: body.lastName, signatureStrokes: body.signatureStrokes } };
        // Save the exact signed request before sending so a lost response can be retried safely.
        try { sessionStorage.setItem(storageKey, JSON.stringify(proposed)); }
        catch { throw new Error("Browser storage is unavailable. Enable site storage before confirming the delivery. Nothing was sent."); }
        attempt = proposed; setPending(proposed);
      }
      const result = await technicianDeliverToCustomer(attempt.body);
      setSavedId(result.id); setSavedDelivery(result); setPending(null);
      if (!embedded) {
        try { sessionStorage.removeItem(storageKey); } catch { /* A retry still returns the saved receipt. */ }
      }
      if (!embedded) router.replace(`/technician/customer-deliveries/${result.id}`);
    } catch (reason) {
      if (!verified) setError(message(reason));
      else if (isApiError(reason) && [400, 403, 404, 409, 422].includes(reason.status)) {
        setPending(null); setSignature([]); setAccepted(false); setNeedsReview(true);
        try { sessionStorage.removeItem(storageKey); } catch { /* Keep the request available for recovery if storage is unavailable. */ }
        setError(`${message(reason)} ${embedded ? "Refresh the PO and review the delivery again." : "Return to the PO list, refresh and review the delivery again."}`);
      } else if (attempt) setError("The delivery could not be confirmed. Use Check delivery to recover its receipt. The same parts will not be released twice.");
      else setError(message(reason));
    } finally { setSaving(false); saveLock.current = false; }
  }

  if (isLoading) return <p role="status">Verifying your session…</p>;
  if (!ownerMatches) return <p role="alert" className="rounded-xl border bg-amber-50 p-4">Your account has changed. {embedded ? "Sign in with the original technician account to continue this delivery." : <><Link href="/technician" className="underline">Return to technician home</Link> and sign in with the original account.</>}</p>;
  return <div className="space-y-5">
    <header className="space-y-3">
      {embedded ? savedId === null && <Button variant="outline" className="min-h-11" disabled={!ready || saving || Boolean(pending)} onClick={() => { if (ready && !saveLock.current && !pending) embedded.onClose(); }}><ArrowLeft className="mr-2 size-4" />Back to pickup</Button> : !locked && !saving && <Button asChild variant="outline" className="min-h-11"><Link href="/technician"><ArrowLeft className="mr-2 size-4" />Technician home</Link></Button>}
      <h1 className="text-2xl font-semibold text-slate-950">Deliver to customer</h1>
      <p className="text-sm text-slate-600">{embedded ? "Review the collected parts with the recipient, then continue this pickup. No second scan is required." : "Choose the POs you are handing over directly from the factory. No second scan is required."}</p>
    </header>
    {offline && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No connection. Reconnect before confirming the delivery.</p>}
    {deliveryBlocked && savedId === null && !pending && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{data.countOpen ? "A physical count is in progress. Deliveries are paused until it is closed." : "Deliveries are temporarily paused. Return to the pickup to check its status."}</p>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {savedId !== null ? <>
      <section role="status" className="space-y-4 rounded-xl bg-emerald-50 p-5"><p className="font-semibold">Delivery recorded. The signed receipt is saved.</p>
        {embedded && savedDelivery ? <div className="flex flex-wrap gap-3"><Button className="min-h-12" disabled={saving} onClick={() => {
          if (saveLock.current) return;
          try { sessionStorage.removeItem(storageKey); }
          catch { setError("The delivery is saved, but its confirmation could not be cleared from this browser. Try Continue pickup again."); return; }
          embedded.onComplete(savedDelivery);
        }}>Continue pickup</Button><Button asChild variant="outline"><Link href={`/technician/customer-deliveries/${savedId}`} target="_blank" rel="noopener noreferrer">Open signed receipt</Link></Button></div> : <Button asChild><Link href={`/technician/customer-deliveries/${savedId}`}>Open signed receipt</Link></Button>}
      </section>
      {embedded && savedDelivery && <CustomerDeliveryReceipt delivery={savedDelivery} />}
    </> : review ? <>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 ref={heading} tabIndex={-1} className="text-lg font-semibold outline-none">Review with the recipient</h2><Button variant="outline" className="min-h-11" disabled={saving || locked} onClick={() => { setReview(false); setSignature([]); setAccepted(false); setError(""); }}>{embedded ? "Review PO selection" : "Back to PO list"}</Button></div>
      <CustomerDeliveryReceipt delivery={preview} showSignature={false} />
      <section className="space-y-5 rounded-2xl border bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Received by</h2>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="delivery-first-name">First name</Label><Input id="delivery-first-name" autoComplete="given-name" className="min-h-12 text-base" maxLength={100} value={firstName} disabled={saving || locked} onChange={event => changeRecipient("first", event.target.value)} /></div><div className="space-y-2"><Label htmlFor="delivery-last-name">Last name</Label><Input id="delivery-last-name" autoComplete="family-name" className="min-h-12 text-base" maxLength={100} value={lastName} disabled={saving || locked} onChange={event => changeRecipient("last", event.target.value)} /></div></div>
        <div className="space-y-2"><p className="text-sm font-medium">Recipient signature</p><SignaturePad value={signature} onChange={value => { setSignature(value); setAccepted(false); }} disabled={saving || locked} /></div>
        <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-5 shrink-0" checked={accepted} disabled={saving || locked} onChange={event => setAccepted(event.target.checked)} /><span>I confirm that I have received the POs, pieces and parts listed above.</span></label>
        <Button className="min-h-12 w-full" disabled={saving || offline || !ready || (!pending && (deliveryBlocked || needsReview || Boolean(selectionError) || !firstName.trim() || !lastName.trim() || !hasDeliverySignature(signature) || !accepted))} onClick={confirmDelivery}><CheckCircle2 className="mr-2 size-4" />{saving ? "Saving…" : pending ? "Check delivery" : "Confirm signed delivery"}</Button>
      </section>
    </> : <>
      <section className="space-y-4 rounded-2xl border bg-white p-4">
        <p className="text-sm text-slate-600">{embedded ? "This receipt includes the available parts collected in this pickup for the selected PO." : "Each PO includes all its available parts collected on your assigned pickups."} Only the parts listed on the receipt will be delivered.</p>
        {!embedded && <div className="relative"><Search className="absolute left-3 top-4 size-4 text-slate-400" /><Input aria-label="Find a PO" className="min-h-12 pl-9 text-base" placeholder="Find by PO or order (optional)" maxLength={150} value={search} disabled={busy || locked} onChange={event => { setSearch(event.target.value); setPage(1); }} /></div>}
        <div className="flex flex-wrap gap-2">{poKey && !embedded && <Button variant="outline" className="min-h-11" disabled={busy || locked} onClick={() => { setPoKey(undefined); setPage(1); }}>Show all available POs</Button>}<Button variant="outline" className="min-h-11" disabled={busy || locked || offline} onClick={() => { setSelection({}); setSignature([]); setAccepted(false); void refresh(); }}><RefreshCw className="mr-2 size-4" />{embedded ? "Refresh PO" : "Refresh / clear selection"}</Button></div>
      </section>
      {selected.length > 0 && <section className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-semibold">{selected.length} PO{selected.length === 1 ? "" : "s"} selected · {preview.totalParts} parts</p>{!embedded && <div className="flex flex-wrap gap-2">{selected.map(po => <Button key={po.key} size="sm" variant="outline" disabled={busy || locked} aria-label={`Remove PO ${po.poNumber}`} onClick={() => toggle(po, false)}>PO {po.poNumber} ×</Button>)}</div>}</section>}
      {selected.length > 0 && selectionError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{selectionError}</p>}
      {loading && <p role="status" className="text-sm text-slate-600">Loading available POs…</p>}
      {!loading && !visiblePos.length && <p className="rounded-xl border bg-white p-5 text-sm text-slate-600">{embedded ? "This PO has no collected parts available for delivery. Return to the pickup to continue collecting." : "No collected POs are available for delivery. Collect and scan the parts in an assigned pickup first, or clear your search."}</p>}
      <div className="space-y-3">{visiblePos.map(po => {
        const checked = Boolean(selection[po.key]);
        const partial = po.expectedParts !== null && po.availableParts < po.expectedParts;
        return <label key={po.key} className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 ${checked ? "border-red-500 ring-1 ring-red-500" : "border-slate-200"}`}>
          <input type="checkbox" className="mt-1 size-6 shrink-0 accent-red-600" aria-label={`Select PO ${po.poNumber}`} checked={checked} disabled={Boolean(embedded) || busy || locked || offline || deliveryBlocked || !po.availableParts} onChange={event => toggle(po, event.target.checked)} />
          <div className="min-w-0 flex-1 [overflow-wrap:anywhere]"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="text-lg font-semibold">PO {po.poNumber || "—"}</h2><p className="font-semibold">{po.availableParts} parts</p></div><p className="mt-1 text-sm text-slate-600">{po.orderNumber ? `Order ${po.orderNumber}` : "External PO"}{po.customerName || po.projectName ? ` · ${po.customerName || po.projectName}` : ""}</p><p className="mt-2 text-sm text-slate-600">{po.pieces} pieces available to deliver</p>{partial && <p className="mt-2 text-sm text-amber-800">Partial PO: {po.availableParts} of {po.expectedParts} expected parts are available for this delivery.</p>}</div>
        </label>;
      })}</div>
      {!embedded && data.total > data.pageSize && <div className="flex items-center justify-between gap-2"><Button variant="outline" className="min-h-11" disabled={busy || page <= 1} onClick={() => setPage(value => value - 1)}>Previous</Button><span className="text-sm">Page {page} of {Math.ceil(data.total / data.pageSize)}</span><Button variant="outline" className="min-h-11" disabled={busy || page * data.pageSize >= data.total} onClick={() => setPage(value => value + 1)}>Next</Button></div>}
      <div className="sticky bottom-0 space-y-2 rounded-2xl border bg-white p-4 shadow-lg"><p className="text-sm text-slate-600">{selected.length} POs · {preview.totalPieces} pieces · {preview.totalParts} parts</p><Button className="min-h-12 w-full" disabled={busy || locked || offline || Boolean(selectionError) || deliveryBlocked} onClick={beginReview}>Deliver to customer</Button></div>
    </>}
  </div>;
}
