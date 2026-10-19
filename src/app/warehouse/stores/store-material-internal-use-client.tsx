"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, RefreshCw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialProductImage } from "@/components/material-product-image";
import { useAuth } from "@/contexts/AuthContext";
import { isApiError } from "@/app/api/_base";
import { warehouseRequestKey } from "@/app/api/warehouse.api";
import { useMaterialStoreInternally as withdrawMaterialStoreInternally, materialStoreCountInventory, type MaterialStoreInternalUseInput, type MaterialStoreInternalUseResult, type MaterialStoreCountInventory, type MaterialStoreCountProduct } from "@/app/api/materials.api";
import { errorText, MaterialField, MaterialNotice, MaterialScan, quantity } from "../materials/materials-shared";

type Identity = { id: number; role: string };
type Entries = Record<string, string>;
const entryKey = (productId: number, presentationId: number) => `${productId}:${presentationId}`;
const editable = (product: MaterialStoreCountProduct, presentation: MaterialStoreCountProduct["presentations"][number]) => product.isActive && presentation.isActive;
const PAGE_SIZE = 20;

export function findMaterialStoreWithdrawalBarcode(inventory: MaterialStoreCountInventory, code: string) {
  const barcode = code.trim();
  for (const product of inventory.products) {
    const presentation = product.presentations.find(item => item.barcode === barcode);
    if (!presentation) continue;
    if (!editable(product, presentation)) throw new Error("This material or presentation is inactive.");
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

export function StoreMaterialInternalUseClient({ initial, initialIdentity }: { initial: MaterialStoreCountInventory; initialIdentity: Identity }) {
  const { user, revalidate } = useAuth();
  const owner = useRef(initialIdentity).current;
  const liveIdentity = useRef({ id: user?.id, role: user?.role?.name });
  liveIdentity.current = { id: user?.id, role: user?.role?.name };
  const [inventory, setInventory] = useState(initial), [entries, setEntries] = useState<Entries>({});
  const [recipient, setRecipient] = useState(""), [note, setNote] = useState("");
  const [search, setSearch] = useState(""), [inStock, setInStock] = useState(true), [page, setPage] = useState(1);
  const [scanMatch, setScanMatch] = useState<{ key: string; productName: string; presentationName: string } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [review, setReview] = useState(false), [discardPrompt, setDiscardPrompt] = useState(false);
  const [pending, setPending] = useState<MaterialStoreInternalUseInput | null>(null), [saved, setSaved] = useState<MaterialStoreInternalUseResult | null>(null), [needsRefresh, setNeedsRefresh] = useState(false);
  const busyRef = useRef(false), pendingRef = useRef<MaterialStoreInternalUseInput | null>(null), savedRef = useRef<MaterialStoreInternalUseResult | null>(null);
  const scanAllowed = useRef(false);
  const ownerMatches = user?.id === owner.id && user?.role?.name === owner.role;
  const canWithdraw = ["admin", "operator"].includes(owner.role) && inventory.store.isActive;
  const locked = busy || Boolean(pending) || needsRefresh || !canWithdraw;
  const scanLocked = locked || review || discardPrompt || !ownerMatches;
  scanAllowed.current = !scanLocked;
  const dirty = Object.values(entries).some(value => value.trim() !== "") || Boolean(recipient.trim()) || Boolean(note.trim());
  let withdrawal: ReturnType<typeof buildMaterialStoreWithdrawal> | null = null, validation = "";
  try { withdrawal = buildMaterialStoreWithdrawal(inventory, entries); } catch (e) { validation = errorText(e); }
  const query = search.trim().toLowerCase();
  const filtered = inventory.products.filter(product => (!inStock || product.availableBaseQuantity > 0) && (!query || `${product.name} ${product.code} ${product.presentations.map(p => p.barcode ?? "").join(" ")}`.toLowerCase().includes(query)));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), currentPage = Math.min(page, pages), visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function verifyAccount() {
    const account = await revalidate();
    if (!account || account.id !== owner.id || account.role?.name !== owner.role || liveIdentity.current.id !== owner.id || liveIdentity.current.role !== owner.role) throw new Error("Your account has changed. Reopen this store's internal use page before continuing.");
  }
  async function readInventory() {
    await verifyAccount();
    const next = await materialStoreCountInventory(initial.store.id);
    await verifyAccount();
    setInventory(next); setEntries({}); setRecipient(""); setNote(""); setNeedsRefresh(false); setPage(1); setScanMatch(null);
  }
  async function refresh() {
    if (busyRef.current || pendingRef.current) return;
    busyRef.current = true; setBusy(true); setError(""); setDiscardPrompt(false);
    try { await readInventory(); } catch (e) { setError(errorText(e)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function changeEntry(key: string, value: string) {
    if (busyRef.current || pendingRef.current || !canWithdraw || needsRefresh) return;
    setEntries(current => ({ ...current, [key]: value })); setSaved(null);
  }
  async function confirmWithdrawal() {
    if (busyRef.current || !canWithdraw || !ownerMatches || (savedRef.current && needsRefresh)) return;
    const retry = pendingRef.current;
    if (!retry && (!withdrawal?.lines.length || !recipient.trim() || !note.trim() || recipient.trim().length > 200 || note.trim().length > 1000 || validation || !review)) return;
    const body: MaterialStoreInternalUseInput = retry ?? { requestKey: warehouseRequestKey(), recipient: recipient.trim(), note: note.trim(), lines: withdrawal!.lines };
    busyRef.current = true; setBusy(true); setError("");
    try {
      await verifyAccount();
      let result: MaterialStoreInternalUseResult;
      try { result = await withdrawMaterialStoreInternally(initial.store.id, body); }
      catch (e) {
        const definitiveRejection = isApiError(e) && [400, 404, 409, 422].includes(e.status);
        if (definitiveRejection) { pendingRef.current = null; setPending(null); }
        else if (retry || !isApiError(e) || e.status >= 500 || e.status === 408) { pendingRef.current = body; setPending(body); }
        setReview(false); throw e;
      }
      // A completed write must remain completed even if the following stock refresh fails.
      savedRef.current = result; setSaved(result); setNeedsRefresh(true);
      pendingRef.current = null; setPending(null); setEntries({}); setRecipient(""); setNote(""); setReview(false);
      try { await readInventory(); }
      catch { setError("Your withdrawal was saved. Refresh stock before starting another withdrawal."); }
    } catch (e) { setError(errorText(e)); }
    finally { busyRef.current = false; setBusy(false); }
  }

  if (!ownerMatches) return <p role="alert" className="rounded-xl border bg-white p-5 text-sm">Verify your account or reopen this store&apos;s internal use page to continue.</p>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">Internal use · {inventory.store.name}</h2><p className="mt-1 text-sm text-muted-foreground">Give multiple materials to a technician or team in one withdrawal.</p></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline" disabled={dirty || busy || Boolean(pending)}><Link href="/warehouse/stores" aria-disabled={dirty || busy || Boolean(pending)} onClick={event => { if (dirty || busy || pending) event.preventDefault(); }}>All stores</Link></Button><Button asChild variant="outline" disabled={dirty || busy || Boolean(pending)}><Link href={`/warehouse/stores/${inventory.store.id}/materials`} aria-disabled={dirty || busy || Boolean(pending)} onClick={event => { if (dirty || busy || pending) event.preventDefault(); }}>Material inventory</Link></Button><Button variant="outline" disabled={busy || Boolean(pending)} onClick={() => { if (dirty) { scanAllowed.current = false; setDiscardPrompt(true); } else void refresh(); }}><RefreshCw className="mr-2 h-4 w-4" />Refresh stock</Button></div></div>
    <MaterialNotice error={error} success={saved ? `Withdrawal saved: ${saved.productCount} products (${saved.lineCount} presentations) given to ${saved.recipient} from ${saved.storeName}.` : undefined} />
    {!canWithdraw && <p className="rounded-lg border bg-slate-50 p-4 text-sm">This store is inactive. Materials are read-only.</p>}
    {pending && <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"><p>We could not confirm whether your withdrawal was saved. Retry this same withdrawal before making further changes.</p><Button disabled={busy} onClick={() => { void confirmWithdrawal(); }}>Retry same withdrawal</Button></section>}
    <section className="space-y-4 rounded-xl border bg-white p-5"><div className="space-y-2"><p className="text-sm font-medium">Find a presentation by barcode</p><MaterialScan disabled={scanLocked} buttonLabel="Find presentation" onScan={async code => {
      if (!scanAllowed.current || busyRef.current || pendingRef.current || liveIdentity.current.id !== owner.id || liveIdentity.current.role !== owner.role) throw new Error("Finish or close the current action before scanning a material.");
      const match = findMaterialStoreWithdrawalBarcode(inventory, code);
      setSearch(match.product.code); setPage(1);
      setScanMatch({ key: entryKey(match.product.id, match.presentation.id), productName: match.product.name, presentationName: match.presentation.name });
    }} /><p className="text-xs text-muted-foreground">Use the camera, a barcode reader or enter the code. Scanning finds the exact presentation without changing any quantities.</p>{scanMatch && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Found <strong>{scanMatch.productName} · {scanMatch.presentationName}</strong>. Enter the quantity in the highlighted row. Your other selections are kept.</p>}</div><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" aria-label="Search store materials" placeholder="Search product, code or barcode" value={search} onChange={event => { setSearch(event.target.value); setPage(1); setScanMatch(null); }} /></div><div className="flex flex-wrap items-center justify-between gap-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={inStock} onChange={event => { setInStock(event.target.checked); setPage(1); setScanMatch(null); }} />Available stock only</label><span className="text-muted-foreground">{filtered.length} of {inventory.products.length} products</span></div><p className="text-sm font-medium">Enter the quantities to give to the technician. Stock is reduced when you confirm.</p><p className="text-sm text-muted-foreground">Units can be taken from closed packages automatically. Available quantities exclude reservations; boxes and individual units share the same stock.</p></section>
    <div className="space-y-4">{visible.map(product => <section key={product.id} className="overflow-hidden rounded-xl border bg-white"><div className="flex flex-wrap items-center justify-between gap-4 border-b bg-slate-50/60 p-4"><div className="flex min-w-0 items-center gap-3"><MaterialProductImage imageUrl={product.imageUrl} name={product.name} compact className="h-12 w-12 shrink-0 rounded-md" sizes="48px" /><div><p className="text-xs text-muted-foreground">{product.code}</p><h3 className="font-semibold">{product.name}</h3>{!product.isActive && <p className="text-xs text-amber-800">Inactive product</p>}</div></div><p className="text-sm"><strong>{quantity(product.availableBaseQuantity)} {product.baseUnit.name}</strong> available</p></div><div className="overflow-x-auto"><table className="w-full min-w-[460px] text-sm"><thead className="text-xs text-slate-600"><tr className="border-b"><th scope="col" className="p-3 text-left font-medium">Presentation</th><th scope="col" className="p-3 text-right font-medium">Available</th><th scope="col" className="p-3 text-right font-medium">To withdraw</th></tr></thead><tbody>{product.presentations.map(presentation => {
      const key = entryKey(product.id, presentation.id), raw = entries[key] ?? "", mayWithdraw = editable(product, presentation), valid = !raw.trim() || /^\d+$/.test(raw.trim()) && Number(raw) >= 1 && Number(raw) <= Math.min(1000000, presentation.availableQuantity);
      return <tr key={presentation.id} className={`border-b last:border-0${scanMatch?.key === key ? " bg-emerald-50 ring-1 ring-inset ring-emerald-300" : ""}`}><td className="p-3"><p className="font-medium">{presentation.name}{scanMatch?.key === key && <span className="ml-2 text-xs font-semibold text-emerald-800">Barcode match</span>}</p><p className="text-xs text-muted-foreground">{quantity(presentation.multiplier)} {product.baseUnit.name} each{!presentation.isActive ? " · Inactive" : ""}</p></td><td className="p-3 text-right tabular-nums">{quantity(presentation.availableQuantity)}</td><td className="p-3"><Input className="ml-auto w-28 text-right tabular-nums" type="number" inputMode="numeric" min={1} max={Math.min(1000000, presentation.availableQuantity)} step={1} placeholder="Quantity" aria-label={`Withdraw ${product.name} · ${presentation.name}`} aria-invalid={!valid} disabled={locked || !mayWithdraw || presentation.availableQuantity < 1} value={raw} onChange={event => { if (mayWithdraw) changeEntry(key, event.target.value); }} /></td></tr>;
    })}</tbody></table></div></section>)}{!visible.length && <p className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No materials match these filters.</p>}</div>
    {pages > 1 && <nav aria-label="Internal use material pages" className="flex items-center justify-center gap-3"><Button variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><span className="text-sm">Page {currentPage} of {pages}</span><Button variant="outline" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</Button></nav>}
    {canWithdraw && <section className="space-y-4 rounded-xl border bg-white p-5"><div className="grid gap-4 sm:grid-cols-2"><MaterialField label="Received by"><Input maxLength={200} placeholder="Technician or team name" disabled={locked} value={recipient} onChange={event => { if (!busyRef.current && !pendingRef.current && !needsRefresh) setRecipient(event.target.value); }} /></MaterialField><MaterialField label="Reason / job"><Input maxLength={1000} placeholder="For example: installation at Smith residence" disabled={locked} value={note} onChange={event => { if (!busyRef.current && !pendingRef.current && !needsRefresh) setNote(event.target.value); }} /></MaterialField></div><MaterialNotice error={validation} /><div className="flex flex-wrap items-center justify-between gap-3"><div className="text-sm"><p className="font-medium">{withdrawal?.lines.length ?? 0} presentations selected across {withdrawal?.productCount ?? 0} products</p><p className="text-xs text-muted-foreground">Selections from every page and filter are included.</p></div><Button disabled={locked || !withdrawal?.lines.length || !recipient.trim() || !note.trim() || Boolean(validation)} onClick={() => { scanAllowed.current = false; setError(""); setReview(true); }}><ClipboardCheck className="mr-2 h-4 w-4" />Review withdrawal</Button></div></section>}
    <Dialog open={review} onOpenChange={value => { if (!busy) setReview(value); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Review withdrawal · {inventory.store.name}</DialogTitle><DialogDescription>Confirm the materials being given to the technician.</DialogDescription></DialogHeader><div className="space-y-4 text-sm"><p><strong>Received by:</strong> {recipient.trim()}</p><p><strong>Reason / job:</strong> {note.trim()}</p><div className="divide-y rounded-lg border px-4">{withdrawal?.selected.map(line => <div key={line.key} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium">{line.productName}</p><p>{quantity(line.quantity)} × {line.presentationName}</p><p className="text-xs text-muted-foreground">{quantity(line.baseUnits)} {line.baseUnit} to withdraw</p></div><Button size="sm" variant="outline" disabled={busy} aria-label={`Remove ${line.productName} · ${line.presentationName}`} onClick={() => changeEntry(line.key, "")}><Trash2 className="h-4 w-4" /></Button></div>)}</div><p className="text-muted-foreground">All selected materials will leave this store together. If any item is no longer available, nothing will be withdrawn.</p></div><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setReview(false)}>Back to materials</Button><Button disabled={busy || Boolean(pending) || !withdrawal?.lines.length || Boolean(validation)} onClick={() => { void confirmWithdrawal(); }}>{busy ? "Saving withdrawal…" : "Confirm withdrawal"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={discardPrompt} onOpenChange={setDiscardPrompt}><DialogContent><DialogHeader><DialogTitle>Discard selection and refresh?</DialogTitle><DialogDescription>Refresh the available stock and start a new withdrawal. Your selection and technician details will be cleared after the refresh succeeds.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDiscardPrompt(false)}>Keep selection</Button><Button disabled={busy} onClick={() => { void refresh(); }}>Discard selection and refresh</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
