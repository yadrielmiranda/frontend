"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ClipboardCheck, Minus, Package, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialProductImage } from "@/components/material-product-image";
import { useAuth } from "@/contexts/AuthContext";
import { isApiError } from "@/app/api/_base";
import { warehouseRequestKey } from "@/app/api/warehouse.api";
import { useMaterialStoreInternally as withdrawMaterialStoreInternally, materialStoreCountInventory, type MaterialStoreInternalUseInput, type MaterialStoreInternalUseResult, type MaterialStoreCountInventory, type MaterialStoreCountProduct } from "@/app/api/materials.api";
import { technicianMaterialInventory, technicianWithdrawMaterials } from "@/app/api/technician-warehouse.api";
import { errorText, MaterialField, MaterialNotice, MaterialScan, quantity } from "../materials/materials-shared";
import { allowsMaterialDailyOperation, materialFullPackagesOnlyMessage } from "../materials/material-operation-policy";

type Identity = { id: number; role: string };
type Entries = Record<string, string>;
const entryKey = (productId: number, presentationId: number) => `${productId}:${presentationId}`;
const editable = (product: MaterialStoreCountProduct, presentation: MaterialStoreCountProduct["presentations"][number]) => product.isActive && presentation.isActive;
const PAGE_SIZE = 20;

/** Loose units and packages draw from the same available stock. */
export function technicianMaterialWithdrawalMaximum(product: MaterialStoreCountProduct, presentation: MaterialStoreCountProduct["presentations"][number], entries: Entries) {
  const otherUnits = product.presentations.reduce((total, item) => {
    if (item.id === presentation.id) return total;
    const value = entries[entryKey(product.id, item.id)]?.trim();
    return total + (value && /^\d+$/.test(value) ? Number(value) * item.multiplier : 0);
  }, 0);
  return Math.max(0, Math.min(1000000, presentation.availableQuantity, Math.floor((product.availableBaseQuantity - otherUnits) / presentation.multiplier)));
}

export function selectTechnicianMaterialPresentation(inventory: MaterialStoreCountInventory, entries: Entries, productId: number, presentationId: number) {
  const product = inventory.products.find(item => item.id === productId);
  const presentation = product?.presentations.find(item => item.id === presentationId);
  if (!product || !presentation || !editable(product, presentation)) throw new Error("This material or presentation is inactive.");
  if (!allowsMaterialDailyOperation(product, presentation)) throw new Error(materialFullPackagesOnlyMessage);
  if (!inventory.store.isActive || presentation.availableQuantity < 1) throw new Error(`No ${presentation.name} for ${product.name} are available in this store.`);
  const key = entryKey(product.id, presentation.id);
  if (Object.prototype.hasOwnProperty.call(entries, key)) return entries;
  if (technicianMaterialWithdrawalMaximum(product, presentation, entries) < 1) throw new Error(`The available ${product.name} is already in your list. Reduce another quantity before adding ${presentation.name}.`);
  return { ...entries, [key]: "1" };
}

export function findMaterialStoreWithdrawalBarcode(inventory: MaterialStoreCountInventory, code: string) {
  const barcode = code.trim();
  for (const product of inventory.products) {
    const presentation = product.presentations.find(item => item.barcode === barcode);
    if (!presentation) continue;
    if (!editable(product, presentation)) throw new Error("This material or presentation is inactive.");
    if (!allowsMaterialDailyOperation(product, presentation)) throw new Error(materialFullPackagesOnlyMessage);
    if (!inventory.store.isActive || presentation.availableQuantity < 1) throw new Error(`No ${presentation.name} for ${product.name} are available in this store.`);
    return { product, presentation };
  }
  throw new Error("This barcode was not found in this store's material list. Your quantities have not changed.");
}

/** Package and loose-unit withdrawals share a product's available stock. */
export function buildMaterialStoreWithdrawal(inventory: MaterialStoreCountInventory, entries: Entries) {
  const lines: MaterialStoreInternalUseInput["lines"] = [];
  const selected: Array<{ key: string; productName: string; presentationName: string; quantity: number; baseUnits: number; baseUnit: string }> = [];
  const productIds = new Set<number>();
  for (const product of inventory.products) {
    let withdrawnBaseUnits = 0;
    for (const presentation of product.presentations) {
      const key = entryKey(product.id, presentation.id), raw = entries[key]?.trim() ?? "";
      if (!raw) continue;
      if (!allowsMaterialDailyOperation(product, presentation)) throw new Error(`${product.name}: ${materialFullPackagesOnlyMessage}`);
      if (!editable(product, presentation)) throw new Error(`${product.name} · ${presentation.name} is inactive. Remove it before continuing.`);
      if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) < 1 || Number(raw) > 1000000) throw new Error(`Enter a whole number from 1 to 1,000,000 for ${product.name} · ${presentation.name}.`);
      const amount = Number(raw), baseUnits = amount * presentation.multiplier;
      if (amount > presentation.availableQuantity) throw new Error(`Only ${quantity(presentation.availableQuantity)} ${presentation.name} are available for ${product.name}.`);
      withdrawnBaseUnits += baseUnits;
      lines.push({ productId: product.id, presentationId: presentation.id, quantity: amount });
      selected.push({ key, productName: product.name, presentationName: presentation.name, quantity: amount, baseUnits, baseUnit: product.baseUnit.name });
      productIds.add(product.id);
    }
    if (withdrawnBaseUnits > product.availableBaseQuantity) throw new Error(`The selected packages and units for ${product.name} exceed its ${quantity(product.availableBaseQuantity)} available ${product.baseUnit.name}.`);
  }
  if (lines.length > 1000) throw new Error("A withdrawal can contain up to 1,000 presentations.");
  return { lines, selected, productCount: productIds.size };
}

export function StoreMaterialInternalUseClient({ initial, initialIdentity, technician = false }: { initial: MaterialStoreCountInventory; initialIdentity: Identity; technician?: boolean }) {
  const { user, revalidate } = useAuth();
  const owner = useRef(initialIdentity).current;
  const storageKey = `technician-material-withdrawal:${owner.id}:${initial.store.id}`;
  const [ready, setReady] = useState(!technician);
  const [offline, setOffline] = useState(false);
  const receivedBy = technician ? [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Technician" : "";
  const liveIdentity = useRef({ id: user?.id, role: user?.role?.name });
  liveIdentity.current = { id: user?.id, role: user?.role?.name };
  const [inventory, setInventory] = useState(initial), [entries, setEntries] = useState<Entries>({});
  const entriesRef = useRef<Entries>({});
  const [chooseManually, setChooseManually] = useState(false);
  const [recipient, setRecipient] = useState(""), [note, setNote] = useState("");
  const [search, setSearch] = useState(""), [inStock, setInStock] = useState(true), [page, setPage] = useState(1);
  const [scanMatch, setScanMatch] = useState<{ key: string; productName: string; presentationName: string } | null>(null);
  const [activeEntryKey, setActiveEntryKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [review, setReview] = useState(false), [discardPrompt, setDiscardPrompt] = useState(false);
  const [pending, setPending] = useState<MaterialStoreInternalUseInput | null>(null), [saved, setSaved] = useState<MaterialStoreInternalUseResult | null>(null), [needsRefresh, setNeedsRefresh] = useState(false);
  const busyRef = useRef(false), pendingRef = useRef<MaterialStoreInternalUseInput | null>(null), savedRef = useRef<MaterialStoreInternalUseResult | null>(null);
  const scanAllowed = useRef(false);
  const activeScanCard = useRef<HTMLElement>(null);
  const ownerMatches = user?.id === owner.id && user?.role?.name === owner.role;
  const canWithdraw = (technician ? owner.role === "technician" : ["admin", "operator"].includes(owner.role)) && inventory.store.isActive;
  const locked = !ready || (technician && offline) || busy || Boolean(pending) || needsRefresh || !canWithdraw;
  const scanLocked = locked || review || discardPrompt || !ownerMatches;
  scanAllowed.current = !scanLocked;
  const dirty = (technician ? Object.keys(entries).length > 0 : Object.values(entries).some(value => value.trim() !== "")) || Boolean(recipient.trim()) || Boolean(note.trim());
  let withdrawal: ReturnType<typeof buildMaterialStoreWithdrawal> | null = null, validation = "";
  try {
    if (technician && Object.values(entries).some(value => !value.trim())) throw new Error("Enter a quantity for every material in your list, or remove it.");
    withdrawal = buildMaterialStoreWithdrawal(inventory, entries);
  } catch (e) { validation = errorText(e); }
  const query = search.trim().toLowerCase();
  const filtered = inventory.products.filter(product => (!inStock || product.presentations.some(p => editable(product, p) && allowsMaterialDailyOperation(product, p) && p.availableQuantity > 0)) && (!query || `${product.name} ${product.code} ${product.presentations.map(p => p.barcode ?? "").join(" ")}`.toLowerCase().includes(query)));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), currentPage = Math.min(page, pages), visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const technicianSelections = inventory.products.flatMap(product => product.presentations
    .filter(presentation => Object.prototype.hasOwnProperty.call(entries, entryKey(product.id, presentation.id)))
    .map(presentation => ({ product, presentation, key: entryKey(product.id, presentation.id) })))
    .sort((a, b) => Number(b.key === scanMatch?.key) - Number(a.key === scanMatch?.key));

  useEffect(() => {
    if (!technician) return;
    const connection = () => setOffline(!navigator.onLine);
    connection(); window.addEventListener("online", connection); window.addEventListener("offline", connection);
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const body = JSON.parse(raw) as MaterialStoreInternalUseInput;
        if (!body.requestKey || !Array.isArray(body.lines) || !body.lines.length) throw new Error("Invalid pending withdrawal");
        pendingRef.current = body; setPending(body);
      }
      setReady(true);
    } catch { setError("The pending withdrawal could not be loaded. Keep this page open and contact an administrator before recording another withdrawal."); }
    return () => { window.removeEventListener("online", connection); window.removeEventListener("offline", connection); };
  }, [technician, storageKey]);
  useEffect(() => {
    if (!technician || !pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [technician, pending]);
  useEffect(() => {
    if (!technician || !activeEntryKey || !activeScanCard.current) return;
    // The committed card is ready here; keep its controls above the fixed review bar.
    activeScanCard.current.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [technician, scanMatch, activeEntryKey]);

  async function verifyAccount() {
    const account = await revalidate();
    if (!account || account.id !== owner.id || account.role?.name !== owner.role || liveIdentity.current.id !== owner.id || liveIdentity.current.role !== owner.role) throw new Error("Your account has changed. Reopen this store's internal use page before continuing.");
  }
  async function readInventory() {
    await verifyAccount();
    const next = await (technician ? technicianMaterialInventory : materialStoreCountInventory)(initial.store.id);
    await verifyAccount();
    setInventory(next); entriesRef.current = {}; setEntries({}); setRecipient(""); setNote(""); setNeedsRefresh(false); setPage(1); setScanMatch(null); setActiveEntryKey(null); setChooseManually(false);
  }
  async function refresh() {
    if (busyRef.current || pendingRef.current) return;
    busyRef.current = true; setBusy(true); setError(""); setDiscardPrompt(false);
    try { await readInventory(); } catch (e) { setError(errorText(e)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function changeEntry(key: string, value: string) {
    if (busyRef.current || pendingRef.current || !canWithdraw || needsRefresh) return;
    if (technician && (!ready || offline || !ownerMatches || liveIdentity.current.id !== owner.id || liveIdentity.current.role !== owner.role)) return;
    const next = { ...entriesRef.current, [key]: value };
    entriesRef.current = next; setEntries(next); setSaved(null);
  }
  function removeEntry(key: string) {
    if (!technician) { changeEntry(key, ""); return; }
    if (busyRef.current || pendingRef.current || !canWithdraw || needsRefresh || !ready || offline || !ownerMatches || liveIdentity.current.id !== owner.id || liveIdentity.current.role !== owner.role) return;
    const next = { ...entriesRef.current }; delete next[key];
    entriesRef.current = next; setEntries(next); setSaved(null);
    if (scanMatch?.key === key) setScanMatch(null);
    setActiveEntryKey(current => current === key ? Object.keys(next)[0] ?? null : current);
  }
  function addTechnicianPresentation(product: MaterialStoreCountProduct, presentation: MaterialStoreCountProduct["presentations"][number]) {
    if (!scanAllowed.current || busyRef.current || pendingRef.current || liveIdentity.current.id !== owner.id || liveIdentity.current.role !== owner.role) throw new Error("Finish or close the current action before adding a material.");
    const next = selectTechnicianMaterialPresentation(inventory, entriesRef.current, product.id, presentation.id);
    entriesRef.current = next; setEntries(next); setSaved(null); setError("");
    setScanMatch({ key: entryKey(product.id, presentation.id), productName: product.name, presentationName: presentation.name });
    setActiveEntryKey(entryKey(product.id, presentation.id));
    setChooseManually(false);
  }
  function toggleTechnicianEntry(key: string) {
    if (!scanAllowed.current || busyRef.current || pendingRef.current || liveIdentity.current.id !== owner.id || liveIdentity.current.role !== owner.role || !Object.prototype.hasOwnProperty.call(entriesRef.current, key)) return;
    setActiveEntryKey(current => current === key ? null : key);
  }
  function changeTechnicianQuantity(product: MaterialStoreCountProduct, presentation: MaterialStoreCountProduct["presentations"][number], value: string) {
    if (scanLocked || busyRef.current || pendingRef.current) return;
    const key = entryKey(product.id, presentation.id);
    if (value === "") { changeEntry(key, value); return; }
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) return;
    const maximum = technicianMaterialWithdrawalMaximum(product, presentation, entriesRef.current);
    if (maximum < 1) return;
    const amount = Math.max(1, Math.min(maximum, Number(value)));
    if (Number(value) > maximum) setError(`Only ${quantity(maximum)} ${presentation.name} can be selected for ${product.name}.`);
    else setError("");
    changeEntry(key, String(amount));
  }
  async function confirmWithdrawal() {
    if (!ready || (technician && offline) || busyRef.current || (!canWithdraw && !pendingRef.current) || !ownerMatches || (savedRef.current && needsRefresh)) return;
    const retry = pendingRef.current;
    if (!retry && (!withdrawal?.lines.length || (!technician && (!recipient.trim() || !note.trim() || recipient.trim().length > 200 || note.trim().length > 1000)) || validation || !review)) return;
    const body: MaterialStoreInternalUseInput = retry ?? { requestKey: warehouseRequestKey(), recipient: technician ? "" : recipient.trim(), note: technician ? "" : note.trim(), lines: withdrawal!.lines };
    busyRef.current = true; setBusy(true); setError("");
    try {
      await verifyAccount();
      let result: MaterialStoreInternalUseResult;
      if (technician && !retry) {
        try { sessionStorage.setItem(storageKey, JSON.stringify(body)); }
        catch { throw new Error("Browser storage is unavailable. Enable site storage before confirming the withdrawal. Nothing was sent."); }
        pendingRef.current = body; setPending(body);
      }
      try { result = await (technician ? technicianWithdrawMaterials : withdrawMaterialStoreInternally)(initial.store.id, body); }
      catch (e) {
        const definitiveRejection = isApiError(e) && [400, 403, 404, 409, 422].includes(e.status);
        if (definitiveRejection) {
          if (technician) sessionStorage.removeItem(storageKey);
          pendingRef.current = null; setPending(null);
        }
        else if (retry || !isApiError(e) || e.status >= 500 || e.status === 408) { pendingRef.current = body; setPending(body); }
        setReview(false); throw e;
      }
      // A completed write must remain completed even if the following stock refresh fails.
      savedRef.current = result; setSaved(result); setNeedsRefresh(true);
      if (technician) {
        try { sessionStorage.removeItem(storageKey); }
        catch { setReview(false); setError("Your withdrawal was saved, but its recovery data could not be cleared. Reopen this page to recover the result before starting another withdrawal."); return; }
      }
      pendingRef.current = null; setPending(null); entriesRef.current = {}; setEntries({}); setActiveEntryKey(null); setRecipient(""); setNote(""); setReview(false);
      try { await readInventory(); }
      catch { setError("Your withdrawal was saved. Refresh stock before starting another withdrawal."); }
    } catch (e) { setError(errorText(e)); }
    finally { busyRef.current = false; setBusy(false); }
  }

  if (!ownerMatches) return <p role="alert" className="rounded-xl border bg-white p-5 text-sm">Verify your account or reopen this store&apos;s internal use page to continue.</p>;
  return <div className="space-y-5" style={technician ? { paddingBottom: "calc(9rem + env(safe-area-inset-bottom))" } : undefined}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{technician ? "Materials for installation" : "Internal use"} · {inventory.store.name}</h2><p className="mt-1 text-sm text-muted-foreground">{technician ? "Choose the materials you are taking for installation." : "Give multiple materials to a technician or team in one withdrawal."}</p></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline" disabled={dirty || busy || Boolean(pending)}><Link href={technician ? "/technician/warehouse/materials" : "/warehouse/stores"} aria-disabled={dirty || busy || Boolean(pending)} onClick={event => { if (dirty || busy || pending) event.preventDefault(); }}>{technician ? "Change store" : "All stores"}</Link></Button><Button asChild variant="outline" disabled={dirty || busy || Boolean(pending)}><Link href={technician ? "/technician" : `/warehouse/stores/${inventory.store.id}/materials`} aria-disabled={dirty || busy || Boolean(pending)} onClick={event => { if (dirty || busy || pending) event.preventDefault(); }}>{technician ? "Technician home" : "Material inventory"}</Link></Button><Button variant="outline" disabled={busy || Boolean(pending)} onClick={() => { if (dirty) { scanAllowed.current = false; setDiscardPrompt(true); } else void refresh(); }}><RefreshCw className="mr-2 h-4 w-4" />Refresh stock</Button></div></div>
    {technician && offline && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No connection. Reconnect before confirming a withdrawal.</p>}
    <MaterialNotice error={error} success={saved ? `Withdrawal saved: ${saved.productCount} products (${saved.lineCount} presentations) given to ${saved.recipient} from ${saved.storeName}.` : undefined} />
    {!canWithdraw && <p className="rounded-lg border bg-slate-50 p-4 text-sm">This store is inactive. Materials are read-only.</p>}
    {pending && <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"><p>We could not confirm whether your withdrawal was saved. Retry this same withdrawal before making further changes.</p><Button disabled={busy || !ready || (technician && offline)} onClick={() => { void confirmWithdrawal(); }}>Retry same withdrawal</Button></section>}
    {technician && <>
      <section className="space-y-4 rounded-xl border bg-white p-4 sm:p-5">
        <div><h3 className="font-semibold">1. Scan your material</h3><p className="mt-1 text-sm text-muted-foreground">Scan the box or unit you are taking. We will add one to your list.</p></div>
        <MaterialScan disabled={scanLocked} buttonLabel="Add scanned material" onScan={async code => {
          if (!scanAllowed.current || busyRef.current || pendingRef.current || liveIdentity.current.id !== owner.id || liveIdentity.current.role !== owner.role) throw new Error("Finish or close the current action before scanning a material.");
          const match = findMaterialStoreWithdrawalBarcode(inventory, code);
          addTechnicianPresentation(match.product, match.presentation);
        }} />
        {scanMatch && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><strong>{scanMatch.productName} · {scanMatch.presentationName}</strong> is in your list. Use + or − to change its quantity.</p>}
        <Button type="button" variant="outline" className="min-h-11" disabled={scanLocked} aria-expanded={chooseManually} onClick={() => setChooseManually(value => !value)}>{chooseManually ? "Close material list" : "Choose without scanning"}</Button>
        {chooseManually && <div className="space-y-3 border-t pt-4">
          <Input aria-label="Search store materials" placeholder="Search by material name or code" value={search} disabled={scanLocked} onChange={event => { setSearch(event.target.value); setPage(1); }} />
          {visible.map(product => <div key={product.id} className="space-y-3 rounded-lg border p-3">
            <p className="break-words font-medium">{product.name}</p>
            {product.presentations.filter(p => editable(product, p) && allowsMaterialDailyOperation(product, p)).map(presentation => {
              const selected = Object.prototype.hasOwnProperty.call(entries, entryKey(product.id, presentation.id));
              const maximum = technicianMaterialWithdrawalMaximum(product, presentation, entries);
              return <div key={presentation.id} className="flex flex-wrap items-center justify-between gap-3 text-sm"><div className="min-w-0"><p className="break-words font-medium">{presentation.name}</p><p className="text-muted-foreground">{quantity(maximum)} available</p></div><Button type="button" variant="outline" className="min-h-11" aria-label={`Add ${product.name} · ${presentation.name}`} disabled={scanLocked || selected || maximum < 1} onClick={() => { try { addTechnicianPresentation(product, presentation); } catch (e) { setError(errorText(e)); } }}>{selected ? "In your list" : "Add"}</Button></div>;
            })}
          </div>)}
          {!visible.length && <p className="py-4 text-sm text-muted-foreground">No available materials match your search.</p>}
          {pages > 1 && <nav aria-label="Internal use material pages" className="flex flex-wrap items-center justify-between gap-2"><Button variant="outline" disabled={scanLocked || currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><span className="text-sm">Page {currentPage} of {pages}</span><Button variant="outline" disabled={scanLocked || currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</Button></nav>}
        </div>}
      </section>
      <section className="space-y-3" aria-label="Materials to take">
        <div><h3 className="font-semibold">2. Check your quantities</h3><p className="mt-1 text-sm text-muted-foreground">Tap a material to change its quantity or remove it.</p></div>
        {!Object.keys(entries).length && <div className="rounded-xl border border-dashed bg-white p-7 text-center text-sm text-muted-foreground"><Package className="mx-auto mb-3 h-8 w-8" /><p>Your list is empty. Scan a material to get started.</p></div>}
        {technicianSelections.map(({ product, presentation }) => {
          const key = entryKey(product.id, presentation.id), raw = entries[key], maximum = technicianMaterialWithdrawalMaximum(product, presentation, entries);
          const amount = Number(raw), valid = /^\d+$/.test(raw) && amount >= 1 && amount <= maximum;
          const expanded = activeEntryKey === key;
          const detailsId = `material-withdrawal-${product.id}-${presentation.id}`;
          return <article key={key} ref={expanded ? activeScanCard : undefined} style={{ scrollMarginBottom: "calc(9rem + env(safe-area-inset-bottom))" }} className={`scroll-mt-24 overflow-hidden rounded-xl border bg-white${expanded ? " border-emerald-300" : ""}`}>
            <button type="button" className="flex min-h-16 w-full items-center gap-3 p-4 text-left disabled:opacity-60" aria-label={`Edit ${product.name} · ${presentation.name}`} aria-expanded={expanded} aria-controls={expanded ? detailsId : undefined} disabled={scanLocked} onClick={() => toggleTechnicianEntry(key)}>
              {expanded && <MaterialProductImage imageUrl={product.imageUrl} name={product.name} compact className="h-12 w-12 shrink-0 rounded-lg border" sizes="48px" />}
              <span className="min-w-0 flex-1"><span className="block break-words font-semibold">{product.name}</span><span className={`mt-1 block break-words ${expanded ? "text-lg font-semibold text-slate-950" : "text-sm text-muted-foreground"}`}>{presentation.name}</span>{!valid && <span className="mt-1 block text-sm font-medium text-red-700">Check quantity</span>}</span>
              <span className={`shrink-0 text-right ${valid ? "text-slate-950" : "text-red-700"}`}><span className="block text-xs text-muted-foreground">Qty</span><span className="block text-lg font-semibold tabular-nums">{valid ? quantity(amount) : "—"}</span></span>
              {expanded ? <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" /> : <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
            </button>
            {expanded && <div id={detailsId} className="space-y-3 px-4 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-slate-50 p-3">
              <div><p className="text-sm font-medium">Quantity to take</p><p className="mt-1 text-sm text-muted-foreground">{quantity(maximum)} {presentation.unit?.name ?? (presentation.isBase ? product.baseUnit.name : "packages")} available</p></div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" className="h-12 w-12 shrink-0 p-0" aria-label={`Decrease ${product.name} · ${presentation.name}`} disabled={scanLocked || !valid || amount <= 1} onClick={() => changeTechnicianQuantity(product, presentation, String(Number(entriesRef.current[key]) - 1))}><Minus className="h-5 w-5" /></Button>
                <Input className="h-12 w-20 text-center text-lg font-semibold tabular-nums" type="number" inputMode="numeric" min={1} max={maximum} step={1} aria-label={`Withdraw ${product.name} · ${presentation.name}`} aria-invalid={!valid} disabled={scanLocked || maximum < 1} value={raw} onChange={event => changeTechnicianQuantity(product, presentation, event.target.value)} />
                <Button type="button" variant="outline" className="h-12 w-12 shrink-0 p-0" aria-label={`Increase ${product.name} · ${presentation.name}`} disabled={scanLocked || !valid || amount >= maximum} onClick={() => changeTechnicianQuantity(product, presentation, String(Number(entriesRef.current[key]) + 1))}><Plus className="h-5 w-5" /></Button>
              </div>
            </div>
            {!valid && <p role="alert" className="text-sm text-red-700">Enter a quantity from 1 to {quantity(maximum)}, or remove this material.</p>}
            <Button type="button" variant="ghost" className="min-h-11 text-red-700" disabled={scanLocked} aria-label={`Remove ${product.name} · ${presentation.name}`} onClick={() => removeEntry(key)}><Trash2 className="mr-2 h-4 w-4" />Remove</Button>
            </div>}
          </article>;
        })}
      </section>
    </>}
    {!technician && <>
    <section className="space-y-4 rounded-xl border bg-white p-5"><div className="space-y-2"><p className="text-sm font-medium">Find a presentation by barcode</p><MaterialScan disabled={scanLocked} buttonLabel="Find presentation" onScan={async code => {
      if (!scanAllowed.current || busyRef.current || pendingRef.current || liveIdentity.current.id !== owner.id || liveIdentity.current.role !== owner.role) throw new Error("Finish or close the current action before scanning a material.");
      const match = findMaterialStoreWithdrawalBarcode(inventory, code);
      setSearch(match.product.code); setPage(1);
      setScanMatch({ key: entryKey(match.product.id, match.presentation.id), productName: match.product.name, presentationName: match.presentation.name });
    }} /><p className="text-xs text-muted-foreground">Use the camera, a barcode reader or enter the code. Scanning finds the exact presentation without changing any quantities.</p>{scanMatch && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Found <strong>{scanMatch.productName} · {scanMatch.presentationName}</strong>. Enter the quantity in the highlighted row. Your other selections are kept.</p>}</div><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" aria-label="Search store materials" placeholder="Search product, code or barcode" value={search} onChange={event => { setSearch(event.target.value); setPage(1); setScanMatch(null); }} /></div><div className="flex flex-wrap items-center justify-between gap-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={inStock} onChange={event => { setInStock(event.target.checked); setPage(1); setScanMatch(null); }} />Available stock only</label><span className="text-muted-foreground">{filtered.length} of {inventory.products.length} products</span></div><p className="text-sm font-medium">{technician ? "Enter the quantities to take for installation. Stock is reduced when you confirm." : "Enter the quantities to give to the technician. Stock is reduced when you confirm."}</p><p className="text-sm text-muted-foreground">Available quantities exclude reservations. Materials marked Full packages only can be withdrawn only in their package presentations.</p></section>
    <div className="space-y-4">{visible.map(product => <section key={product.id} className="overflow-hidden rounded-xl border bg-white"><div className="flex flex-wrap items-center justify-between gap-4 border-b bg-slate-50/60 p-4"><div className="flex min-w-0 items-center gap-3"><MaterialProductImage imageUrl={product.imageUrl} name={product.name} compact className="h-12 w-12 shrink-0 rounded-md" sizes="48px" /><div><p className="text-xs text-muted-foreground">{product.code}</p><h3 className="font-semibold">{product.name}</h3>{!product.isActive && <p className="text-xs text-amber-800">Inactive product</p>}{product.allowBaseUnitOperations === false && <p className="text-xs text-muted-foreground">Full packages only</p>}</div></div><p className="text-sm"><strong>{quantity(product.availableBaseQuantity)} {product.baseUnit.name}</strong> available</p></div><div className="overflow-x-auto"><table className="w-full min-w-[460px] text-sm"><thead className="text-xs text-slate-600"><tr className="border-b"><th scope="col" className="p-3 text-left font-medium">Presentation</th><th scope="col" className="p-3 text-right font-medium">Available</th><th scope="col" className="p-3 text-right font-medium">To withdraw</th></tr></thead><tbody>{product.presentations.filter(p => allowsMaterialDailyOperation(product, p)).map(presentation => {
      const key = entryKey(product.id, presentation.id), raw = entries[key] ?? "", mayWithdraw = editable(product, presentation), valid = !raw.trim() || /^\d+$/.test(raw.trim()) && Number(raw) >= 1 && Number(raw) <= Math.min(1000000, presentation.availableQuantity);
      return <tr key={presentation.id} className={`border-b last:border-0${scanMatch?.key === key ? " bg-emerald-50 ring-1 ring-inset ring-emerald-300" : ""}`}><td className="p-3"><p className="font-medium">{presentation.name}{scanMatch?.key === key && <span className="ml-2 text-xs font-semibold text-emerald-800">Barcode match</span>}</p><p className="text-xs text-muted-foreground">{quantity(presentation.multiplier)} {product.baseUnit.name} each{!presentation.isActive ? " · Inactive" : ""}</p></td><td className="p-3 text-right tabular-nums">{quantity(presentation.availableQuantity)}</td><td className="p-3"><Input className="ml-auto w-28 text-right tabular-nums" type="number" inputMode="numeric" min={1} max={Math.min(1000000, presentation.availableQuantity)} step={1} placeholder="Quantity" aria-label={`Withdraw ${product.name} · ${presentation.name}`} aria-invalid={!valid} disabled={locked || !mayWithdraw || presentation.availableQuantity < 1} value={raw} onChange={event => { if (mayWithdraw) changeEntry(key, event.target.value); }} /></td></tr>;
    })}</tbody></table></div></section>)}{!visible.length && <p className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No materials match these filters.</p>}</div>
    {pages > 1 && <nav aria-label="Internal use material pages" className="flex items-center justify-center gap-3"><Button variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><span className="text-sm">Page {currentPage} of {pages}</span><Button variant="outline" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</Button></nav>}
    </>}
    {canWithdraw && !technician && <section className="space-y-4 rounded-xl border bg-white p-5"><div className="grid gap-4 sm:grid-cols-2"><MaterialField label="Received by"><Input maxLength={200} placeholder="Technician or team name" disabled={locked} value={recipient} onChange={event => { if (!busyRef.current && !pendingRef.current && !needsRefresh) setRecipient(event.target.value); }} /></MaterialField><MaterialField label="Reason / job"><Input maxLength={1000} placeholder="For example: installation at Smith residence" disabled={locked} value={note} onChange={event => { if (!busyRef.current && !pendingRef.current && !needsRefresh) setNote(event.target.value); }} /></MaterialField></div><MaterialNotice error={validation} /><div className="flex flex-wrap items-center justify-between gap-3"><div className="text-sm"><p className="font-medium">{withdrawal?.lines.length ?? 0} presentations selected across {withdrawal?.productCount ?? 0} products</p><p className="text-xs text-muted-foreground">Selections from every page and filter are included.</p></div><Button disabled={locked || !withdrawal?.lines.length || !recipient.trim() || !note.trim() || Boolean(validation)} onClick={() => { scanAllowed.current = false; setError(""); setReview(true); }}><ClipboardCheck className="mr-2 h-4 w-4" />Review withdrawal</Button></div></section>}
    {technician && <MaterialNotice error={validation} />}
    {technician && canWithdraw && !review && !discardPrompt && <section aria-label="Withdrawal review" className="fixed inset-x-0 bottom-0 z-20 border-t bg-white shadow-lg" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <p id="withdrawal-item-count" className="text-sm"><span className="font-medium">{Object.keys(entries).length} {Object.keys(entries).length === 1 ? "item" : "items"} in your list</span><span className={`mt-1 block text-xs ${validation ? "text-red-700" : "text-muted-foreground"}`}>{validation ? "Check the highlighted quantities before continuing." : "Stock changes only when you confirm."}</span></p>
        <Button className="min-h-12 w-full sm:w-auto" aria-label="Review withdrawal" aria-describedby="withdrawal-item-count" disabled={locked || !withdrawal?.lines.length || Boolean(validation)} onClick={() => { scanAllowed.current = false; setError(""); setReview(true); }}><ClipboardCheck className="mr-2 h-4 w-4" />Review withdrawal · {Object.keys(entries).length} {Object.keys(entries).length === 1 ? "item" : "items"}</Button>
      </div>
    </section>}
    <Dialog open={review} onOpenChange={value => { if (!busy) setReview(value); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Review withdrawal · {inventory.store.name}</DialogTitle><DialogDescription>{technician ? "Confirm the materials you are taking for installation." : "Confirm the materials being given to the technician."}</DialogDescription></DialogHeader><div className="space-y-4 text-sm"><p><strong>Received by:</strong> {technician ? receivedBy : recipient.trim()}</p><p><strong>Reason / job:</strong> {technician ? "Installation" : note.trim()}</p><div className="divide-y rounded-lg border px-4">{withdrawal?.selected.map(line => <div key={line.key} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium">{line.productName}</p><p>{quantity(line.quantity)} × {line.presentationName}</p><p className="text-xs text-muted-foreground">{quantity(line.baseUnits)} {line.baseUnit} to withdraw</p></div><Button size="sm" variant="outline" disabled={busy} aria-label={`Remove ${line.productName} · ${line.presentationName}`} onClick={() => removeEntry(line.key)}><Trash2 className="h-4 w-4" /></Button></div>)}</div><p className="text-muted-foreground">All selected materials will leave this store together. If any item is no longer available, nothing will be withdrawn.</p></div><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setReview(false)}>Back to materials</Button><Button disabled={!ready || (technician && offline) || busy || Boolean(pending) || !withdrawal?.lines.length || Boolean(validation)} onClick={() => { void confirmWithdrawal(); }}>{busy ? "Saving withdrawal…" : "Confirm withdrawal"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={discardPrompt} onOpenChange={setDiscardPrompt}><DialogContent><DialogHeader><DialogTitle>Discard selection and refresh?</DialogTitle><DialogDescription>Refresh the available stock and start a new withdrawal. Your selection and technician details will be cleared after the refresh succeeds.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDiscardPrompt(false)}>Keep selection</Button><Button disabled={busy} onClick={() => { void refresh(); }}>Discard selection and refresh</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
