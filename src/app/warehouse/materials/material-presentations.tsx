"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { createMaterialPresentation, deleteMaterialPresentation, updateMaterialPresentation, type MaterialPresentation, type MaterialProduct, type MaterialUnit } from "@/app/api/materials.api";
import { MaterialField, MaterialNotice, MaterialSubmit, materialInputClass, money, useMaterialAction } from "./materials-shared";
import { MaterialBarcodeInput } from "./material-barcode-input";
import { MaterialLabels } from "./material-labels";
import { allowsMaterialDailyOperation } from "./material-operation-policy";

export function MaterialPresentations({ product, units, admin, onSaved }: { product: MaterialProduct; units: MaterialUnit[]; admin: boolean; onSaved: () => Promise<void> }) {
  const [editing, setEditing] = useState<MaterialPresentation | "new" | null>(null);
  const [label, setLabel] = useState<MaterialPresentation | null>(null);
  const [deleting, setDeleting] = useState<MaterialPresentation | null>(null);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [refreshWarning, setRefreshWarning] = useState("");
  const deleted = useRef(new Set<number>());
  const deletingNow = useRef(false);
  const [form, setForm] = useState({ unitId: "", multiplier: "", name: "", barcode: "", isPurchase: false, isSaleEnabled: false, isActive: true, salePrice: "" });
  const task = useMaterialAction();
  const dailyAllowed = allowsMaterialDailyOperation(product, { isBase: editing !== "new" && Boolean(editing?.isBase), multiplier: Number(form.multiplier) });
  const hasInventory = (id: number) => product.inventoryByStore.some(store => store.presentations.some(p => p.id === id && (p.quantity !== 0 || p.reservedQuantity !== 0)));
  function openDelete(p: MaterialPresentation) {
    if (!admin || p.isBase || hasInventory(p.id) || task.busy || deleted.current.has(p.id)) return;
    task.clear(); setDeleting(p);
  }
  async function confirmDelete() {
    if (!deleting || !admin || deleting.isBase || hasInventory(deleting.id) || deletingNow.current || task.busy || deleted.current.has(deleting.id)) return;
    const target = deleting;
    deletingNow.current = true;
    try {
      await task.run({ deletePresentation: target.id, version: target.version }, async requestKey => {
        await deleteMaterialPresentation(target.id, { requestKey, version: target.version });
        deleted.current.add(target.id);
        setDeletedIds(current => [...current, target.id]);
        setDeleting(null);
        if (editing && editing !== "new" && editing.id === target.id) setEditing(null);
        if (label?.id === target.id) setLabel(null);
        // The deletion is already confirmed. A failed refresh must never retry it.
        try { await onSaved(); setRefreshWarning(""); }
        catch { setRefreshWarning("The presentation was deleted, but the latest product information could not be loaded. Refresh the list to update it."); }
      }, "Presentation deleted.");
    } finally { deletingNow.current = false; }
  }
  const update = <K extends keyof typeof form>(key: K, value: typeof form[K]) => setForm(current => ({ ...current, [key]: value }));
  function edit(p: MaterialPresentation | "new") { task.clear(); setEditing(p); setForm(p === "new" ? { unitId: "", multiplier: "", name: "", barcode: "", isPurchase: false, isSaleEnabled: false, isActive: true, salePrice: "" } : { unitId: String(p.unitId), multiplier: String(p.multiplier), name: p.name, barcode: p.barcode ?? "", isPurchase: p.isPurchase, isSaleEnabled: p.isSaleEnabled, isActive: p.isActive, salePrice: p.salePrice == null ? "" : String(p.salePrice) }); }
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Presentations and barcodes</h3>{admin && <Button size="sm" variant="outline" disabled={task.busy} onClick={() => edit("new")}>Add presentation</Button>}</div>
    <p className="text-sm text-muted-foreground">Each barcode identifies a presentation. Identical boxes or bags share that code. Creating a presentation does not add stock.</p>
    <div className="divide-y">{product.presentations.filter(p => !deletedIds.includes(p.id)).map(p => <div key={p.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1"><p className="break-words text-sm font-semibold">{p.name} <span className="font-normal text-muted-foreground">· {p.multiplier} {product.baseUnit.name.toLowerCase()}</span></p><p className="break-all font-mono text-xs text-muted-foreground">{p.barcode || "No barcode · manual selection"}</p><p className="text-xs text-muted-foreground">{p.isBase ? "Base unit · " : ""}{!allowsMaterialDailyOperation(product, p) ? "Counting only · Unavailable for daily operations" : <>{p.isPurchase ? "Purchase · " : ""}{p.isSaleEnabled ? `Sale: ${money(p.salePrice ?? 0)}` : "Not enabled for sale"}</>}{!p.isActive ? " · Inactive" : ""}</p>
        {admin && !p.isBase && hasInventory(p.id) && <p id={`presentation-${p.id}-delete-reason`} className="text-xs text-muted-foreground">Cannot delete while stock or reservations remain.</p>}
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">{p.barcode && <Button size="sm" variant="outline" disabled={task.busy} onClick={() => setLabel(p)}>Print labels</Button>}{admin && <>
        <Button size="sm" variant="outline" disabled={task.busy} onClick={() => edit(p)}>Edit</Button>
        {!p.barcode && <Button size="sm" variant="outline" disabled={task.busy} onClick={() => task.run({ generateBarcode: p.id }, async requestKey => { await updateMaterialPresentation(p.id, { requestKey, version: p.version, generateBarcode: true }); await onSaved(); }, "Barcode generated.")}>Generate barcode</Button>}
        {!p.isBase && <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800" disabled={task.busy || hasInventory(p.id)} aria-label={`Delete ${p.name}`} aria-describedby={hasInventory(p.id) ? `presentation-${p.id}-delete-reason` : undefined} onClick={() => openDelete(p)}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</Button>}
      </>}</div>
    </div>)}</div>
    {editing && <form className="space-y-4 rounded-lg border bg-slate-50 p-4" onSubmit={event => { event.preventDefault(); void task.run({ editing: typeof editing === "object" ? editing.id : editing, ...form }, async requestKey => {
      if (editing === "new") await createMaterialPresentation(product.id, { requestKey, unitId: Number(form.unitId), multiplier: Number(form.multiplier), name: form.name.trim() || undefined, barcode: form.barcode.trim() || undefined, isPurchase: dailyAllowed && form.isPurchase, isSaleEnabled: dailyAllowed && form.isSaleEnabled, salePrice: form.salePrice !== "" ? Number(form.salePrice) : undefined });
      else await updateMaterialPresentation(editing.id, { requestKey, version: editing.version, name: form.name.trim(), barcode: form.barcode.trim() || null, isPurchase: dailyAllowed && form.isPurchase, isSaleEnabled: dailyAllowed && form.isSaleEnabled, isActive: form.isActive, salePrice: form.salePrice !== "" ? Number(form.salePrice) : undefined });
      await onSaved(); setEditing(null);
    }, "Presentation saved."); }}><h4 className="font-medium">{editing === "new" ? "New presentation" : "Edit presentation"}</h4><div className="grid gap-4 sm:grid-cols-2"><MaterialField label="Unit of measure"><select required disabled={editing !== "new"} className={materialInputClass} value={form.unitId} onChange={event => update("unitId", event.target.value)}><option value="">Select a unit</option>{units.filter(unit => unit.isActive || unit.id === Number(form.unitId)).map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></MaterialField><MaterialField label={`How many ${product.baseUnit.name.toLowerCase()} in this presentation?`}><Input required disabled={editing !== "new"} type="number" min={1} max={1000000} step={1} value={form.multiplier} onChange={event => update("multiplier", event.target.value)} /></MaterialField></div>
      <MaterialField label="Presentation name" hint="For example: Bag of 50 or Box of 20."><Input required={editing !== "new"} maxLength={120} value={form.name} onChange={event => update("name", event.target.value)} /></MaterialField><MaterialField label="Barcode (optional)" hint="Leave empty for manual selection. You can generate an internal barcode later if needed."><MaterialBarcodeInput key={editing === "new" ? "new" : editing.id} label="Presentation barcode" value={form.barcode} onChange={value => update("barcode", value)} disabled={task.busy} /></MaterialField>
      <div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={dailyAllowed && form.isPurchase} disabled={!dailyAllowed || task.busy} onChange={event => update("isPurchase", event.target.checked)} />Available for purchase receipts</label><label className="flex items-center gap-2"><input type="checkbox" checked={dailyAllowed && form.isSaleEnabled} disabled={!dailyAllowed || task.busy} onChange={event => update("isSaleEnabled", event.target.checked)} />Enabled for sale</label>{editing !== "new" && !editing.isBase && <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={event => update("isActive", event.target.checked)} />Active</label>}</div>
      {!dailyAllowed && <p className="text-sm text-muted-foreground">Full packages only is enabled. This presentation can be used for counting and adjustments, but cannot be received, issued, transferred or sold individually.</p>}
      {dailyAllowed && form.isSaleEnabled && <MaterialField label="Sale price for this presentation"><Input required type="number" min="0.01" step="0.01" max={99999999} value={form.salePrice} onChange={event => update("salePrice", event.target.value)} /></MaterialField>}
      <MaterialNotice error={task.error} /><div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={task.busy} onClick={() => setEditing(null)}>Cancel</Button><MaterialSubmit busy={task.busy}>Save presentation</MaterialSubmit></div>
    </form>}
    {!editing && !deleting && <MaterialNotice error={task.error} success={task.success} />}
    {refreshWarning && <div role="status" className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>{refreshWarning}</p><Button type="button" size="sm" variant="outline" disabled={task.busy} onClick={() => task.read(async () => { await onSaved(); setRefreshWarning(""); })}>Refresh presentations</Button></div>}
    <AlertDialog open={!!deleting && admin} onOpenChange={open => { if (!open && !task.busy && !deletingNow.current) { setDeleting(null); task.clear(); } }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Delete presentation?</AlertDialogTitle><AlertDialogDescription>This permanently removes this presentation and its barcode. Only presentations with no inventory, movements or sales can be deleted. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
        {deleting && <div className="space-y-1 rounded-lg border bg-slate-50 p-4 text-sm"><p className="break-words font-semibold">{deleting.name}</p><p className="break-words text-muted-foreground">{product.name}</p><p>Contents: <span className="font-medium">{deleting.multiplier} {product.baseUnit.name.toLowerCase()}</span></p></div>}
        {deleting && hasInventory(deleting.id) && <MaterialNotice error="This presentation now has stock or reservations and cannot be deleted." />}
        <MaterialNotice error={task.error} />
        <AlertDialogFooter><AlertDialogCancel disabled={task.busy}>Cancel</AlertDialogCancel><Button type="button" variant="destructive" disabled={task.busy || !deleting || hasInventory(deleting.id)} onClick={confirmDelete}>{task.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}{task.busy ? "Deleting…" : "Delete presentation"}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    {label && <MaterialLabels product={product} presentation={label} onClose={() => setLabel(null)} />}
  </div>;
}
