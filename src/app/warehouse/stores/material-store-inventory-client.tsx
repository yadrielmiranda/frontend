"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialProductImage } from "@/components/material-product-image";
import { useAuth } from "@/contexts/AuthContext";
import { isApiError } from "@/app/api/_base";
import { warehouseRequestKey } from "@/app/api/warehouse.api";
import { countMaterialStore, materialStoreCountInventory, type MaterialStoreCountInput, type MaterialStoreCountInventory, type MaterialStoreCountProduct, type MaterialStoreCountResult } from "@/app/api/materials.api";
import { errorText, MaterialField, MaterialNotice, MaterialScan, quantity } from "../materials/materials-shared";

type Identity = { id: number; role: string };
type CountEntries = Record<string, string>;
const entryKey = (productId: number, presentationId: number) => `${productId}:${presentationId}`;
const editable = (product: MaterialStoreCountProduct, presentation: MaterialStoreCountProduct["presentations"][number]) => product.isActive && presentation.isActive;
const difference = (value: number) => `${value > 0 ? "+" : ""}${quantity(value)}`;
const PAGE_SIZE = 20;

/** Empty fields mean uncounted; all entered rows are included, even outside the current page. */
export function buildMaterialStoreCount(inventory: MaterialStoreCountInventory, entries: CountEntries) {
  const products: MaterialStoreCountInput["products"] = [];
  const changes: Array<{ key: string; productName: string; presentationName: string; before: number; after: number; deltaBaseUnits: number; baseUnit: string }> = [];
  let countedPresentations = 0, totalPresentations = 0;
  for (const product of inventory.products) {
    const counts: MaterialStoreCountInput["products"][number]["counts"] = [];
    for (const presentation of product.presentations) {
      if (!editable(product, presentation)) continue;
      totalPresentations++;
      const key = entryKey(product.id, presentation.id), raw = entries[key]?.trim() ?? "";
      if (!raw) continue;
      if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > 1000000) throw new Error(`Enter a whole number from 0 to 1,000,000 for ${product.name} · ${presentation.name}.`);
      const after = Number(raw);
      counts.push({ presentationId: presentation.id, quantity: after });
      countedPresentations++;
      if (after !== presentation.quantity) changes.push({ key, productName: product.name, presentationName: `${presentation.name}${presentation.isBase ? " (loose)" : " (closed)"}`, before: presentation.quantity, after, deltaBaseUnits: (after - presentation.quantity) * presentation.multiplier, baseUnit: product.baseUnit.name });
    }
    if (counts.length) products.push({ productId: product.id, version: product.version, counts });
  }
  return { products, changes, countedPresentations, totalPresentations };
}

export function MaterialStoreInventoryClient({ initial, initialIdentity }: { initial: MaterialStoreCountInventory; initialIdentity: Identity }) {
  const { user, revalidate } = useAuth();
  const owner = useRef(initialIdentity).current;
  const liveIdentity = useRef({ id: user?.id, role: user?.role?.name });
  liveIdentity.current = { id: user?.id, role: user?.role?.name };
  const [inventory, setInventory] = useState(initial), [entries, setEntries] = useState<CountEntries>({}), [note, setNote] = useState("");
  const [search, setSearch] = useState(""), [showZero, setShowZero] = useState(true), [page, setPage] = useState(1);
  const [scannedMatch, setScannedMatch] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [review, setReview] = useState(false), [discardPrompt, setDiscardPrompt] = useState(false);
  const [pending, setPending] = useState<MaterialStoreCountInput | null>(null), [saved, setSaved] = useState<MaterialStoreCountResult | null>(null), [needsRefresh, setNeedsRefresh] = useState(false);
  const busyRef = useRef(false), pendingRef = useRef<MaterialStoreCountInput | null>(null), savedRef = useRef<MaterialStoreCountResult | null>(null);
  const ownerMatches = user?.id === owner.id && user?.role?.name === owner.role;
  const canCount = owner.role === "admin" && inventory.store.isActive;
  const locked = busy || Boolean(pending) || needsRefresh || !canCount;
  const hasEntries = Object.values(entries).some(value => value.trim() !== "");
  const dirty = hasEntries || Boolean(note.trim());
  let count: ReturnType<typeof buildMaterialStoreCount> | null = null, validation = "";
  try { count = buildMaterialStoreCount(inventory, entries); } catch (e) { validation = errorText(e); }
  const query = search.trim().toLowerCase();
  const filtered = inventory.products.filter(product => (showZero || product.totalBaseQuantity > 0) && (!query || `${product.name} ${product.code} ${product.presentations.map(p => p.barcode ?? "").join(" ")}`.toLowerCase().includes(query)));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), currentPage = Math.min(page, pages), visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function verifyAccount() {
    const account = await revalidate();
    if (!account || account.id !== owner.id || account.role?.name !== owner.role || liveIdentity.current.id !== owner.id || liveIdentity.current.role !== owner.role) throw new Error("Your account has changed. Reopen this store's inventory before continuing.");
    return account;
  }
  async function readInventory() {
    await verifyAccount();
    const next = await materialStoreCountInventory(initial.store.id);
    await verifyAccount();
    setInventory(next); setEntries({}); setNote(""); setNeedsRefresh(false); setPage(1); setScannedMatch("");
  }
  async function refresh() {
    if (busyRef.current || pendingRef.current) return;
    busyRef.current = true; setBusy(true); setError(""); setDiscardPrompt(false);
    try { await readInventory(); }
    catch (e) { setError(errorText(e)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function confirmCount() {
    if (busyRef.current || !canCount || !ownerMatches || (savedRef.current && needsRefresh)) return;
    const retry = pendingRef.current;
    if (!retry && (!count?.countedPresentations || !note.trim() || validation || !review)) return;
    const body: MaterialStoreCountInput = retry ?? { requestKey: warehouseRequestKey(), note: note.trim(), products: count!.products };
    busyRef.current = true; setBusy(true); setError("");
    try {
      await verifyAccount();
      if (owner.role !== "admin") throw new Error("An administrator must confirm the inventory count.");
      let result: MaterialStoreCountResult;
      try { result = await countMaterialStore(initial.store.id, body); }
      catch (e) {
        const definitiveRejection = isApiError(e) && [400, 404, 409, 422].includes(e.status);
        if (definitiveRejection) { pendingRef.current = null; setPending(null); }
        else if (retry || !isApiError(e) || e.status >= 500 || e.status === 408) { pendingRef.current = body; setPending(body); }
        setReview(false);
        throw e;
      }
      // Mark a known save before any follow-up read. A failed refresh must never repeat the adjustment.
      savedRef.current = result; setSaved(result); setNeedsRefresh(true);
      pendingRef.current = null; setPending(null); setEntries({}); setNote(""); setReview(false);
      try { await readInventory(); }
      catch { setError("Your inventory count was saved. Refresh stock before starting another count."); }
    } catch (e) { setError(errorText(e)); }
    finally { busyRef.current = false; setBusy(false); }
  }

  if (!ownerMatches) return <p role="alert" className="rounded-xl border bg-white p-5 text-sm">Verify your account or reopen this store&apos;s inventory to continue.</p>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-semibold">Material inventory · {inventory.store.name}</h2><p className="mt-1 text-sm text-muted-foreground">Count all materials in this store, including materials for internal use.</p></div>
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/warehouse/stores">All stores</Link></Button>{inventory.store.isActive && <Button asChild variant="outline" disabled={dirty || busy || Boolean(pending)}><Link href={`/warehouse/stores/${inventory.store.id}/internal-use`} aria-disabled={dirty || busy || Boolean(pending)} onClick={event => { if (dirty || busy || pending) event.preventDefault(); }}>Internal use</Link></Button>}<Button variant="outline" disabled={busy || Boolean(pending)} onClick={() => { if (dirty) setDiscardPrompt(true); else void refresh(); }}><RefreshCw className="mr-2 h-4 w-4" />Refresh stock</Button></div>
    </div>
    <MaterialNotice error={error} success={saved ? `Inventory count saved for ${saved.storeName}: ${saved.countedProducts} products counted, ${saved.adjustedProducts} adjusted.` : undefined} />
    {!canCount && <p className="rounded-lg border bg-slate-50 p-4 text-sm">{!inventory.store.isActive ? "This store is inactive. Inventory is read-only." : "Inventory is read-only. An administrator can record and confirm a physical count."}</p>}
    {pending && <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"><p>We could not confirm whether your count was saved. Retry this same count before making further changes.</p><Button disabled={busy} onClick={() => { void confirmCount(); }}>Retry same count</Button></section>}
    <section className="space-y-4 rounded-xl border bg-white p-5">
      <MaterialScan disabled={busy || Boolean(pending) || needsRefresh || review || discardPrompt} onScan={async code => {
        if (busyRef.current || pendingRef.current || needsRefresh || review || discardPrompt || !ownerMatches) throw new Error("Finish the current action before finding another material.");
        const match = inventory.products.flatMap(product => product.presentations.map(presentation => ({ product, presentation }))).find(({ presentation }) => presentation.barcode === code);
        if (!match) throw new Error("No material in this store has this barcode. Search by name or product code instead.");
        setSearch(match.product.code); setPage(1);
        if (match.product.totalBaseQuantity === 0) setShowZero(true);
        setScannedMatch(`${match.product.name} · ${match.presentation.name}`);
      }} />
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" aria-label="Search store materials" placeholder="Search product, code or barcode" value={search} onChange={event => { setSearch(event.target.value); setPage(1); setScannedMatch(""); }} /></div>
      {scannedMatch && <p role="status" className="text-sm text-emerald-800">Found: <strong>{scannedMatch}</strong>. Entered counts stay unchanged.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={showZero} onChange={event => { setShowZero(event.target.checked); setPage(1); }} />Include products with zero stock</label><span className="text-muted-foreground">{filtered.length} of {inventory.products.length} products</span></div>
      <p className="text-sm text-slate-600">Count closed boxes and bags separately. For loose units, enter only those outside packages. Include reserved materials that are still physically in the store.</p>
      {canCount && <p className="text-sm font-medium">Leave a field blank if you have not counted it. Enter 0 only when none remain.</p>}
    </section>
    <div className="space-y-4">
      {visible.map(product => <section key={product.id} className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-slate-50/60 p-4"><div className="flex min-w-0 items-center gap-3"><MaterialProductImage imageUrl={product.imageUrl} name={product.name} compact className="h-12 w-12 shrink-0 rounded-md" sizes="48px" /><div><p className="text-xs text-muted-foreground">{product.code}</p><h3 className="font-semibold">{product.name}</h3>{!product.isActive && <p className="text-xs text-amber-800">Inactive product · read-only</p>}</div></div><div className="text-sm"><p><span className="font-semibold">{quantity(product.totalBaseQuantity)} {product.baseUnit.name}</span> on hand</p><p className="text-xs text-muted-foreground">{quantity(product.reservedBaseQuantity)} reserved · {quantity(product.availableBaseQuantity)} available</p></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[540px] text-sm"><thead className="text-xs text-slate-600"><tr className="border-b"><th scope="col" className="p-3 text-left font-medium">Presentation</th><th scope="col" className="p-3 text-right font-medium">On hand</th><th scope="col" className="p-3 text-right font-medium">Counted</th><th scope="col" className="p-3 text-right font-medium">Difference</th></tr></thead><tbody>{product.presentations.map(presentation => {
          const key = entryKey(product.id, presentation.id), raw = entries[key] ?? "", entered = raw.trim() !== "", valid = /^\d+$/.test(raw.trim()) && Number(raw) <= 1000000;
          const delta = valid ? Number(raw) - presentation.quantity : 0, mayCount = editable(product, presentation);
          return <tr key={presentation.id} className="border-b last:border-0"><td className="p-3"><p className="font-medium">{presentation.name}</p><p className="text-xs text-muted-foreground">{presentation.isBase ? "Loose units only" : `Closed packages · ${quantity(presentation.multiplier)} ${product.baseUnit.name} each`}{!presentation.isActive ? " · Inactive" : ""}</p>{presentation.reservedQuantity > 0 && <p className="mt-1 text-xs text-muted-foreground">{quantity(presentation.reservedQuantity)} reserved</p>}</td><td className="p-3 text-right tabular-nums">{quantity(presentation.quantity)}</td><td className="p-3"><Input className="ml-auto w-28 text-right tabular-nums" type="number" inputMode="numeric" min={0} max={1000000} step={1} placeholder="Not counted" aria-label={`Counted ${product.name} · ${presentation.name}`} aria-invalid={entered && !valid} disabled={locked || !mayCount} value={raw} onChange={event => { if (busyRef.current || pendingRef.current || !canCount || !mayCount || needsRefresh) return; setEntries(current => ({ ...current, [key]: event.target.value })); setSaved(null); }} /></td><td className={`p-3 text-right tabular-nums ${delta < 0 ? "text-red-700" : delta > 0 ? "text-emerald-700" : "text-muted-foreground"}`}>{entered && valid ? difference(delta) : "—"}</td></tr>;
        })}</tbody></table></div>
      </section>)}
      {!visible.length && <p className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No materials match these filters.</p>}
    </div>
    {pages > 1 && <nav aria-label="Material inventory pages" className="flex items-center justify-center gap-3"><Button variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><span className="text-sm">Page {currentPage} of {pages}</span><Button variant="outline" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</Button></nav>}
    {canCount && <section className="space-y-4 rounded-xl border bg-white p-5"><MaterialField label="Reason for inventory count"><Input maxLength={1000} placeholder="For example: monthly physical inventory" disabled={locked} value={note} onChange={event => setNote(event.target.value)} /></MaterialField><MaterialNotice error={validation} /><div className="flex flex-wrap items-center justify-between gap-3"><div className="text-sm"><p className="font-medium">{count?.countedPresentations ?? 0} presentations counted across {count?.products.length ?? 0} products</p><p className="text-xs text-muted-foreground">Counts from every page and filter are included. Blank fields stay unchanged.</p></div><Button disabled={locked || !count?.countedPresentations || !note.trim() || Boolean(validation)} onClick={() => { setError(""); setReview(true); }}><ClipboardCheck className="mr-2 h-4 w-4" />Review count</Button></div></section>}
    <Dialog open={review} onOpenChange={value => { if (!busy) setReview(value); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Review inventory count · {inventory.store.name}</DialogTitle><DialogDescription>Check the differences before applying this count to the store.</DialogDescription></DialogHeader><div className="space-y-4 text-sm"><p><strong>{count?.countedPresentations ?? 0} counted presentations</strong> in {count?.products.length ?? 0} products. {(count?.totalPresentations ?? 0) - (count?.countedPresentations ?? 0)} presentations were left blank and will stay unchanged.</p><p><strong>Reason:</strong> {note.trim()}</p><div className="divide-y rounded-lg border px-4">{count?.changes.map(change => <div key={change.key} className="space-y-1 py-3"><p className="font-medium">{change.productName} · {change.presentationName}</p><p>{quantity(change.before)} on hand → {quantity(change.after)} counted <span className={change.after < change.before ? "text-red-700" : "text-emerald-700"}>({difference(change.after - change.before)})</span></p><p className="text-xs text-muted-foreground">{difference(change.deltaBaseUnits)} {change.baseUnit}</p></div>)}{!count?.changes.length && <p className="py-4">All entered counts match the current stock. The completed count will still be recorded.</p>}</div><p className="text-muted-foreground">Only entered quantities will be updated. If stock changes before confirmation, refresh it and count again.</p></div><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setReview(false)}>Back to count</Button><Button disabled={busy || Boolean(pending) || !note.trim()} onClick={() => { void confirmCount(); }}>{busy ? "Saving count…" : "Confirm inventory count"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={discardPrompt} onOpenChange={setDiscardPrompt}><DialogContent><DialogHeader><DialogTitle>Discard entered counts and refresh?</DialogTitle><DialogDescription>Refreshing starts a new count using the latest stock. The quantities and reason you entered will be cleared after the refresh succeeds.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDiscardPrompt(false)}>Keep counting</Button><Button disabled={busy} onClick={() => { void refresh(); }}>Discard counts and refresh</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
