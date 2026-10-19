"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, Search, ShoppingCart, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialProductImage } from "@/components/material-product-image";
import { useAuth } from "@/contexts/AuthContext";
import { isApiError } from "@/app/api/_base";
import { cancelCustomerMaterialOrder, createCustomerMaterialOrder, createMaterialSale, customerMaterialOrder, materialCatalog, publicMaterialCheckout, type MaterialCatalog, type MaterialCatalogQuery, type MaterialSale, type MaterialSaleInput } from "@/app/api/materials.api";
import type { WarehouseStore } from "@/app/api/warehouse.api";
import { emptyMaterialSaleCustomer, materialSaleCustomerInput, MaterialSaleCustomerFields } from "@/app/warehouse/materials/material-sale-customer-fields";
import { errorText, MaterialField, MaterialNotice, MaterialSubmit, materialInputClass, money, quantity, useMaterialAction } from "@/app/warehouse/materials/materials-shared";
import { allowsMaterialDailyOperation } from "@/app/warehouse/materials/material-operation-policy";

type Product = MaterialCatalog["products"][number];
type Presentation = Product["presentations"][number];
type CartLine = { presentationId: number; productId: number; productName: string; imageUrl?: string | null; presentationName: string; multiplier: number; quantity: number; unitPrice: number; availableQuantity: number };
type OrderBody = Omit<Parameters<typeof createCustomerMaterialOrder>[0], "requestKey">;
type KnownOrder = MaterialSale & { canCancel?: boolean };
type SaleBody = Omit<MaterialSaleInput, "requestKey">;
type CatalogViewer = { id: number; role: string };
const PAGE_SIZE = 24;
const MAX_CART_LINES = 100;
const MAX_QUANTITY = 1000000;

function orderPath(order: MaterialSale) {
  try {
    const pathname = new URL(order.publicUrl, "https://material-order.invalid").pathname;
    return /^\/public\/material-sales\/[^/]+\/?$/.test(pathname) ? pathname : null;
  } catch { return null; }
}

export function MaterialsCatalogClient({ initial, initialQuery = {}, viewer, stores = [] }: { initial: MaterialCatalog; initialQuery?: MaterialCatalogQuery; viewer?: CatalogViewer; stores?: WarehouseStore[] }) {
  const task = useMaterialAction(), router = useRouter();
  const { user, isAuthenticated, isLoading, error: authError, revalidate } = useAuth();
  // Keep this catalog tied to the account and role that loaded it, including during async retries.
  const viewerRef = useRef(viewer ?? { id: user?.id, role: user?.role?.name });
  const expectedViewer = viewerRef.current;
  const isStaff = ["admin", "operator"].includes(expectedViewer.role ?? "");
  const authReady = isAuthenticated && Boolean(user) && !isLoading && !authError
    && user?.id === expectedViewer.id && user?.role?.name === expectedViewer.role
    && ["admin", "operator", "client", "dealer"].includes(expectedViewer.role ?? "");
  const liveAccount = useRef({ id: user?.id, role: user?.role?.name, ready: authReady });
  liveAccount.current = { id: user?.id, role: user?.role?.name, ready: authReady };
  const activeStores = stores.filter(store => store.isActive);
  const [saleCustomer, setSaleCustomer] = useState(emptyMaterialSaleCustomer);
  const [storeId, setStoreId] = useState(activeStores.length === 1 ? String(activeStores[0].id) : "");
  const [unconfirmedSale, setUnconfirmedSale] = useState<SaleBody | null>(null);
  const [savedSale, setSavedSale] = useState<MaterialSale | null>(null);
  const [saleError, setSaleError] = useState("");
  const pendingSale = useRef<SaleBody | null>(null);
  const savedSaleRef = useRef<MaterialSale | null>(null);
  const creatingSale = useRef(false);
  const pendingStaff = useRef<CatalogViewer | null>(null);
  const [catalog, setCatalog] = useState(initial);
  const [query, setQuery] = useState<MaterialCatalogQuery>({ ...initialQuery, page: initial.page, pageSize: PAGE_SIZE });
  const [search, setSearch] = useState(initialQuery.q ?? "");
  const [loadingCatalog, setLoadingCatalog] = useState(false), [catalogError, setCatalogError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [amounts, setAmounts] = useState<Record<number, number>>({});
  const [detail, setDetail] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false), [cart, setCart] = useState<CartLine[]>([]);
  const [addedMessage, setAddedMessage] = useState("");
  const [unconfirmedOrder, setUnconfirmedOrder] = useState<OrderBody | null>(null);
  const [knownOrder, setKnownOrder] = useState<KnownOrder | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [cancelPending, setCancelPending] = useState(false);
  const knownOrderRef = useRef<KnownOrder | null>(null);
  const cancelPendingRef = useRef(false);
  const querySequence = useRef(0);
  const pendingAccountId = useRef<number | null>(null);
  const resultsTop = useRef<HTMLDivElement | null>(null);
  const locked = task.busy || !authReady || Boolean(unconfirmedOrder) || Boolean(knownOrder) || Boolean(unconfirmedSale) || Boolean(savedSale);
  const customerName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.username;
  const itemCount = cart.reduce((sum, line) => sum + (Number.isInteger(line.quantity) && line.quantity > 0 ? line.quantity : 0), 0);
  const totalPages = Math.max(1, Math.ceil(catalog.total / catalog.pageSize));
  const resultSummary = catalog.products.length
    ? `Showing ${(catalog.page - 1) * catalog.pageSize + 1}–${Math.min(catalog.page * catalog.pageSize, catalog.total)} of ${quantity(catalog.total)} products`
    : catalog.total ? "No products on this page" : "0 products";
  const hasFilters = Boolean(query.q || query.categoryId || query.brand || query.inStock);

  async function loadCatalog(nextQuery: MaterialCatalogQuery) {
    if (locked) return;
    const request = ++querySequence.current;
    setQuery(nextQuery); setLoadingCatalog(true); setCatalogError(""); setAddedMessage("");
    try {
      const next = await materialCatalog(nextQuery);
      if (request === querySequence.current) setCatalog(next);
    } catch (error) {
      if (request === querySequence.current) setCatalogError(errorText(error));
    } finally {
      if (request === querySequence.current) setLoadingCatalog(false);
    }
  }

  function selected(product: Product) {
    const presentations = product.presentations.filter(p => allowsMaterialDailyOperation(product, p));
    return presentations.find(p => p.id === selections[product.id]) ?? presentations[0];
  }

  function add(product: Product, presentation: Presentation, amount: number) {
    if (locked || !allowsMaterialDailyOperation(product, presentation) || !Number.isInteger(amount) || amount < 1 || amount > MAX_QUANTITY) return;
    const currentQuantity = cart.find(line => line.presentationId === presentation.id)?.quantity ?? 0;
    if (currentQuantity + amount > Math.min(presentation.availableQuantity, MAX_QUANTITY) || (!currentQuantity && cart.length >= MAX_CART_LINES)) return;
    setCart(current => {
      const existing = current.find(line => line.presentationId === presentation.id);
      if (existing && existing.quantity + amount > Math.min(presentation.availableQuantity, MAX_QUANTITY)) return current;
      if (!existing && current.length >= MAX_CART_LINES) return current;
      return existing
        ? current.map(line => line.presentationId === presentation.id ? { ...line, quantity: line.quantity + amount, availableQuantity: presentation.availableQuantity, unitPrice: Number(presentation.salePrice) } : line)
        : [...current, { presentationId: presentation.id, productId: product.id, productName: product.name, imageUrl: product.imageUrl, presentationName: presentation.name, multiplier: presentation.multiplier, quantity: amount, unitPrice: Number(presentation.salePrice), availableQuantity: presentation.availableQuantity }];
    });
    setAddedMessage(`${quantity(amount)} × ${product.name} · ${presentation.name} added to ${isStaff ? "the sale" : "your cart"}.`);
    setAmounts(current => ({ ...current, [product.id]: 1 }));
  }

  function rememberOrder(order: KnownOrder | null) {
    // The owner status projection may omit the creation response's payment link.
    const next = order ? { ...knownOrderRef.current, ...order, publicUrl: order.publicUrl || knownOrderRef.current?.publicUrl || "" } : null;
    knownOrderRef.current = next;
    setKnownOrder(next);
  }

  async function verifyCatalogAccount(staff: boolean) {
    const account = await revalidate();
    const roles = staff ? ["admin", "operator"] : ["client", "dealer"];
    if (!account || account.id !== expectedViewer.id || account.role?.name !== expectedViewer.role
      || !roles.includes(account.role?.name ?? "") || !liveAccount.current.ready
      || liveAccount.current.id !== expectedViewer.id || liveAccount.current.role !== expectedViewer.role) {
      throw new Error("Your account or role changed. Reload this page before continuing.");
    }
    return account;
  }

  async function verifyOrderAccount() {
    const account = await verifyCatalogAccount(false);
    if (pendingAccountId.current !== account.id) throw new Error("Sign in with the account that placed this order to continue.");
  }

  function saveSale(body: SaleBody) {
    if (!isStaff || !authReady || creatingSale.current || savedSaleRef.current || (pendingSale.current && pendingSale.current !== body)) return;
    setSaleError("");
    void task.run(body, async requestKey => {
      creatingSale.current = true;
      try {
        const account = await verifyCatalogAccount(true);
        if (pendingStaff.current && (pendingStaff.current.id !== account.id || pendingStaff.current.role !== account.role.name)) {
          throw new Error("Sign in with the staff account that started this sale to retry it.");
        }
        let sale: MaterialSale;
        try { sale = await createMaterialSale({ requestKey, ...body } as MaterialSaleInput); }
        catch (error) {
          const uncertain = !isApiError(error) || error.status >= 500 || error.status === 408;
          if (uncertain && !pendingSale.current) {
            pendingSale.current = body;
            pendingStaff.current = { id: account.id, role: account.role.name };
            setUnconfirmedSale(body);
          }
          throw error;
        }
        // Once saved, even a failed session check or navigation must never create this sale again.
        savedSaleRef.current = sale; setSavedSale(sale);
        pendingSale.current = null; setUnconfirmedSale(null);
        try {
          await verifyCatalogAccount(true);
          router.push(`/warehouse/materials/sales/${sale.id}`);
        } catch (error) { setSaleError(`Your sale was saved. ${errorText(error)}`); }
      } finally { creatingSale.current = false; }
    }, "Sale created.");
  }

  function openSavedSale() {
    if (!authReady || !savedSaleRef.current) return;
    void task.read(async () => {
      await verifyCatalogAccount(true);
      router.push(`/warehouse/materials/sales/${savedSaleRef.current!.id}`);
    });
  }

  async function openPayment(order: MaterialSale) {
    const path = orderPath(order);
    if (!path) throw new Error("Your order was saved, but its payment link is unavailable. Please contact us for assistance.");
    const token = decodeURIComponent(path.replace(/\/$/, "").split("/").at(-1)!);
    const checkout = await publicMaterialCheckout(token);
    if (!checkout.url) throw new Error("Your order was saved, but payment could not be opened. Please retry payment.");
    window.location.assign(checkout.url);
  }

  function placeOrder(body: OrderBody) {
    if (isStaff || !authReady || knownOrderRef.current) return;
    setPaymentError("");
    void task.run(body, async requestKey => {
      const account = await verifyCatalogAccount(false);
      if (pendingAccountId.current !== null && pendingAccountId.current !== account.id) throw new Error("Sign in with the account that placed this order to retry it.");
      let order: MaterialSale;
      try {
        order = await createCustomerMaterialOrder({ requestKey, ...body });
      } catch (error) {
        const uncertain = !isApiError(error) || error.status >= 500 || error.status === 408;
        if (uncertain && pendingAccountId.current === null) pendingAccountId.current = account.id;
        // A later rejected retry cannot disprove that an earlier request committed.
        setUnconfirmedOrder(current => current ?? (uncertain ? body : null));
        throw error;
      }
      rememberOrder(order);
      pendingAccountId.current = account.id;
      setUnconfirmedOrder(null);
      // Creation succeeded. A payment/redirect failure must not retry this mutation.
      try { await verifyOrderAccount(); await openPayment(order); }
      catch (error) { setPaymentError(errorText(error)); }
    }, "");
  }

  async function loadAvailability() {
      // Resolve every cart presentation, including products outside the active page and filters.
      const request = ++querySequence.current;
      setLoadingCatalog(true);
      try {
        const [next, cartCatalog] = await Promise.all([
          materialCatalog(query),
          cart.length ? materialCatalog({ presentationIds: cart.map(line => line.presentationId).join(","), pageSize: 100 }) : Promise.resolve(null),
        ]);
        if (request === querySequence.current) { setCatalog(next); setCatalogError(""); }
        const products = [...next.products, ...(cartCatalog?.products ?? [])];
        setDetail(current => current ? products.find(product => product.id === current.id) ?? current : null);
        const presentations = new Map((cartCatalog?.products ?? []).flatMap(product => product.presentations.filter(p => allowsMaterialDailyOperation(product, p))).map(p => [p.id, p]));
        setCart(current => current.map(line => {
          const p = presentations.get(line.presentationId);
          return { ...line, availableQuantity: p?.availableQuantity ?? 0, unitPrice: Number(p?.salePrice ?? line.unitPrice) };
        }));
      } finally {
        if (request === querySequence.current) setLoadingCatalog(false);
      }
  }

  function refreshAvailability() {
    setPaymentError("");
    return task.read(loadAvailability, "Availability refreshed.");
  }

  async function finishCancellation() {
    rememberOrder(null);
    pendingAccountId.current = null;
    cancelPendingRef.current = false;
    setCancelPending(false);
    setUnconfirmedOrder(null);
    setCart([]);
    setAddedMessage("Your order was canceled and its reserved materials were released.");
    // Cancellation is already confirmed even if this separate catalog read fails.
    try { await loadAvailability(); }
    catch { setPaymentError("Your order was canceled. Availability could not be refreshed; refresh it before placing another order."); }
  }

  function retryPayment() {
    if (!authReady || !knownOrderRef.current || cancelPendingRef.current) return;
    setPaymentError("");
    void task.read(async () => {
      await verifyOrderAccount();
      const order = await customerMaterialOrder(knownOrderRef.current!.id);
      rememberOrder(order);
      if (order.status === "CANCELED") { await finishCancellation(); return; }
      if (order.status !== "CONFIRMED" || order.paymentStatus === "PAID" || Number(order.balance) <= 0) throw new Error("This order no longer needs payment. View your order for its current status.");
      await openPayment(knownOrderRef.current!);
    });
  }

  function refreshOrder() {
    if (!authReady || !knownOrderRef.current) return;
    setPaymentError("");
    void task.read(async () => {
      await verifyOrderAccount();
      const order = await customerMaterialOrder(knownOrderRef.current!.id);
      rememberOrder(order);
      if (order.status === "CANCELED") await finishCancellation();
    });
  }

  function cancelOrder() {
    if (!authReady || !knownOrderRef.current) return;
    setPaymentError("");
    void task.read(async () => {
      await verifyOrderAccount();
      const id = knownOrderRef.current!.id;
      cancelPendingRef.current = true;
      setCancelPending(true);
      let order: KnownOrder;
      try { order = await cancelCustomerMaterialOrder(id); }
      catch (error) {
        // The cancellation may have committed before the response was lost.
        try { order = await customerMaterialOrder(id); }
        catch { throw error; }
        rememberOrder(order);
        if (order.status !== "CANCELED") throw error;
      }
      rememberOrder(order);
      if (order.status !== "CANCELED") throw new Error("The order could not be canceled. Check its current status before continuing.");
      await finishCancellation();
    }, "Your order was canceled and its reserved materials were released.");
  }

  function purchaseControls(product: Product, expanded = false) {
    const p = selected(product);
    if (!p) return <p className="text-sm text-muted-foreground">Currently unavailable</p>;
    const amount = amounts[product.id] ?? 1;
    const inCart = cart.find(line => line.presentationId === p.id)?.quantity ?? 0;
    const remaining = Math.max(0, Math.min(p.availableQuantity, MAX_QUANTITY) - inCart);
    const lineLimitReached = !inCart && cart.length >= MAX_CART_LINES;
    const canAdd = Number.isInteger(amount) && amount > 0 && amount <= remaining && !lineLimitReached;
    const suffix = expanded ? " in product details" : "";
    return <div className="space-y-3">
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-slate-600">Package</span>
        <select aria-label={`Package for ${product.name}${suffix}`} className={materialInputClass} value={p.id} disabled={locked} onChange={event => { setSelections(current => ({ ...current, [product.id]: Number(event.target.value) })); setAmounts(current => ({ ...current, [product.id]: 1 })); }}>
          {product.presentations.filter(presentation => allowsMaterialDailyOperation(product, presentation)).map(presentation => <option key={presentation.id} value={presentation.id}>{presentation.name}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap items-baseline gap-x-1.5"><span className="text-2xl font-semibold tracking-tight text-slate-950">{money(p.salePrice)}</span><span className="text-xs text-muted-foreground">/ {p.unit.name.toLowerCase()}</span></div>
      <div className="min-h-10 text-xs"><p className="text-muted-foreground">{quantity(p.multiplier)} {product.baseUnit.name.toLowerCase()}{p.multiplier === 1 ? "" : " per package"}</p><p className={`mt-1 ${p.availableQuantity > 0 ? "text-emerald-700" : "text-slate-500"}`}>{p.availableQuantity > 0 ? `${quantity(p.availableQuantity)} available` : "Out of stock"}{inCart > 0 && ` · ${quantity(inCart)} in ${isStaff ? "sale" : "cart"}`}</p></div>
      <div className="flex items-center gap-2">
        <Input className="w-20 shrink-0" aria-label={`Quantity to add for ${product.name}${suffix}`} type="number" min={1} max={remaining || 1} step={1} value={amount || ""} disabled={locked || remaining === 0} onChange={event => setAmounts(current => ({ ...current, [product.id]: Number(event.target.value) }))} />
        <Button type="button" className="min-w-0 flex-1 bg-red-600 text-white hover:bg-red-700" disabled={locked || loadingCatalog || !canAdd} onClick={() => add(product, p, amount)}><ShoppingCart className="mr-1 size-4 shrink-0" />{isStaff ? "Add to sale" : "Add to cart"}</Button>
      </div>
      {amount > remaining && remaining > 0 && <p className="text-xs text-red-700">You can add up to {quantity(remaining)} more.</p>}
      {lineLimitReached && <p className="text-xs text-muted-foreground">{isStaff ? "A sale" : "Your cart"} can contain up to 100 different packages.</p>}
    </div>;
  }

  const subtotal = cart.reduce((sum, line) => sum + Math.round(line.unitPrice * 100) * line.quantity, 0) / 100;
  const tax = Math.round(subtotal * Number(catalog.taxRate)) / 100;
  const invalid = !cart.length || cart.length > MAX_CART_LINES || cart.some(line => !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > Math.min(line.availableQuantity, MAX_QUANTITY));

  return <div className={`mx-auto max-w-7xl space-y-6 ${itemCount ? "pb-24" : "pb-8"}`}>
    <header className="flex flex-wrap items-start justify-between gap-5">
      <div className="space-y-2"><p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500"><MapPin className="size-3.5" />{isStaff ? "Customer sales" : "Warehouse pickup"}</p><h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Materials</h1><p className="max-w-2xl text-sm text-muted-foreground">{isStaff ? "Choose materials and package sizes to prepare a sale for a customer." : "Find supplies for your next project. Choose your package, pay online and collect at our warehouse."}</p></div>
      <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" className="h-11 rounded-full px-5" asChild><Link href={isStaff ? "/warehouse/materials/sales" : "/materials/orders"}>{isStaff ? "Material sales" : "My material orders"}</Link></Button>
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetTrigger asChild><Button variant="outline" className="h-11 gap-2 rounded-full px-5 shadow-sm" aria-label={`Open ${isStaff ? "sale" : "cart"}, ${itemCount} items`}><ShoppingCart className="size-5" />{isStaff ? "Sale" : "Cart"}<span className="inline-flex min-w-6 items-center justify-center rounded-full bg-slate-950 px-1.5 py-0.5 text-xs text-white">{itemCount}</span></Button></SheetTrigger>
        <SheetContent className="w-full gap-0 sm:max-w-lg">
          <SheetHeader className="border-b px-6 py-6 pr-12"><SheetTitle className="flex items-center gap-2 text-xl"><ShoppingCart className="size-5" />{isStaff ? "Customer sale" : "Your cart"}</SheetTitle><SheetDescription>{itemCount ? `${quantity(itemCount)} ${itemCount === 1 ? "item" : "items"} ${isStaff ? "selected for this sale" : "for warehouse pickup"}` : isStaff ? "Choose materials for your customer to get started." : "Choose your materials to get started."}</SheetDescription></SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <form aria-label={isStaff ? "Prepare materials sale" : "Place materials order"} className="space-y-5" onSubmit={event => {
              event.preventDefault(); if (invalid || locked || !authReady) return;
              const lines = cart.map(({ presentationId, quantity }) => ({ presentationId, quantity }));
              if (isStaff) {
                const customerInput = materialSaleCustomerInput(saleCustomer);
                if (!customerInput) { setSaleError("Select a registered customer or enter the customer's name."); return; }
                if (!activeStores.some(store => store.id === Number(storeId))) { setSaleError("Select an active store for fulfillment."); return; }
                saveSale({ ...customerInput, storeId: Number(storeId), lines });
              } else placeOrder({ lines });
            }}>
              <fieldset disabled={locked} className="min-w-0 space-y-5">
                {!cart.length && <div className="space-y-3 rounded-xl bg-slate-50 px-5 py-10 text-center"><ShoppingCart className="mx-auto size-8 text-slate-400" /><p className="font-medium">{isStaff ? "No materials selected" : "Your cart is empty"}</p><p className="text-sm text-muted-foreground">Add a tube, a box or the package {isStaff ? "your customer needs" : "you need"}.</p><Button type="button" variant="outline" onClick={() => setCartOpen(false)}>{isStaff ? "Browse materials" : "Continue shopping"}</Button></div>}
                <div className="divide-y">{cart.map(line => <div key={line.presentationId} className="flex gap-3 py-4 first:pt-0">
                  <MaterialProductImage imageUrl={line.imageUrl} name={line.productName} className="h-16 w-16 shrink-0 rounded-lg" sizes="64px" compact />
                  <div className="min-w-0 flex-1 space-y-2 text-sm"><p className="break-words font-medium text-slate-950">{line.productName}</p><p className="text-xs text-muted-foreground">{line.presentationName} · {money(line.unitPrice)} each</p><div className="flex items-center gap-2"><Input className="w-20" aria-label={`Quantity for ${line.productName} ${line.presentationName}`} required type="number" min={1} max={line.availableQuantity} step={1} value={line.quantity || ""} onChange={event => setCart(current => current.map(l => l.presentationId === line.presentationId ? { ...l, quantity: Number(event.target.value) } : l))} /><span className="ml-auto whitespace-nowrap font-medium">{money(line.unitPrice * line.quantity)}</span><Button variant="ghost" size="icon" type="button" aria-label={`Remove ${line.productName} ${line.presentationName}`} onClick={() => setCart(current => current.filter(l => l.presentationId !== line.presentationId))}><Trash2 className="size-4" /></Button></div>{line.quantity > line.availableQuantity && <p className="text-xs text-red-700">{line.availableQuantity ? `Only ${quantity(line.availableQuantity)} available. Update the quantity to continue.` : "This package is currently unavailable. Remove it to continue."}</p>}</div>
                </div>)}</div>
                <dl className="space-y-2 border-t pt-4 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div><div className="flex justify-between text-muted-foreground"><dt>Sales tax ({catalog.taxRate}%)</dt><dd>{money(tax)}</dd></div><div className="flex justify-between border-t pt-3 text-lg font-semibold"><dt>Total</dt><dd>{money(subtotal + tax)}</dd></div></dl>
                {isStaff ? authReady && <div className="space-y-4 border-t pt-4">
                  <MaterialSaleCustomerFields key={`${expectedViewer.id}:${expectedViewer.role}`} value={saleCustomer} disabled={locked} onChange={value => { if (!creatingSale.current && !pendingSale.current && !savedSaleRef.current) { setSaleCustomer(value); setSaleError(""); } }} />
                  <MaterialField label="Store for fulfillment"><select required className={materialInputClass} value={storeId} onChange={event => setStoreId(event.target.value)}><option value="">Select a store</option>{activeStores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></MaterialField>
                  {!activeStores.length && <p className="text-sm text-amber-800">Create or activate a store in Warehouse before preparing this sale.</p>}
                </div> : authReady && user && <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm"><p className="font-medium">Ordering as {customerName}</p>{user.email && <p className="break-words text-muted-foreground">{user.email}</p>}{user.phone && <p className="text-muted-foreground">{user.phone}</p>}</div>}
                {!authReady && <p role="alert" className="text-sm text-muted-foreground">{isLoading ? "Verifying your account…" : "Please reload this page to verify your account before continuing."}</p>}
                <p className="text-xs text-muted-foreground">{isStaff ? "The sale is saved as a draft. Review and confirm it to reserve stock, then collect payment before delivery." : "Your materials are reserved for 30 minutes while you complete payment."}</p>
                {!knownOrder && !savedSale && <div className="[&>button]:w-full"><MaterialSubmit busy={task.busy} disabled={invalid || locked || !authReady || (isStaff && (!materialSaleCustomerInput(saleCustomer) || !activeStores.some(store => store.id === Number(storeId))))}>{isStaff ? "Create sale for review" : "Reserve and continue to payment"}</MaterialSubmit></div>}
              </fieldset>
              <MaterialNotice error={task.error || (isStaff ? saleError : paymentError)} success={task.success} />
              {isStaff && unconfirmedSale && <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"><p>We could not confirm whether this sale was saved. Retry the same sale before starting another one.</p><Button type="button" disabled={task.busy || !authReady} onClick={() => { if (pendingSale.current) saveSale(pendingSale.current); }}>Retry same sale</Button></div>}
              {isStaff && authReady && savedSale && <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm"><p>Sale {savedSale.code} was saved for review.</p><Button type="button" disabled={task.busy} onClick={openSavedSale}>Open saved sale</Button></div>}
              {!isStaff && unconfirmedOrder && <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"><p>We could not confirm whether your order was saved. Retry the same order to retrieve its status without creating another reservation.</p><Button type="button" disabled={task.busy || !authReady} onClick={() => placeOrder(unconfirmedOrder)}>Retry same order</Button></div>}
              {!isStaff && authReady && knownOrder && <div className="space-y-3 rounded-lg border bg-slate-50 p-3 text-sm">
                <p className="font-medium">Order {knownOrder.code}</p>
                <p>{knownOrder.paymentStatus === "PAID" ? "Payment received. View your order for pickup details." : cancelPending ? "Cancellation has not been confirmed yet. Check the order status or retry cancellation before continuing." : "Your order is saved. Continue payment for this order, or cancel it before paying."}</p>
                <div className="flex flex-wrap gap-2">
                  {!cancelPending && knownOrder.status === "CONFIRMED" && knownOrder.paymentStatus !== "PAID" && Number(knownOrder.balance) > 0 && <Button type="button" disabled={task.busy || !authReady} onClick={retryPayment}>Retry payment</Button>}
                  {(knownOrder.canCancel ?? (knownOrder.status === "CONFIRMED" && knownOrder.paymentStatus === "UNPAID")) && <Button type="button" variant="outline" disabled={task.busy || !authReady} onClick={cancelOrder}>{cancelPending ? "Retry cancellation" : "Cancel order"}</Button>}
                  <Button type="button" variant="outline" disabled={task.busy || !authReady} onClick={refreshOrder}>Check order status</Button>
                  {orderPath(knownOrder) && <Button type="button" variant="outline" asChild><Link href={orderPath(knownOrder)!}>View order</Link></Button>}
                </div>
              </div>}
              {(task.error || paymentError || saleError) && !unconfirmedOrder && !knownOrder && !unconfirmedSale && !savedSale && <Button type="button" variant="outline" disabled={task.busy || !authReady} onClick={refreshAvailability}>Refresh availability</Button>}
            </form>
          </div>
        </SheetContent>
      </Sheet>
      </div>
    </header>

    <section aria-label="Find materials" className="space-y-4 rounded-2xl border bg-white p-4 sm:p-5">
      <div className="flex gap-2">
        <form aria-label="Search materials" className="flex min-w-0 flex-1 gap-2" onSubmit={event => { event.preventDefault(); void loadCatalog({ ...query, q: search.trim() || undefined, page: 1 }); }}>
          <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" /><Input className="pl-9" aria-label="Search the materials catalog" placeholder="Search products, brands or codes…" maxLength={200} value={search} disabled={locked} onChange={event => setSearch(event.target.value)} /></div>
          <Button type="submit" disabled={locked || loadingCatalog} className="bg-slate-950 hover:bg-slate-800">Search</Button>
        </form>
        <Button type="button" variant="outline" className="px-3 md:hidden" aria-expanded={filtersOpen} aria-controls="materials-filters" onClick={() => setFiltersOpen(value => !value)}><SlidersHorizontal className="size-4" /><span className="sr-only">Filters</span></Button>
      </div>
      <div id="materials-filters" className={`${filtersOpen ? "grid" : "hidden"} gap-3 sm:grid-cols-2 md:grid md:grid-cols-[1fr_1fr_1fr_auto] md:items-end`}>
        <label className="space-y-1.5 text-xs font-medium text-slate-600"><span>Category</span><select className={materialInputClass} aria-label="Filter by category" value={query.categoryId ?? ""} disabled={locked || loadingCatalog} onChange={event => void loadCatalog({ ...query, categoryId: event.target.value ? Number(event.target.value) : undefined, page: 1 })}><option value="">All categories</option>{catalog.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="space-y-1.5 text-xs font-medium text-slate-600"><span>Brand</span><select className={materialInputClass} aria-label="Filter by brand" value={query.brand ?? ""} disabled={locked || loadingCatalog} onChange={event => void loadCatalog({ ...query, brand: event.target.value || undefined, page: 1 })}><option value="">All brands</option>{catalog.brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}</select></label>
        <label className="space-y-1.5 text-xs font-medium text-slate-600"><span>Sort by</span><select className={materialInputClass} aria-label="Sort products" value={query.sort ?? "name-asc"} disabled={locked || loadingCatalog} onChange={event => void loadCatalog({ ...query, sort: event.target.value as MaterialCatalogQuery["sort"], page: 1 })}><option value="name-asc">Name: A–Z</option><option value="name-desc">Name: Z–A</option></select></label>
        <label className="flex h-10 cursor-pointer items-center gap-2 text-sm md:px-2"><input className="size-4 accent-red-600" type="checkbox" checked={Boolean(query.inStock)} disabled={locked || loadingCatalog} onChange={event => void loadCatalog({ ...query, inStock: event.target.checked || undefined, page: 1 })} />In stock only</label>
      </div>
    </section>

    <div ref={resultsTop} className="flex min-h-6 scroll-mt-32 flex-wrap items-center justify-between gap-3 text-sm"><p role="status" className="text-muted-foreground">{loadingCatalog ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Loading materials…</span> : resultSummary}</p>{hasFilters && <Button size="sm" variant="ghost" disabled={locked || loadingCatalog} onClick={() => { setSearch(""); void loadCatalog({ page: 1, pageSize: PAGE_SIZE, sort: query.sort }); }}>Clear filters</Button>}</div>
    {addedMessage && <p role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check className="size-4 shrink-0" />{addedMessage}<Button type="button" variant="ghost" size="sm" className="ml-auto shrink-0" onClick={() => { setDetail(null); setCartOpen(true); }}>{isStaff ? "View sale" : "View cart"}</Button></p>}
    {catalogError ? <div className="space-y-3"><MaterialNotice error={catalogError} /><Button variant="outline" disabled={locked || loadingCatalog} onClick={() => void loadCatalog(query)}>Try again</Button></div> : <section aria-label="Material products" aria-busy={loadingCatalog} className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${loadingCatalog ? "opacity-50" : ""}`}>
      {catalog.products.map(product => <article key={product.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-md">
        <button type="button" className="block w-full bg-slate-50 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-red-600" aria-label={`View ${product.name}`} onClick={() => setDetail(product)}><MaterialProductImage imageUrl={product.imageUrl} name={product.name} className="aspect-[4/3] w-full" sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, (max-width: 1279px) 30vw, 300px" /></button>
        <div className="flex flex-1 flex-col gap-4 p-4"><div className="space-y-2"><p className="min-h-4 truncate text-[11px] font-medium uppercase tracking-wide text-slate-500">{product.brand || product.category?.name || "Materials"}</p><h2 className="min-h-12 text-sm font-semibold leading-6 text-slate-950"><button type="button" className="line-clamp-2 text-left hover:text-red-700 hover:underline" onClick={() => setDetail(product)}>{product.name}</button></h2><p className="text-[11px] text-slate-400">{product.code}</p></div><div className="mt-auto">{purchaseControls(product)}</div></div>
      </article>)}
    </section>}
    {!catalogError && !catalog.products.length && <div className="rounded-2xl border bg-white px-6 py-14 text-center"><Search className="mx-auto mb-3 size-8 text-slate-400" /><h2 className="font-semibold">{catalog.total ? "No products on this page" : hasFilters ? "No matching materials" : "Materials are coming soon"}</h2>{catalog.total ? <Button className="mt-4" variant="outline" disabled={locked || loadingCatalog} onClick={() => void loadCatalog({ ...query, page: 1 })}>Back to first page</Button> : <p className="mt-2 text-sm text-muted-foreground">{hasFilters ? "Try a different search or clear your filters." : "Check back for products available for pickup."}</p>}</div>}
    {!catalogError && totalPages > 1 && <nav aria-label="Catalog pages" className="flex items-center justify-center gap-4 border-t pt-6"><Button variant="outline" disabled={locked || loadingCatalog || catalog.page <= 1} onClick={() => void loadCatalog({ ...query, page: catalog.page - 1 }).then(() => resultsTop.current?.scrollIntoView({ behavior: "smooth", block: "start" }))}><ArrowLeft className="size-4" />Previous</Button><span className="text-sm text-muted-foreground">Page {catalog.page} of {totalPages}</span><Button variant="outline" disabled={locked || loadingCatalog || catalog.page >= totalPages} onClick={() => void loadCatalog({ ...query, page: catalog.page + 1 }).then(() => resultsTop.current?.scrollIntoView({ behavior: "smooth", block: "start" }))}>Next<ArrowRight className="size-4" /></Button></nav>}

    {itemCount > 0 && !cartOpen && !detail && <div className="fixed bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)] pb-[env(safe-area-inset-bottom)] sm:bottom-6 sm:right-6"><Button type="button" className="h-12 gap-3 rounded-full bg-red-600 px-5 text-white shadow-lg ring-4 ring-white hover:bg-red-700" aria-label={`View ${isStaff ? "sale" : "cart"}, ${itemCount} items, ${money(subtotal)} subtotal`} onClick={() => setCartOpen(true)}><ShoppingCart className="size-4" /><span>{isStaff ? "View sale" : "View cart"} ({quantity(itemCount)})</span><span className="border-l border-white/30 pl-3">{money(subtotal)}</span></Button></div>}

    <Dialog open={Boolean(detail)} onOpenChange={open => { if (!open) setDetail(null); }}>
      {detail && <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl"><div className="grid gap-6 sm:grid-cols-2"><MaterialProductImage imageUrl={detail.imageUrl} name={detail.name} className="aspect-square w-full rounded-xl" sizes="(max-width: 639px) 90vw, 360px" /><div className="space-y-5"><DialogHeader><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{detail.brand || detail.category?.name || "Materials"}</p><DialogTitle className="pr-3 text-xl leading-7">{detail.name}</DialogTitle><DialogDescription>{detail.code}</DialogDescription></DialogHeader>{detail.description && <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{detail.description}</p>}{purchaseControls(detail, true)}{addedMessage && <div className="space-y-2"><p role="status" className="text-sm text-emerald-700">{addedMessage}</p><Button type="button" variant="outline" onClick={() => { setDetail(null); setCartOpen(true); }}>{isStaff ? "View sale" : "View cart"}</Button></div>}</div></div></DialogContent>}
    </Dialog>
  </div>;
}
