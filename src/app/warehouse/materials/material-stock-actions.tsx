"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { adjustMaterial, receiveMaterial, repackMaterial, transferMaterial, useMaterialInternally as withdrawMaterialInternally, type MaterialProduct } from "@/app/api/materials.api";
import type { WarehouseStore } from "@/app/api/warehouse.api";
import { MaterialField, MaterialNotice, MaterialScan, MaterialSubmit, materialInputClass, money, quantity, useMaterialAction } from "./materials-shared";
import { materialOpeningPreview } from "./material-opening-preview";

export type MaterialStockAction = "receive" | "internal" | "repack" | "transfer" | "adjust";
const titles: Record<MaterialStockAction, string> = { receive: "Receive a purchase", internal: "Internal use", repack: "Open or prepare packages", transfer: "Transfer between stores", adjust: "Adjust counted stock" };

export function findMaterialWithdrawalPresentation(product: MaterialProduct, code: string, storeId?: number) {
  const presentation = product.presentations.find(item => item.barcode === code.trim());
  if (!presentation) throw new Error("This barcode does not belong to a presentation of this material. Your selection has not changed.");
  if (!product.isActive || !presentation.isActive) throw new Error("This material or presentation is inactive.");
  if (storeId) {
    const inventory = product.inventoryByStore.find(item => item.store.id === storeId);
    const stock = inventory?.presentations.find(item => item.id === presentation.id);
    if (!inventory?.store.isActive || !stock || stock.availableQuantity < 1) throw new Error(`No ${presentation.name} are available in the selected store. Your selection has not changed.`);
  }
  return presentation;
}

export function MaterialStockActions({ product, stores, action, onSaved, initialPresentationId }: { product: MaterialProduct; stores: WarehouseStore[]; action: MaterialStockAction; onSaved: () => Promise<void>; initialPresentationId?: number }) {
  const task = useMaterialAction();
  const submitting = useRef(false), scanAllowed = useRef(false);
  const [scanMatch, setScanMatch] = useState("");
  const presentations = product.presentations.filter(p => p.isActive && (action !== "receive" || p.isPurchase) && (action !== "repack" || !p.isBase));
  const [form, setForm] = useState({ storeId: "", presentationId: presentations.some(p => p.id === initialPresentationId) ? String(initialPresentationId) : "", quantity: "", costPerPackage: "", supplier: "", reference: "", recipient: "", note: "", toStoreId: "", repackAction: "OPEN" });
  const update = (key: keyof typeof form, value: string) => { task.clear(); if (key === "presentationId" || key === "storeId") setScanMatch(""); setForm(current => ({ ...current, [key]: value })); };
  const presentation = product.presentations.find(p => p.id === Number(form.presentationId));
  const inventory = product.inventoryByStore.find(s => s.store.id === Number(form.storeId));
  const stock = inventory?.presentations.find(p => p.id === presentation?.id);
  const loose = inventory?.presentations.find(p => product.presentations.find(presentation => presentation.id === p.id)?.isBase)?.quantity ?? 0;
  const q = Number(form.quantity), baseQty = q * (presentation?.multiplier ?? 0);
  const withdrawal = action === "internal" || action === "transfer";
  scanAllowed.current = withdrawal && !task.busy && product.isActive;
  const shortLoose = withdrawal && presentation?.isBase && q > loose;
  const opening = materialOpeningPreview(product, Number(form.storeId), Number(form.presentationId), q);
  return <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (submitting.current) return; submitting.current = true; void task.run({ action, ...form, version: product.version }, async requestKey => {
    const common = { requestKey, productId: product.id, presentationId: Number(form.presentationId), storeId: Number(form.storeId), quantity: q, note: form.note.trim() || undefined };
    if (action === "receive") await receiveMaterial({ ...common, costPerPackage: Number(form.costPerPackage), supplier: form.supplier.trim() || undefined, reference: form.reference.trim() || undefined });
    if (action === "internal") await withdrawMaterialInternally({ ...common, recipient: form.recipient.trim(), note: form.note.trim() });
    if (action === "repack") await repackMaterial({ ...common, action: form.repackAction as "OPEN" | "PACK" });
    if (action === "transfer") { const { storeId, ...transfer } = common; await transferMaterial({ ...transfer, fromStoreId: storeId, toStoreId: Number(form.toStoreId) }); }
    if (action === "adjust") await adjustMaterial({ ...common, version: product.version, note: form.note.trim() });
    await onSaved(); setForm(current => ({ ...current, quantity: "", costPerPackage: "", note: "", reference: "" }));
  }, "Stock updated.").finally(() => { submitting.current = false; }); }}><h3 className="font-semibold">{titles[action]}</h3>
    {withdrawal && <div className="space-y-2 rounded-lg border bg-slate-50/60 p-3"><p className="text-sm font-medium">Find a presentation by barcode</p><MaterialScan embedded buttonLabel="Find presentation" disabled={task.busy || !product.isActive} onScan={async code => {
      if (!scanAllowed.current || submitting.current) throw new Error("Wait until the current action finishes before scanning a presentation.");
      const match = findMaterialWithdrawalPresentation(product, code, Number(form.storeId) || undefined);
      update("presentationId", String(match.id));
      setScanMatch(`Selected ${match.name} · ${quantity(match.multiplier)} ${product.baseUnit.name} each. Enter the quantity and confirm when ready.`);
    }} /><p className="text-xs text-muted-foreground">Use the camera, a barcode reader or enter the code. You can also select the presentation below. Scanning does not change stock or quantities.</p>{scanMatch && <p role="status" className="text-sm font-medium text-emerald-800">{scanMatch}</p>}</div>}
    <div className="grid gap-4 sm:grid-cols-2"><MaterialField label={action === "transfer" ? "From store" : "Store"}><select required className={materialInputClass} value={form.storeId} onChange={event => update("storeId", event.target.value)}><option value="">Select a store</option>{stores.filter(s => s.isActive).map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></MaterialField><MaterialField label="Presentation"><select required className={materialInputClass} value={form.presentationId} onChange={event => update("presentationId", event.target.value)}><option value="">Select a presentation</option>{presentations.map(p => <option key={p.id} value={p.id}>{p.name} · {p.multiplier} {product.baseUnit.name}</option>)}</select></MaterialField></div>
    {action === "receive" && presentation && <p className="rounded-lg bg-slate-50 p-3 text-sm">Each {presentation.unit.name.toLowerCase()} contains <strong>{quantity(presentation.multiplier)} {product.baseUnit.name.toLowerCase()}</strong>. Contents are defined in the product.</p>}
    {action === "repack" && <MaterialField label="Operation"><select className={materialInputClass} value={form.repackAction} onChange={event => update("repackAction", event.target.value)}><option value="OPEN">Open packages into loose units</option><option value="PACK">Prepare packages from loose units</option></select></MaterialField>}
    {action === "transfer" && <MaterialField label="To store"><select required className={materialInputClass} value={form.toStoreId} onChange={event => update("toStoreId", event.target.value)}><option value="">Select a destination</option>{stores.filter(s => s.isActive && s.id !== Number(form.storeId)).map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></MaterialField>}
    <div className="grid gap-4 sm:grid-cols-2"><MaterialField label={action === "adjust" ? "Actual counted quantity in this presentation" : "Quantity in this presentation"} hint={presentation && Number.isFinite(baseQty) ? `Equivalent to ${quantity(baseQty)} ${product.baseUnit.name.toLowerCase()}.` : undefined}><Input required type="number" min={action === "adjust" ? 0 : 1} max={1000000} step={1} value={form.quantity} onChange={event => update("quantity", event.target.value)} /></MaterialField>{action === "receive" && <MaterialField label="Cost per received package" hint={form.quantity && form.costPerPackage ? `Purchase total: ${money(q * Number(form.costPerPackage))}` : undefined}><Input required type="number" min={0} max={99999999} step="0.01" value={form.costPerPackage} onChange={event => update("costPerPackage", event.target.value)} /></MaterialField>}</div>
    {stock && action !== "receive" && <p className="text-sm text-muted-foreground">Physically in this presentation: {quantity(stock.quantity)}. {presentation?.isBase ? "Available including unopened packages" : "Available after reservations"}: {quantity(stock.availableQuantity)}.</p>}
    {shortLoose && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Only {quantity(loose)} loose {product.baseUnit.name.toLowerCase()} are on hand here. Confirming this {action === "internal" ? "withdrawal" : "transfer"} will open unreserved packages as needed.{opening.length > 0 && <span className="mt-1 block font-medium">Expected opening: {opening.map(pack => `${pack.quantity} × ${pack.name}`).join(", ")}.</span>}</p>}
    {action === "repack" && <p className="text-sm text-muted-foreground">{form.repackAction === "PACK" ? `Packages use loose stock. ${quantity(loose)} loose ${product.baseUnit.name.toLowerCase()} are on hand; open packages first if needed.` : "Opening changes the presentation only. The total quantity stays the same."}</p>}
    {action === "receive" && <div className="grid gap-4 sm:grid-cols-2"><MaterialField label="Supplier (optional)"><Input maxLength={200} value={form.supplier} onChange={event => update("supplier", event.target.value)} /></MaterialField><MaterialField label="Invoice / reference (optional)"><Input maxLength={200} value={form.reference} onChange={event => update("reference", event.target.value)} /></MaterialField></div>}
    {action === "internal" && <MaterialField label="Received by"><Input required maxLength={200} value={form.recipient} onChange={event => update("recipient", event.target.value)} /></MaterialField>}
    <MaterialField label={action === "internal" ? "Reason / job" : action === "adjust" ? "Reason for adjustment" : "Note (optional)"}><textarea required={action === "internal" || action === "adjust"} className={materialInputClass + " h-20"} maxLength={1000} value={form.note} onChange={event => update("note", event.target.value)} /></MaterialField>
    <MaterialNotice error={task.error} success={task.success} /><div className="flex justify-end"><MaterialSubmit busy={task.busy} disabled={!presentations.length || !stores.some(s => s.isActive)}>{action === "receive" ? "Confirm receipt" : action === "internal" ? "Confirm withdrawal" : action === "repack" ? "Confirm package conversion" : action === "transfer" ? "Confirm transfer" : "Save counted stock"}</MaterialSubmit></div>
  </form>;
}
