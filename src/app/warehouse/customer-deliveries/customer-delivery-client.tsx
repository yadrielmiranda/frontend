"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardCheck, RefreshCw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/estimates/agreements/signature-pad";
import { useAuth } from "@/contexts/AuthContext";
import type { SignatureStrokes } from "@/app/api/contracts.api";
import { ApiError, isApiError } from "@/app/api/_base";
import {
  warehouseDeliverToCustomer, warehouseInventory, warehouseRequestKey, warehouseStores, warehouseUnit,
  type CustomerDeliveryRequest, type Inventory, type WarehouseStore, type WarehouseUnit,
} from "@/app/api/warehouse.api";
import { CountNotice, errorMessage, Pagination } from "../warehouse-shared";
import { StoreSelect } from "../store-select";
import { ScanPad } from "../scan-pad";
import { UnitOrigin } from "../unit-origin";
import { CustomerDeliveryReceipt, type CustomerDeliveryPreview } from "./customer-delivery-receipt";
import {
  customerDeliveryRequest, deliveryAvailable, deliveryItems, hasDeliverySignature, MAX_DELIVERY_PIECES,
  type DeliverySelection, type DeliverySource,
} from "./customer-delivery-selection";

type PendingDelivery = { body: CustomerDeliveryRequest; receipt: CustomerDeliveryPreview };

export function CustomerDeliveryClient({ actorId, actorRole, initial, initialStores, initialSource, initialStoreId, initialSearch = "" }: {
  actorId: number; actorRole: string; initial: Inventory; initialStores: WarehouseStore[];
  initialSource: DeliverySource; initialStoreId: string; initialSearch?: string;
}) {
  const router = useRouter();
  const { user, revalidate } = useAuth();
  const liveIdentity = useRef({ id: user?.id, role: user?.role?.name });
  liveIdentity.current = { id: user?.id, role: user?.role?.name };
  const ownerMatches = user?.id === actorId && user?.role?.name === actorRole;
  const [source, setSource] = useState(initialSource), [storeId, setStoreId] = useState(initialStoreId);
  const [data, setData] = useState(initial), [stores, setStores] = useState(initialStores);
  const [search, setSearch] = useState(initialSearch), [page, setPage] = useState(1);
  const [selection, setSelection] = useState<DeliverySelection>({});
  const [review, setReview] = useState(false), [scan, setScan] = useState(false), [reading, setReading] = useState(false);
  const [firstName, setFirstName] = useState(""), [lastName, setLastName] = useState("");
  const [signature, setSignature] = useState<SignatureStrokes>([]), [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false), [selecting, setSelecting] = useState(false), [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingDelivery | null>(null), [ready, setReady] = useState(false);
  const [error, setError] = useState(""), [savedId, setSavedId] = useState<number | null>(null);
  const [needsReview, setNeedsReview] = useState(false);
  const serial = useRef(0), saveLock = useRef(false), scannerSelection = useRef(selection);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  scannerSelection.current = selection;
  const storageKey = `warehouse-customer-delivery:${actorId}`;
  const chosen = Object.values(selection), totalParts = chosen.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  const target = stores.find((store) => String(store.id) === storeId);
  const validSource = source === "TRANSIT" || storeId === "unassigned" || Boolean(target);
  const busy = !ready || loading || selecting || saving || reading;
  const locked = Boolean(pending) || savedId !== null;
  let selectionError = "";
  try { deliveryItems(selection, source, storeId); } catch (e) { selectionError = errorMessage(e); }
  const preview: CustomerDeliveryPreview = pending?.receipt ?? {
    source, storeId: source === "WAREHOUSE" && storeId !== "unassigned" ? Number(storeId) : null,
    storeName: source === "TRANSIT" ? null : target?.name ?? "Unassigned",
    firstName: firstName.trim(), lastName: lastName.trim(), signatureStrokes: signature,
    items: chosen.map(({ unit, quantity }) => ({
      lineNumber: unit.lineNumber, barcode: unit.barcode, poNumber: unit.poNumber, source: unit.source,
      orderNumber: unit.orderNumber, mark: unit.mark, description: unit.description, product: unit.product,
      system: unit.system, configuration: unit.configuration, quantity: Number(quantity),
    })).sort((a, b) => a.lineNumber.localeCompare(b.lineNumber)),
    totalPieces: chosen.length, totalParts,
  };

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const value = JSON.parse(saved) as PendingDelivery;
        if (!value.body?.requestKey || !Array.isArray(value.body.items) || !value.receipt?.items)
          throw new Error("Invalid pending delivery");
        setPending(value); setSource(value.body.source);
        setStoreId(value.body.source === "WAREHOUSE" ? value.body.storeId === null ? "unassigned" : String(value.body.storeId) : "");
        setFirstName(value.body.firstName); setLastName(value.body.lastName);
        setSignature(value.body.signatureStrokes); setAccepted(true); setReview(true);
        setError("A previous delivery has not been confirmed. Use Check delivery to recover its receipt without releasing the parts twice.");
      }
      setReady(true);
    } catch {
      setError("The pending delivery could not be loaded. Keep this page open and contact an administrator before recording another delivery.");
    }
  }, [storageKey]);

  const refresh = useCallback(async () => {
    if (!ownerMatches || !ready || review || pending || savedId !== null || (source === "WAREHOUSE" && !storeId)) return;
    const sequence = ++serial.current;
    setLoading(true);
    try {
      const [next, nextStores] = await Promise.all([
        warehouseInventory({ view: source === "TRANSIT" ? "in_transit" : "on_hand", storeId: source === "WAREHOUSE" ? storeId : undefined, search, page }),
        warehouseStores(),
      ]);
      if (sequence === serial.current) { setData(next); setStores(nextStores); }
    } catch (e) { if (sequence === serial.current) setError(errorMessage(e)); }
    finally { if (sequence === serial.current) setLoading(false); }
  }, [ownerMatches, ready, review, pending, savedId, source, storeId, search, page]);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 250);
    return () => { clearTimeout(timer); serial.current++; };
  }, [refresh]);
  useEffect(() => {
    if (review) { reviewHeading.current?.focus(); reviewHeading.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  }, [review]);
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);

  function changeSource(next: DeliverySource, location = "") {
    serial.current++; setSource(next); setStoreId(location); setPage(1); setSelection({}); setError(""); setScan(false); setLoading(Boolean(location) || next === "TRANSIT");
  }
  function toggle(unit: WarehouseUnit, checked: boolean) {
    setSelection((previous) => {
      const next = { ...previous };
      if (!checked) delete next[unit.lineNumber];
      else if (Object.keys(next).length < MAX_DELIVERY_PIECES)
        next[unit.lineNumber] = { unit, quantity: String(deliveryAvailable(unit, source, storeId)) };
      return next;
    });
    setError("");
  }
  function selectPage(checked: boolean) {
    setSelection((previous) => {
      const next = { ...previous };
      for (const unit of data.items) {
        if (!checked) delete next[unit.lineNumber];
        else if (!next[unit.lineNumber] && deliveryAvailable(unit, source, storeId) > 0 && Object.keys(next).length < MAX_DELIVERY_PIECES)
          next[unit.lineNumber] = { unit, quantity: String(deliveryAvailable(unit, source, storeId)) };
      }
      return next;
    });
  }
  async function selectAll() {
    if (busy || review || locked || !validSource) return;
    setSelecting(true); setError("");
    try {
      const next = { ...selection };
      let total: number | undefined;
      let received = 0;
      for (let current = 1; ; current++) {
        const result = await warehouseInventory({ view: source === "TRANSIT" ? "in_transit" : "on_hand", storeId: source === "WAREHOUSE" ? storeId : undefined, search, page: current, pageSize: 100 });
        if (result.total > MAX_DELIVERY_PIECES || (total !== undefined && total !== result.total))
          throw new Error(`Refresh or narrow your search. Select at most ${MAX_DELIVERY_PIECES} pieces per delivery.`);
        total = result.total;
        for (const unit of result.items) {
          received++;
          if (!next[unit.lineNumber] && deliveryAvailable(unit, source, storeId) > 0)
            next[unit.lineNumber] = { unit, quantity: String(deliveryAvailable(unit, source, storeId)) };
        }
        if (Object.keys(next).length > MAX_DELIVERY_PIECES) throw new Error(`A delivery can contain at most ${MAX_DELIVERY_PIECES} pieces. Clear some selections first.`);
        if (current * 100 >= result.total) break;
      }
      if (received !== total) throw new Error("The available pieces changed. Refresh and select again.");
      setSelection(next);
    } catch (e) { setError(errorMessage(e)); }
    finally { setSelecting(false); }
  }
  async function readPart(barcode: string) {
    const unit = await warehouseUnit(barcode);
    const selected = scannerSelection.current[unit.lineNumber];
    if (selected && selected.unit.version !== unit.version)
      throw new ApiError("This piece changed. Remove it from the selection and scan again.", 409);
    if (!selected && Object.keys(scannerSelection.current).length >= MAX_DELIVERY_PIECES)
      throw new ApiError(`A delivery can contain at most ${MAX_DELIVERY_PIECES} pieces.`, 400);
    const quantity = Number(selected?.quantity ?? 0) + 1;
    if (!Number.isInteger(quantity) || quantity > 200 || quantity > deliveryAvailable(unit, source, storeId))
      throw new ApiError("No more parts of this piece are available at the selected location.", 400);
    return { unit, quantity: String(quantity) };
  }
  function beginReview() {
    if (busy || locked || !validSource || selectionError || data.activeCountId) return;
    setSignature([]); setAccepted(false); setNeedsReview(false); setError(""); setScan(false); setReview(true); setLoading(false);
  }
  function changeRecipient(field: "first" | "last", value: string) {
    if (field === "first") setFirstName(value); else setLastName(value);
    setSignature([]); setAccepted(false);
  }
  async function confirmDelivery() {
    if (saveLock.current || savedId !== null || !ready || !review || !ownerMatches) return;
    if (!pending && (!accepted || !validSource || selectionError || data.activeCountId || needsReview)) return;
    saveLock.current = true; setSaving(true); setError("");
    let attempt = pending;
    let verified = false;
    try {
      const account = await revalidate();
      if (!account || account.id !== actorId || account.role?.name !== actorRole ||
          liveIdentity.current.id !== actorId || liveIdentity.current.role !== actorRole ||
          !["admin", "operator"].includes(actorRole))
        throw new Error("Your account has changed. Sign in with the original account and reopen this delivery before continuing.");
      verified = true;
      if (!attempt) {
        const body = customerDeliveryRequest({ selection, source, storeId, firstName, lastName, signatureStrokes: signature, requestKey: warehouseRequestKey() });
        const proposed = { body, receipt: { ...preview, firstName: body.firstName, lastName: body.lastName, signatureStrokes: body.signatureStrokes } };
        // Persist the exact signed request before sending it; uncertain retries must never use an altered receipt.
        try { sessionStorage.setItem(storageKey, JSON.stringify(proposed)); }
        catch { throw new Error("Browser storage is unavailable. Enable site storage before confirming the delivery. Nothing was sent."); }
        attempt = proposed;
        setPending(attempt);
      }
      const result = await warehouseDeliverToCustomer(attempt.body);
      setSavedId(result.id); setPending(null);
      try { sessionStorage.removeItem(storageKey); } catch { /* Retrying this saved request will return the same receipt. */ }
      router.replace(`/warehouse/customer-deliveries/${result.id}`);
    } catch (e) {
      if (!verified) setError(errorMessage(e));
      else if (isApiError(e) && [400, 404, 409, 422].includes(e.status)) {
        setPending(null); setSignature([]); setAccepted(false); setNeedsReview(true);
        try { sessionStorage.removeItem(storageKey); } catch { /* Preserve the signed request if storage cannot be cleared. */ }
        setError(`${errorMessage(e)} Go back to the selection and review the delivery again.`);
      } else if (attempt) {
        setError("The delivery could not be confirmed. Use Check delivery to recover its receipt. The same parts will not be released twice.");
      } else setError(errorMessage(e));
    } finally { setSaving(false); saveLock.current = false; }
  }

  const availablePage = data.items.filter((unit) => deliveryAvailable(unit, source, storeId) > 0);
  const allPage = availablePage.length > 0 && availablePage.every((unit) => Boolean(selection[unit.lineNumber]));
  if (!ownerMatches) return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Your account has changed. Sign in with the original account and reopen this delivery before continuing.</p>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-semibold">Customer delivery</h2><p className="mt-1 text-sm text-muted-foreground">Select the parts being handed over, review the receipt with the recipient, then collect their signature.</p></div>
      {!locked && !saving && <Button asChild variant="outline"><Link href={source === "TRANSIT" ? "/warehouse/receipts" : "/warehouse"}>Back to {source === "TRANSIT" ? "pending receipt" : "inventory"}</Link></Button>}
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {savedId !== null ? <div role="status" className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5"><p className="font-medium">Delivery recorded. The receipt is saved.</p><Button asChild><Link href={`/warehouse/customer-deliveries/${savedId}`}>Open signed receipt</Link></Button></div> : review ? <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 ref={reviewHeading} tabIndex={-1} className="scroll-mt-28 text-lg font-semibold outline-none">Review with the recipient</h3><Button variant="outline" disabled={saving || locked} onClick={() => { setReview(false); setSignature([]); setAccepted(false); setError(""); }}>Back to selection</Button></div>
      <CustomerDeliveryReceipt delivery={preview} showSignature={false} />
      <section className="space-y-5 rounded-xl border bg-white p-5">
        <div><h3 className="font-semibold">Received by</h3><p className="mt-1 text-sm text-muted-foreground">Enter the name of the person receiving these parts.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="delivery-first-name">First name</Label><Input id="delivery-first-name" autoComplete="given-name" maxLength={100} value={firstName} disabled={saving || locked} onChange={(e) => changeRecipient("first", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="delivery-last-name">Last name</Label><Input id="delivery-last-name" autoComplete="family-name" maxLength={100} value={lastName} disabled={saving || locked} onChange={(e) => changeRecipient("last", e.target.value)} /></div>
        </div>
        <div className="space-y-2"><p className="text-sm font-medium">Recipient signature</p><SignaturePad value={signature} onChange={setSignature} disabled={saving || locked} /></div>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={accepted} disabled={saving || locked} onChange={(e) => setAccepted(e.target.checked)} /><span>I confirm that I have received the POs, pieces and parts listed above.</span></label>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{preview.totalPieces} pieces · {preview.totalParts} physical parts</p><Button disabled={saving || !ready || (!pending && (needsReview || !firstName.trim() || !lastName.trim() || !hasDeliverySignature(signature) || !accepted))} onClick={confirmDelivery}><CheckCircle2 className="mr-2 h-4 w-4" />{saving ? "Saving…" : pending ? "Check delivery" : "Confirm signed delivery"}</Button></div>
      </section>
    </div> : <>
      <CountNotice id={data.activeCountId} />
      <section className="space-y-4 rounded-xl border bg-white p-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Delivery source">{(["WAREHOUSE", "TRANSIT"] as const).map((value) => <Button key={value} variant={source === value ? "default" : "outline"} aria-pressed={source === value} disabled={busy || locked} onClick={() => changeSource(value)}>{value === "WAREHOUSE" ? "From warehouse" : "Directly from factory"}</Button>)}</div>
        {source === "TRANSIT" ? <p className="text-sm text-muted-foreground">Choose parts already collected and scanned at the factory. No second scan is required. The delivered parts leave transit without entering a warehouse.</p> : <div className="max-w-sm space-y-2"><p className="text-sm font-medium">Source store</p><StoreSelect stores={stores} value={storeId} onChange={(value) => changeSource("WAREHOUSE", value)} disabled={busy || locked} allowUnassigned includeInactive label="Customer delivery source store" /></div>}
      </section>
      {validSource && <>
        <div className="flex flex-wrap gap-3"><div className="relative min-w-60 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" aria-label="Search delivery pieces" placeholder="Search by PO, order, customer, line number or barcode" maxLength={150} value={search} disabled={busy || locked} onChange={(e) => { serial.current++; setSearch(e.target.value); setPage(1); setLoading(true); }} /></div><Button variant="outline" disabled={busy || locked} onClick={() => { setSelection({}); setError(""); void refresh(); }}><RefreshCw className="mr-2 h-4 w-4" />Refresh / clear selection</Button></div>
        {source === "WAREHOUSE" && <section className="space-y-3"><Button variant="outline" disabled={busy || locked} onClick={() => setScan((value) => !value)}>{scan ? "Hide scanner" : "Select parts by scanning"}</Button>{scan && <div className="rounded-xl border bg-white p-4"><p className="mb-3 text-sm text-muted-foreground">Each reading adds one part to this delivery. Stock changes only after the recipient signs and you confirm.</p><ScanPad<{ unit: WarehouseUnit; quantity: string }> key={`${source}:${storeId}`} scope={`customer-selection:${actorId}:${storeId}`} disabled={loading || selecting || saving || locked} onRead={readPart} onSaved={(entry) => { setSelection((previous) => ({ ...previous, [entry.unit.lineNumber]: entry })); setError(""); }} onPendingChange={setReading} /></div>}</section>}
        <div className="flex flex-wrap items-center gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={allPage} disabled={busy || locked || !availablePage.length} onChange={(e) => selectPage(e.target.checked)} />Select this page</label><Button size="sm" variant="outline" disabled={busy || locked || !data.total || data.total > MAX_DELIVERY_PIECES} onClick={selectAll}>{selecting ? "Selecting…" : "Select all matching pieces"}</Button><span className="text-muted-foreground">Selections stay when you search another PO or change pages.</span></div>
        <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Select", "PO / order", "Piece", "Available parts", "Deliver now"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y">{data.items.map((unit) => {
          const entry = selection[unit.lineNumber], available = deliveryAvailable(unit, source, storeId);
          return <tr key={unit.lineNumber} className={entry ? "bg-slate-50" : ""}><td className="px-4 py-4"><input type="checkbox" aria-label={`Select ${unit.barcode}`} checked={Boolean(entry)} disabled={busy || locked || available < 1 || (!entry && chosen.length >= MAX_DELIVERY_PIECES)} onChange={(e) => toggle(unit, e.target.checked)} /></td><td className="px-4 py-4"><p className="font-semibold">PO {unit.poNumber || "—"}</p><UnitOrigin unit={unit} /><p className="text-xs text-muted-foreground">{unit.customer || unit.project}</p></td><td className="px-4 py-4"><p className="font-medium">{unit.description || [unit.product, unit.system, unit.configuration].filter(Boolean).join(" · ")}</p>{unit.mark && <p className="text-xs text-muted-foreground">Mark: {unit.mark}</p>}<p className="text-xs text-muted-foreground">Line {unit.lineNumber}</p>{entry && entry.unit.version !== unit.version && <p className="text-xs text-red-700">Changed. Remove this selection and select again.</p>}</td><td className="px-4 py-4 font-semibold">{available}</td><td className="px-4 py-4"><Input className="w-24" type="number" min={1} max={Math.min(available, 200)} step={1} value={entry?.quantity ?? ""} disabled={busy || locked || !entry} aria-label={`Deliver parts for ${unit.barcode}`} onChange={(e) => setSelection((previous) => ({ ...previous, [unit.lineNumber]: { ...previous[unit.lineNumber], quantity: e.target.value } }))} /></td></tr>;
        })}{!data.items.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">No available parts match this selection.</td></tr>}</tbody></table></div>
        <Pagination {...data} label="pieces" disabled={busy || locked} onPage={(next) => { serial.current++; setLoading(true); setPage(next); }} />
      </>}
      {chosen.length > 0 && <section className="space-y-3 rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Selected for delivery</h3><p className="text-sm">{chosen.length} pieces · {totalParts} physical parts</p></div><div className="max-h-64 overflow-y-auto divide-y">{chosen.map(({ unit, quantity }) => <div key={unit.lineNumber} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0 text-sm"><p className="font-medium">PO {unit.poNumber || "—"} · Line {unit.lineNumber}</p><p className="text-xs text-muted-foreground">{unit.description || unit.product}</p></div><div className="flex shrink-0 items-center gap-2"><span className="text-sm">{quantity} parts</span><Button size="icon" variant="ghost" aria-label={`Remove ${unit.barcode}`} disabled={busy || locked} onClick={() => toggle(unit, false)}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>{selectionError && <p role="alert" className="text-sm text-red-700">{selectionError}</p>}<div className="flex justify-end"><Button disabled={busy || locked || !validSource || Boolean(selectionError) || Boolean(data.activeCountId)} onClick={beginReview}><ClipboardCheck className="mr-2 h-4 w-4" />Review delivery</Button></div></section>}
    </>}
  </div>;
}
