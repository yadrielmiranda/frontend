"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMaterialSale, materialBarcode, materialSales, type MaterialSale, type MaterialCatalog, type MaterialSaleCustomerInput } from "@/app/api/materials.api";
import { isApiError } from "@/app/api/_base";
import { useAuth } from "@/contexts/AuthContext";
import type { WarehouseStore } from "@/app/api/warehouse.api";
import { MaterialField, MaterialNotice, MaterialScan, MaterialSubmit, materialInputClass, materialPanelClass, money, useMaterialAction } from "./materials-shared";
import { materialPublicSaleStatus } from "./material-sale-status";
import { emptyMaterialSaleCustomer, materialSaleCustomerInput, MaterialSaleCustomerFields } from "./material-sale-customer-fields";
import { allowsMaterialDailyOperation, materialFullPackagesOnlyMessage } from "./material-operation-policy";

type DraftLine = { presentationId: number; productName: string; presentationName: string; quantity: number; unitPrice: number };
type SaleBody = { storeId: number; note?: string; lines: { presentationId: number; quantity: number }[] } & MaterialSaleCustomerInput;
export function MaterialSalesClient({ initial, catalog, stores }: { initial: MaterialSale[]; catalog: MaterialCatalog; stores: WarehouseStore[] }) {
  const router = useRouter(), task = useMaterialAction();
  const { user, revalidate } = useAuth();
  const [sales, setSales] = useState(initial), [creating, setCreating] = useState(false), [search, setSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState(""), [appliedOrderSearch, setAppliedOrderSearch] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [form, setForm] = useState({ storeId: "", note: "" });
  const [customerSelection, setCustomerSelection] = useState(emptyMaterialSaleCustomer);
  const [validationError, setValidationError] = useState("");
  const [unconfirmedSale, setUnconfirmedSale] = useState<SaleBody | null>(null);
  const [savedSale, setSavedSale] = useState<MaterialSale | null>(null);
  const pendingSale = useRef<SaleBody | null>(null);
  const pendingStaffId = useRef<number | null>(null);
  const savedSaleRef = useRef<MaterialSale | null>(null);
  const creatingRef = useRef(false);
  const draftOpen = useRef(false), draftGeneration = useRef(0);
  const liveStaff = useRef({ id: user?.id, role: user?.role?.name });
  draftOpen.current = creating;
  liveStaff.current = { id: user?.id, role: user?.role?.name };
  const locked = task.busy || Boolean(unconfirmedSale) || Boolean(savedSale);
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  function add(line: Omit<DraftLine, "quantity">) {
    if (creatingRef.current || pendingSale.current || savedSaleRef.current) return;
    setLines(current => current.some(l => l.presentationId === line.presentationId) ? current.map(l => l.presentationId === line.presentationId ? { ...l, quantity: l.quantity + 1 } : l) : [...current, { ...line, quantity: 1 }]);
  }
  async function scanPresentation(code: string) {
    if (!draftOpen.current || creatingRef.current || pendingSale.current || savedSaleRef.current) return;
    const generation = draftGeneration.current, staff = liveStaff.current;
    const current = () => draftOpen.current && draftGeneration.current === generation
      && !creatingRef.current && !pendingSale.current && !savedSaleRef.current
      && liveStaff.current.id === staff.id && liveStaff.current.role === staff.role;
    try {
      const { product, presentation } = await materialBarcode(code);
      // Closing/reopening the draft or starting a save invalidates an in-flight lookup.
      if (!current()) return;
      if (!allowsMaterialDailyOperation(product, presentation)) throw new Error(materialFullPackagesOnlyMessage);
      if (!product.isActive || !product.isSaleEnabled || !presentation.isSaleEnabled || !presentation.isActive || presentation.salePrice == null) throw new Error("This presentation is not enabled for sale.");
      add({ presentationId: presentation.id, productName: product.name, presentationName: presentation.name, unitPrice: Number(presentation.salePrice) });
    } catch (error) {
      if (current()) throw error;
    }
  }
  function saveSale(body: SaleBody) {
    if (savedSaleRef.current || (pendingSale.current && body !== pendingSale.current)) return;
    draftGeneration.current++;
    setValidationError("");
    void task.run(body, async requestKey => {
      creatingRef.current = true;
      try {
        const account = await revalidate();
        if (!account || account.id !== user?.id) throw new Error("Please verify your account before creating the sale.");
        if (pendingStaffId.current !== null && pendingStaffId.current !== account.id) throw new Error("Sign in with the staff account that started this sale to retry it.");
        let sale: MaterialSale;
        try { sale = await createMaterialSale({ requestKey, ...body }); }
        catch (error) {
          const uncertain = !isApiError(error) || error.status >= 500 || error.status === 408;
          if (uncertain && !pendingSale.current) {
            pendingSale.current = body; pendingStaffId.current = account.id; setUnconfirmedSale(body);
          }
          throw error;
        }
        savedSaleRef.current = sale; setSavedSale(sale);
        pendingSale.current = null; setUnconfirmedSale(null);
        // A navigation problem cannot turn a known saved sale into another creation attempt.
        try { router.push(`/warehouse/materials/sales/${sale.id}`); }
        catch { setValidationError("Your sale was saved. Use Open saved sale to continue."); }
      } finally { creatingRef.current = false; }
    }, "Sale created.");
  }
  const subtotal = lines.reduce((sum, l) => sum + Math.round(l.unitPrice * 100) * l.quantity, 0) / 100;
  const tax = Math.round(subtotal * Number(catalog.taxRate)) / 100;
  const products = catalog.products.map(product => ({ ...product, presentations: product.presentations.filter(p => allowsMaterialDailyOperation(product, p)) })).filter(p => p.presentations.length > 0 && `${p.name} ${p.code}`.toLowerCase().includes(search.toLowerCase()));
  const findOrders = (q: string) => task.read(async () => {
    const query = q.trim();
    const next = await materialSales(query ? { q: query } : undefined);
    setSales(next);
    setAppliedOrderSearch(query);
  });
  return <div className="space-y-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">Material sales</h2><p className="mt-1 text-sm text-muted-foreground">Reserve materials, collect payment and record delivery.</p></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/materials" target="_blank">Open catalog</Link></Button><Button asChild variant="outline"><Link href="/warehouse/materials">Materials</Link></Button><Button disabled={locked} onClick={() => { if (creatingRef.current || pendingSale.current || savedSaleRef.current) return; task.clear(); draftGeneration.current++; draftOpen.current = !draftOpen.current; setCreating(draftOpen.current); }}>{creating ? "Close new sale" : "New sale"}</Button></div></div><MaterialNotice error={task.error} success={task.success} />
    {creating && <section className={materialPanelClass}><h3 className="font-semibold">New sale</h3>
      <MaterialNotice error={validationError} />
      {unconfirmedSale && <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"><p>We could not confirm whether this sale was saved. Retry the same sale before starting another one.</p><Button type="button" disabled={task.busy} onClick={() => { if (pendingSale.current) saveSale(pendingSale.current); }}>Retry same sale</Button></div>}
      {savedSale && <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm"><p>Sale {savedSale.code} was saved.</p><Button asChild><Link href={`/warehouse/materials/sales/${savedSale.id}`}>Open saved sale</Link></Button></div>}
      <MaterialScan disabled={locked} onScan={scanPresentation} />
      <form className="space-y-5" onSubmit={event => {
        event.preventDefault(); if (locked || creatingRef.current || pendingSale.current || savedSaleRef.current) return;
        const customerInput = materialSaleCustomerInput(customerSelection);
        if (!customerInput) { setValidationError(customerSelection.mode === "registered" ? "Select a registered customer before creating the sale." : "Enter the customer's name before creating the sale."); return; }
        if (!Number.isInteger(Number(form.storeId)) || Number(form.storeId) <= 0 || !lines.length || lines.some(line => !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 1000000)) { setValidationError("Choose a store and add materials with valid quantities."); return; }
        saveSale({ ...customerInput, storeId: Number(form.storeId), note: form.note.trim() || undefined, lines: lines.map(({ presentationId, quantity }) => ({ presentationId, quantity })) });
      }}><fieldset disabled={locked} className="min-w-0 space-y-5">
        <MaterialField label="Store for fulfillment"><select required className={materialInputClass} value={form.storeId} onChange={event => update("storeId", event.target.value)}><option value="">Select a store</option>{stores.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></MaterialField>
        <MaterialSaleCustomerFields value={customerSelection} disabled={locked} onChange={selection => { if (creatingRef.current || pendingSale.current || savedSaleRef.current) return; setCustomerSelection(selection); setValidationError(""); }} />
        <div className="space-y-3"><MaterialField label="Find a product"><Input placeholder="Search materials available for sale" value={search} onChange={event => setSearch(event.target.value)} /></MaterialField><div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-3">{products.map(product => <div key={product.id} className="space-y-2 border-b py-2 last:border-0"><p className="text-sm font-medium">{product.name}</p><div className="flex flex-wrap gap-2">{product.presentations.map(p => <Button type="button" key={p.id} variant="outline" size="sm" onClick={() => add({ presentationId: p.id, productName: product.name, presentationName: p.name, unitPrice: Number(p.salePrice) })}>{p.name} · {money(p.salePrice)}</Button>)}</div></div>)}{!products.length && <p className="text-sm text-muted-foreground">No sale presentations found. Enable products and set presentation prices in Materials.</p>}</div></div>
        <div className="divide-y">{lines.map(line => <div key={line.presentationId} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1 text-sm"><p className="font-medium">{line.productName}</p><p className="text-muted-foreground">{line.presentationName} · {money(line.unitPrice)} each</p></div><Input className="w-24" aria-label={`Quantity of ${line.productName} ${line.presentationName}`} required type="number" min={1} max={1000000} step={1} value={line.quantity || ""} onChange={event => setLines(current => current.map(l => l.presentationId === line.presentationId ? { ...l, quantity: Number(event.target.value) } : l))} /><span className="w-24 text-right text-sm">{money(line.unitPrice * line.quantity)}</span><Button type="button" size="sm" variant="outline" onClick={() => setLines(current => current.filter(l => l.presentationId !== line.presentationId))}>Remove</Button></div>)}</div>
        <MaterialField label="Note (optional)"><textarea className={materialInputClass + " h-20"} maxLength={1000} value={form.note} onChange={event => update("note", event.target.value)} /></MaterialField><div className="space-y-1 text-right text-sm"><p>Subtotal: {money(subtotal)}</p><p>Sales tax ({catalog.taxRate}%): {money(tax)}</p><p className="text-lg font-semibold">Total: {money(subtotal + tax)}</p></div><p className="text-xs text-muted-foreground">Review the saved sale before confirming its reservation. Full payment is required before delivery. Stock is checked at confirmation.</p><div className="flex justify-end"><MaterialSubmit busy={task.busy} disabled={locked || !materialSaleCustomerInput(customerSelection) || !lines.length || lines.some(l => !Number.isInteger(l.quantity) || l.quantity < 1)}>Create sale for review</MaterialSubmit></div>
        </fieldset>
      </form></section>}
    <section className={materialPanelClass}>
      <div className="flex justify-between gap-3"><h3 className="font-semibold">Sales</h3><Button variant="outline" size="sm" disabled={task.busy} onClick={() => findOrders(appliedOrderSearch)}>Refresh</Button></div>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={event => { event.preventDefault(); void findOrders(orderSearch); }}>
        <Input aria-label="Find a material order" placeholder="Order number or customer name" maxLength={200} value={orderSearch} disabled={task.busy} onChange={event => setOrderSearch(event.target.value)} />
        <Button type="submit" variant="outline" disabled={task.busy}>Find order</Button>
        {appliedOrderSearch && <Button type="button" variant="ghost" disabled={task.busy} onClick={() => { setOrderSearch(""); void findOrders(""); }}>Clear</Button>}
      </form>
      <p className="text-xs text-muted-foreground">At pickup, find the customer&apos;s order and verify that it is paid and has not already been delivered.</p>
      <div className="divide-y">{sales.map(sale => <Link key={sale.id} href={`/warehouse/materials/sales/${sale.id}`} className="flex flex-col justify-between gap-3 rounded-lg px-2 py-4 hover:bg-slate-50 sm:flex-row sm:items-center"><div className="min-w-0"><p className="text-sm font-semibold">{sale.code} · {sale.customerName}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString()} · {materialPublicSaleStatus(sale)} · {sale.paymentStatus}</p></div><div className="text-sm sm:text-right"><p className="font-semibold">{money(sale.total)}</p><p className="text-muted-foreground">Balance: {money(sale.balance)}</p></div></Link>)}</div>
      {!sales.length && <p className="py-5 text-center text-sm text-muted-foreground">{appliedOrderSearch ? "No material orders match your search." : "No material sales yet."}</p>}
    </section>
  </div>;
}
