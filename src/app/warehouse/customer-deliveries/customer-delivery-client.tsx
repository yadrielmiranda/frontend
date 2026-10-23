"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, RefreshCw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/estimates/agreements/signature-pad";
import { useAuth } from "@/contexts/AuthContext";
import type { SignatureStrokes } from "@/app/api/contracts.api";
import { ApiError, isApiError } from "@/app/api/_base";
import {
  warehouseDeliverToCustomer, warehouseInventoryByPo, warehouseRequestKey, warehouseStores, warehouseUnit,
  type CustomerDelivery, type CustomerDeliveryRequest, type WarehousePoGroup, type WarehousePoInventory, type WarehouseStoreRef, type WarehouseUnit,
} from "@/app/api/warehouse.api";
import { technicianWarehouseInventoryByPo, technicianWarehouseStores, technicianWarehouseUnit } from "@/app/api/technician-warehouse.api";
import { technicianDeliverToCustomer } from "@/app/api/technician.api";
import { CountNotice, errorMessage, Pagination } from "../warehouse-shared";
import { StoreSelect } from "../store-select";
import { ScanPad } from "../scan-pad";
import { UnitOrigin } from "../unit-origin";
import { CustomerDeliveryReceipt, type CustomerDeliveryPreview } from "./customer-delivery-receipt";
import { FactoryPartQuantity } from "../factory-part-quantity";
import { displayedFactoryParts, factoryBarcode, factoryPartSource, selectedFactoryParts } from "../factory-parts";
import {
  customerDeliveryRequest, deliveryAvailable, deliveryItems, deliveryPoSelected, deliveryPoUnits,
  hasDeliverySignature, MAX_DELIVERY_PIECES, selectDeliveryPos,
  type DeliverySelection, type DeliverySource,
} from "./customer-delivery-selection";

type PendingDelivery = { body: CustomerDeliveryRequest; receipt: CustomerDeliveryPreview };

export function CustomerDeliveryClient({ actorId, actorRole, initial, initialStores, initialSource, initialStoreId, initialSearch = "", initialPoKey = "", autoReviewPo = false, embedded, technician = false }: {
  actorId: number; actorRole: string; initial: WarehousePoInventory; initialStores: WarehouseStoreRef[]; technician?: boolean;
  initialSource: DeliverySource; initialStoreId: string; initialSearch?: string; initialPoKey?: string;
  autoReviewPo?: boolean;
  embedded?: { pickupRunId: number; blocked?: boolean; onClose: () => void; onComplete: (delivery: CustomerDelivery) => void };
}) {
  const inventoryApi = technician ? technicianWarehouseInventoryByPo : warehouseInventoryByPo;
  const storesApi = technician ? technicianWarehouseStores : warehouseStores;
  const unitApi = technician ? technicianWarehouseUnit : warehouseUnit;
  const deliverApi = technician ? technicianDeliverToCustomer : warehouseDeliverToCustomer;
  const receiptBase = technician ? "/technician/customer-deliveries" : "/warehouse/customer-deliveries";
  const router = useRouter();
  const { user, revalidate } = useAuth();
  const liveIdentity = useRef({ id: user?.id, role: user?.role?.name });
  liveIdentity.current = { id: user?.id, role: user?.role?.name };
  const ownerMatches = user?.id === actorId && user?.role?.name === actorRole;
  const [source, setSource] = useState(initialSource), [storeId, setStoreId] = useState(initialStoreId);
  const [data, setData] = useState(initial), [stores, setStores] = useState(initialStores);
  const [search, setSearch] = useState(initialSearch), [page, setPage] = useState(1);
  const [initialChoice] = useState(() => {
    if (!autoReviewPo || initialSource !== "TRANSIT" || !initialPoKey) return { selection: {} as DeliverySelection, error: "" };
    const group = initial.items.find((item) => item.key === initialPoKey);
    if (!group) return { selection: {} as DeliverySelection, error: "This PO has no collected parts available for delivery. Return to the pickup and refresh it." };
    try { return { selection: selectDeliveryPos({}, [group], "TRANSIT", "", true), error: "" }; }
    catch (e) { return { selection: {} as DeliverySelection, error: errorMessage(e) }; }
  });
  const [selection, setSelection] = useState<DeliverySelection>(initialChoice.selection);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [review, setReview] = useState(() => {
    if (!autoReviewPo || initial.activeCountId) return false;
    try { deliveryItems(initialChoice.selection, initialSource, initialStoreId); return true; } catch { return false; }
  }), [scan, setScan] = useState(false), [reading, setReading] = useState(false);
  const [firstName, setFirstName] = useState(""), [lastName, setLastName] = useState("");
  const [signature, setSignature] = useState<SignatureStrokes>([]), [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false), [selecting, setSelecting] = useState(false), [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingDelivery | null>(null), [ready, setReady] = useState(false);
  const [error, setError] = useState(initialChoice.error), [savedId, setSavedId] = useState<number | null>(null);
  const [savedDelivery, setSavedDelivery] = useState<CustomerDelivery | null>(null);
  const [offline, setOffline] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const serial = useRef(0), saveLock = useRef(false), scannerSelection = useRef(selection);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  scannerSelection.current = selection;
  const storageKey = `${technician ? "technician-store" : "warehouse"}-customer-delivery:${actorId}`;
  const chosen = Object.values(selection), totalParts = chosen.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  const target = stores.find((store) => String(store.id) === storeId);
  const validSource = source === "TRANSIT" || storeId === "unassigned" || Boolean(target);
  const busy = !ready || loading || selecting || saving || reading;
  const locked = Boolean(pending) || savedId !== null;
  const blocked = Boolean(data.activeCountId) || Boolean(embedded?.blocked);
  let selectionError = "";
  try { deliveryItems(selection, source, storeId); } catch (e) { selectionError = errorMessage(e); }
  const preview: CustomerDeliveryPreview = pending?.receipt ?? {
    source, storeId: source === "WAREHOUSE" && storeId !== "unassigned" ? Number(storeId) : null,
    storeName: source === "TRANSIT" ? null : target?.name ?? "Unassigned",
    firstName: firstName.trim(), lastName: lastName.trim(), signatureStrokes: signature,
    items: chosen.map(({ unit, quantity, parts }) => ({
      lineNumber: unit.lineNumber, barcode: unit.barcode, poNumber: unit.poNumber, source: unit.source,
      orderNumber: unit.orderNumber, mark: unit.mark, description: unit.description, product: unit.product,
      system: unit.system, configuration: unit.configuration, quantity: Number(quantity),
      ...(unit.partTracking ? { parts: displayedFactoryParts(factoryPartSource(unit.partTracking, source, storeId) ?? {}, Number(quantity), parts) } : {}),
    })).sort((a, b) => a.lineNumber.localeCompare(b.lineNumber)),
    totalPieces: chosen.length, totalParts,
  };

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const value = JSON.parse(saved) as PendingDelivery;
        if (!value.body?.requestKey || (technician && value.body.source !== "WAREHOUSE") || !Array.isArray(value.body.items) || !value.receipt?.items)
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
  }, [storageKey, technician]);

  useEffect(() => {
    const connection = () => setOffline(!navigator.onLine);
    connection(); window.addEventListener("online", connection); window.addEventListener("offline", connection);
    return () => { window.removeEventListener("online", connection); window.removeEventListener("offline", connection); };
  }, []);

  const refresh = useCallback(async () => {
    // The embedded pickup passes its own scoped quantities. Reopening the pickup refreshes them.
    if (embedded || !ownerMatches || !ready || review || pending || savedId !== null || (source === "WAREHOUSE" && !storeId)) return;
    const sequence = ++serial.current;
    setLoading(true);
    try {
      const [next, nextStores] = await Promise.all([
        inventoryApi({ view: source === "TRANSIT" ? "in_transit" : "on_hand", storeId: source === "WAREHOUSE" ? storeId : undefined, search, page, completePo: true, pageSize: 20 }),
        storesApi(),
      ]);
      if (sequence === serial.current) { setData(next); setStores(nextStores); }
    } catch (e) { if (sequence === serial.current) setError(errorMessage(e)); }
    finally { if (sequence === serial.current) setLoading(false); }
  }, [embedded, ownerMatches, ready, review, pending, savedId, source, storeId, search, page, inventoryApi, storesApi]);
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
    serial.current++; setSource(next); setStoreId(location); setPage(1); setSelection({}); setExpanded({}); setError(""); setScan(false); setLoading(Boolean(location) || next === "TRANSIT");
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
  function selectPos(groups: WarehousePoGroup[], checked: boolean) {
    try { setSelection(selectDeliveryPos(selection, groups, source, storeId, checked)); setError(""); }
    catch (e) { setError(errorMessage(e)); }
  }
  async function selectAll() {
    if (busy || review || locked || !validSource) return;
    setSelecting(true); setError("");
    try {
      let next = { ...selection };
      let total: number | undefined;
      let received = 0;
      for (let current = 1; ; current++) {
        const result = await inventoryApi({ view: source === "TRANSIT" ? "in_transit" : "on_hand", storeId: source === "WAREHOUSE" ? storeId : undefined, search, page: current, pageSize: 20, completePo: true });
        if (total !== undefined && total !== result.total)
          throw new Error("The available POs changed. Refresh and select again.");
        total = result.total;
        received += result.items.length;
        next = selectDeliveryPos(next, result.items, source, storeId, true);
        if (current * 20 >= result.total) break;
      }
      if (received !== total) throw new Error("The available pieces changed. Refresh and select again.");
      setSelection(next);
    } catch (e) { setError(errorMessage(e)); }
    finally { setSelecting(false); }
  }
  async function readPart(barcode: string) {
    const unit = await unitApi(barcode);
    const scanned = factoryBarcode(barcode);
    if (unit.partTracking?.types.includes("FRAME") && !scanned?.type)
      throw new ApiError("Choose whether this is a door panel or its frame.", 400, { code: "FACTORY_PART_TYPE_REQUIRED", types: unit.partTracking.types });
    const selected = scannerSelection.current[unit.lineNumber];
    if (selected && selected.unit.version !== unit.version)
      throw new ApiError("This piece changed. Remove it from the selection and scan again.", 409);
    if (!selected && Object.keys(scannerSelection.current).length >= MAX_DELIVERY_PIECES)
      throw new ApiError(`A delivery can contain at most ${MAX_DELIVERY_PIECES} pieces.`, 400);
    const quantity = Number(selected?.quantity ?? 0) + 1;
    if (!Number.isInteger(quantity) || quantity > 200 || quantity > deliveryAvailable(unit, source, storeId))
      throw new ApiError("No more parts of this piece are available at the selected location.", 400);
    const available = factoryPartSource(unit.partTracking, source, storeId);
    if (available && unit.partTracking) {
      const type = scanned?.type ?? unit.partTracking.types[0];
      if (!type || !unit.partTracking.types.includes(type))
        throw new ApiError("This barcode type does not belong to this piece.", 400);
      const current = displayedFactoryParts(available, Number(selected?.quantity ?? 0), selected?.parts);
      const parts = { ...current, [type]: (current[type] ?? 0) + 1 };
      if ((parts[type] ?? 0) > (unit.partTracking.expected[type] ?? 0))
        throw new ApiError(`All expected ${type === "FRAME" ? "frames" : type === "DOOR" ? "door panels" : "pieces"} are already selected.`, 400);
      try { selectedFactoryParts(available, quantity, parts); }
      catch { throw new ApiError("No more parts of this type are available at the selected location.", 400); }
      return { unit, quantity: String(quantity), parts };
    }
    return { unit, quantity: String(quantity) };
  }
  function beginReview() {
    if (busy || locked || !validSource || selectionError || blocked || offline) return;
    setSignature([]); setAccepted(false); setNeedsReview(false); setError(""); setScan(false); setReview(true); setLoading(false);
  }
  function changeRecipient(field: "first" | "last", value: string) {
    if (field === "first") setFirstName(value); else setLastName(value);
    setSignature([]); setAccepted(false);
  }
  async function confirmDelivery() {
    if (saveLock.current || savedId !== null || !ready || !review || !ownerMatches || offline) return;
    if (!pending && (!accepted || !validSource || selectionError || blocked || needsReview)) return;
    saveLock.current = true; setSaving(true); setError("");
    let attempt = pending;
    let verified = false;
    try {
      const account = await revalidate();
      if (!account || account.id !== actorId || account.role?.name !== actorRole ||
          liveIdentity.current.id !== actorId || liveIdentity.current.role !== actorRole ||
          !(technician ? actorRole === "technician" : ["admin", "operator"].includes(actorRole)))
        throw new Error("Your account has changed. Sign in with the original account and reopen this delivery before continuing.");
      verified = true;
      if (!attempt) {
        const body = customerDeliveryRequest({ selection, source, storeId, firstName, lastName, signatureStrokes: signature, requestKey: warehouseRequestKey() });
        if (embedded) body.pickupRunId = embedded.pickupRunId;
        const proposed = { body, receipt: { ...preview, firstName: body.firstName, lastName: body.lastName, signatureStrokes: body.signatureStrokes } };
        // Persist the exact signed request before sending it; uncertain retries must never use an altered receipt.
        try { sessionStorage.setItem(storageKey, JSON.stringify(proposed)); }
        catch { throw new Error("Browser storage is unavailable. Enable site storage before confirming the delivery. Nothing was sent."); }
        attempt = proposed;
        setPending(attempt);
      }
      const result = await deliverApi(attempt.body);
      setSavedId(result.id); setSavedDelivery(result); setPending(null);
      if (!embedded) {
        try { sessionStorage.removeItem(storageKey); } catch { /* Retrying this saved request will return the same receipt. */ }
        router.replace(`${receiptBase}/${result.id}`);
      }
    } catch (e) {
      if (!verified) setError(errorMessage(e));
      else if (isApiError(e) && [400, 403, 404, 409, 422].includes(e.status)) {
        setPending(null); setSignature([]); setAccepted(false); setNeedsReview(true);
        try { sessionStorage.removeItem(storageKey); } catch { /* Preserve the signed request if storage cannot be cleared. */ }
        setError(`${errorMessage(e)} ${embedded ? "Return to the pickup and reopen this PO to refresh its available parts." : "Go back to the selection and review the delivery again."}`);
      } else if (attempt) {
        setError("The delivery could not be confirmed. Use Check delivery to recover its receipt. The same parts will not be released twice.");
      } else setError(errorMessage(e));
    } finally { setSaving(false); saveLock.current = false; }
  }

  function continuePickup() {
    if (!embedded || !savedDelivery || saving) return;
    try { sessionStorage.removeItem(storageKey); }
    catch { setError("The delivery is saved, but its browser recovery data could not be cleared. Enable site storage and try Continue pickup again."); return; }
    embedded.onComplete(savedDelivery);
  }

  const visibleGroups = embedded ? data.items.filter((group) => group.key === initialPoKey) : data.items;
  const availablePage = visibleGroups.filter((group) => deliveryPoUnits(group, source, storeId).length > 0);
  const allPage = availablePage.length > 0 && availablePage.every((group) => deliveryPoSelected(group, selection, source, storeId));
  if (!ownerMatches) return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Your account has changed. Sign in with the original account and reopen this delivery before continuing.</p>;
  return <div className="space-y-5">
    {technician && !locked && !saving && <Button asChild variant="outline"><Link href="/technician">Technician home</Link></Button>}
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-semibold">Customer delivery</h2><p className="mt-1 text-sm text-muted-foreground">{embedded ? "Review the collected parts with the recipient and collect their signature." : "Choose the POs being handed over, then review the receipt with the recipient and collect their signature."}</p></div>
      {embedded ? savedId === null && <Button variant="outline" disabled={busy || locked} onClick={() => { if (!busy && !locked) embedded.onClose(); }}>Back to pickup</Button> : !technician && !locked && !saving && <Button asChild variant="outline"><Link href={source === "TRANSIT" ? "/warehouse/receipts" : "/warehouse"}>Back to {source === "TRANSIT" ? "pending receipt" : "inventory"}</Link></Button>}
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {embedded && blocked && savedId === null && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">A physical count is open. New deliveries are paused until it is closed.</p>}
    {offline && savedId === null && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">You are offline. Reconnect before confirming this delivery.</p>}
    {savedId !== null ? <div className="space-y-5"><div role="status" className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5"><p className="font-medium">Delivery recorded. The receipt is saved.</p>{embedded && savedDelivery ? <div className="flex flex-wrap gap-3"><Button disabled={saving} onClick={continuePickup}>Continue pickup</Button><Button asChild variant="outline"><Link href={`${receiptBase}/${savedId}`} target="_blank" rel="noopener noreferrer">Open signed receipt</Link></Button></div> : <Button asChild><Link href={`${receiptBase}/${savedId}`}>Open signed receipt</Link></Button>}</div>{embedded && savedDelivery && <CustomerDeliveryReceipt delivery={savedDelivery} />}</div> : review ? <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 ref={reviewHeading} tabIndex={-1} className="scroll-mt-28 text-lg font-semibold outline-none">Review with the recipient</h3>{(!embedded || !needsReview) && <Button variant="outline" disabled={saving || locked} onClick={() => { setReview(false); setSignature([]); setAccepted(false); setError(""); }}>Back to selection</Button>}</div>
      <CustomerDeliveryReceipt delivery={preview} showSignature={false} />
      <section className="space-y-5 rounded-xl border bg-white p-5">
        <div><h3 className="font-semibold">Received by</h3><p className="mt-1 text-sm text-muted-foreground">Enter the name of the person receiving these parts.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="delivery-first-name">First name</Label><Input id="delivery-first-name" autoComplete="given-name" maxLength={100} value={firstName} disabled={saving || locked} onChange={(e) => changeRecipient("first", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="delivery-last-name">Last name</Label><Input id="delivery-last-name" autoComplete="family-name" maxLength={100} value={lastName} disabled={saving || locked} onChange={(e) => changeRecipient("last", e.target.value)} /></div>
        </div>
        <div className="space-y-2"><p className="text-sm font-medium">Recipient signature</p><SignaturePad value={signature} onChange={setSignature} disabled={saving || locked} /></div>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={accepted} disabled={saving || locked} onChange={(e) => setAccepted(e.target.checked)} /><span>I confirm that I have received the POs, pieces and parts listed above.</span></label>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{preview.totalPieces} pieces · {preview.totalParts} physical parts</p><Button disabled={saving || !ready || offline || (!pending && (blocked || needsReview || !firstName.trim() || !lastName.trim() || !hasDeliverySignature(signature) || !accepted))} onClick={confirmDelivery}><CheckCircle2 className="mr-2 h-4 w-4" />{saving ? "Saving…" : pending ? "Check delivery" : "Confirm signed delivery"}</Button></div>
      </section>
    </div> : <>
      {technician ? data.activeCountId && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">A physical count is in progress. Deliveries are paused until it is closed.</p> : <CountNotice id={data.activeCountId} />}
      {!embedded && <section className="space-y-4 rounded-xl border bg-white p-4">
        {!technician && <div className="flex flex-wrap gap-2" role="group" aria-label="Delivery source">{(["WAREHOUSE", "TRANSIT"] as const).map((value) => <Button key={value} variant={source === value ? "default" : "outline"} aria-pressed={source === value} disabled={busy || locked} onClick={() => changeSource(value)}>{value === "WAREHOUSE" ? "From warehouse" : "Directly from factory"}</Button>)}</div>}
        {source === "TRANSIT" ? <p className="text-sm text-muted-foreground">Choose parts already collected and scanned at the factory. No second scan is required. The delivered parts leave transit without entering a warehouse.</p> : <div className="max-w-sm space-y-2"><p className="text-sm font-medium">Source store</p><StoreSelect stores={stores} value={storeId} onChange={(value) => changeSource("WAREHOUSE", value)} disabled={busy || locked} allowUnassigned includeInactive={!technician} label="Customer delivery source store" /></div>}
      </section>}
      {validSource && <>
        {!embedded && <div className="flex flex-wrap gap-3"><div className="relative min-w-60 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" aria-label="Search delivery POs" placeholder="Search by customer, order or PO (optional)" maxLength={150} value={search} disabled={busy || locked} onChange={(e) => { serial.current++; setSearch(e.target.value); setPage(1); setLoading(true); }} /></div><Button variant="outline" disabled={busy || locked} onClick={() => { setSelection({}); setError(""); void refresh(); }}><RefreshCw className="mr-2 h-4 w-4" />Refresh / clear selection</Button></div>}
        {!embedded && source === "WAREHOUSE" && <section className="space-y-3"><Button variant="outline" disabled={busy || locked} onClick={() => setScan((value) => !value)}>{scan ? "Hide scanner" : "Select parts by scanning"}</Button>{scan && <div className="rounded-xl border bg-white p-4"><p className="mb-3 text-sm text-muted-foreground">Each reading adds one part to this delivery. Stock changes only after the recipient signs and you confirm.</p><ScanPad<DeliverySelection[string]> key={`${source}:${storeId}`} scope={`customer-selection:${actorId}:${storeId}`} disabled={loading || selecting || saving || locked} onRead={readPart} onSaved={(entry) => { setSelection((previous) => ({ ...previous, [entry.unit.lineNumber]: entry })); setError(""); }} onPendingChange={setReading} /></div>}</section>}
        {chosen.length > 0 && <div className="sticky top-24 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white p-4 shadow-sm"><div><p className="text-sm font-semibold">{chosen.length} pieces · {totalParts} physical parts selected</p><p className="text-xs text-muted-foreground">Next: review the receipt and collect the recipient's signature.</p></div><Button disabled={busy || locked || !validSource || Boolean(selectionError) || Boolean(data.activeCountId)} onClick={beginReview}><ClipboardCheck className="mr-2 h-4 w-4" />Deliver to customer</Button></div>}
        <div><h3 className="font-semibold">{embedded ? "Selected PO" : "Available POs"}</h3><p className="mt-1 text-sm text-muted-foreground">Select a PO to include all its available parts at this location. Open Pieces if you need a partial delivery.</p></div>
        {!embedded && <div className="flex flex-wrap items-center gap-4 text-sm"><label className="flex min-h-10 items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={allPage} disabled={busy || locked || !availablePage.length} onChange={(e) => selectPos(availablePage, e.target.checked)} />Select POs on this page</label><Button size="sm" variant="outline" disabled={busy || locked || !data.total} onClick={selectAll}>{selecting ? "Selecting…" : "Select all matching POs"}</Button><span className="text-muted-foreground">Selections stay when you change pages or search.</span></div>}
        <div className="space-y-3" aria-busy={loading}>{visibleGroups.map((group) => {
          const units = deliveryPoUnits(group, source, storeId);
          const all = deliveryPoSelected(group, selection, source, storeId);
          const some = units.some((unit) => Boolean(selection[unit.lineNumber]));
          const availableParts = units.reduce((sum, unit) => sum + deliveryAvailable(unit, source, storeId), 0);
          const open = Boolean(expanded[group.key]);
          return <section key={group.key} className={`overflow-hidden rounded-xl border bg-white ${some ? "border-slate-400" : ""} ${group.key === initialPoKey ? "ring-2 ring-slate-200" : ""}`}>
            <div className="flex flex-wrap items-center gap-4 p-4">
              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" aria-label={`Select PO ${group.poNumber || group.orderNumber || group.key}`} aria-checked={all ? true : some ? "mixed" : false} checked={all} disabled={busy || locked || !units.length} onChange={(e) => selectPos([group], e.target.checked)} />
                <span className="min-w-0 space-y-1"><span className="block text-base font-semibold">PO {group.poNumber || "—"}</span><span className="block text-sm"><UnitOrigin unit={group} /></span>{group.customer && <span className="block break-words text-sm font-medium">{group.customer}</span>}{group.project && group.project !== group.customer && <span className="block break-words text-sm text-muted-foreground">{group.project}</span>}<span className="block text-sm text-muted-foreground">{units.length} pieces · {availableParts} physical parts available</span>{some && <span className="block text-xs font-medium text-emerald-700">{all ? "All available parts selected" : "Partial delivery selected"}</span>}</span>
              </label>
              <Button variant="outline" size="sm" aria-label={`${open ? "Hide" : "Show"} pieces for PO ${group.poNumber || group.orderNumber || group.key}`} aria-expanded={open} disabled={busy || locked} onClick={() => setExpanded((previous) => ({ ...previous, [group.key]: !open }))}>{open ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}Pieces</Button>
            </div>
            {open && <div className="divide-y border-t bg-slate-50/50">{units.map((unit) => {
              const entry = selection[unit.lineNumber], available = deliveryAvailable(unit, source, storeId);
              return <div key={unit.lineNumber} className="flex flex-wrap items-start gap-3 p-4">
                <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" aria-label={`Select ${unit.barcode}`} checked={Boolean(entry)} disabled={busy || locked || available < 1 || (!entry && chosen.length >= MAX_DELIVERY_PIECES)} onChange={(e) => toggle(unit, e.target.checked)} />
                <div className="min-w-40 flex-1 text-sm"><p className="break-words font-medium">{unit.description || [unit.product, unit.system, unit.configuration].filter(Boolean).join(" · ")}</p>{unit.mark && <p className="text-xs text-muted-foreground">Mark: {unit.mark}</p>}<p className="text-xs text-muted-foreground">Line {unit.lineNumber} · {available} parts available</p>{entry && entry.unit.version !== unit.version && <p className="text-xs text-red-700">Changed. Remove this selection and select again.</p>}</div>
                <div className="space-y-1"><p className="text-xs">Deliver now</p><FactoryPartQuantity tracking={unit.partTracking} source={source} storeId={storeId} max={available}
                  quantity={entry?.quantity ?? ""} parts={entry?.parts} disabled={busy || locked || !entry} label={`Deliver parts for ${unit.barcode}`}
                  onChange={(next) => setSelection((previous) => ({ ...previous, [unit.lineNumber]: { ...previous[unit.lineNumber], ...next } }))} /></div>
              </div>;
            })}</div>}
          </section>;
        })}{!visibleGroups.length && <p className="rounded-xl border bg-white px-5 py-12 text-center text-sm text-muted-foreground">No POs with available parts match this selection.</p>}</div>
        {!embedded && <Pagination {...data} label="POs" disabled={busy || locked} onPage={(next) => { serial.current++; setLoading(true); setPage(next); }} />}
      </>}
      {chosen.length > 0 && <section className="space-y-3 rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Selected for delivery</h3><p className="text-sm">{chosen.length} pieces · {totalParts} physical parts</p></div><div className="max-h-64 overflow-y-auto divide-y">{chosen.map(({ unit, quantity }) => <div key={unit.lineNumber} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0 text-sm"><p className="font-medium">PO {unit.poNumber || "—"} · Line {unit.lineNumber}</p><p className="text-xs text-muted-foreground">{unit.description || unit.product}</p></div><div className="flex shrink-0 items-center gap-2"><span className="text-sm">{quantity} parts</span><Button size="icon" variant="ghost" aria-label={`Remove ${unit.barcode}`} disabled={busy || locked} onClick={() => toggle(unit, false)}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>{selectionError && <p role="alert" className="text-sm text-red-700">{selectionError}</p>}<div className="flex justify-end"><Button disabled={busy || locked || !validSource || Boolean(selectionError) || Boolean(data.activeCountId)} onClick={beginReview}><ClipboardCheck className="mr-2 h-4 w-4" />Review delivery</Button></div></section>}
    </>}
  </div>;
}
