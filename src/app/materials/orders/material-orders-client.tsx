"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ClipboardList, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { customerMaterialOrders, type CustomerMaterialOrder, type MaterialPage } from "@/app/api/materials.api";
import { materialPublicSaleStatus } from "@/app/warehouse/materials/material-sale-status";
import { errorText, MaterialNotice, money } from "@/app/warehouse/materials/materials-shared";

function orderPath(order: CustomerMaterialOrder) {
  try {
    const pathname = new URL(order.publicUrl, "https://material-order.invalid").pathname;
    return /^\/public\/material-sales\/[^/]+\/?$/.test(pathname) ? pathname : null;
  } catch { return null; }
}

export function MaterialOrdersClient({ initial, accountId, accountRole }: {
  initial: MaterialPage<CustomerMaterialOrder>; accountId: number; accountRole: string;
}) {
  const { user, isAuthenticated, isLoading, error: authError, revalidate } = useAuth();
  const canView = isAuthenticated && !isLoading && !authError && user?.id === accountId && user.role?.name === accountRole;
  const [orders, setOrders] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const access = useRef(canView);
  const requestSequence = useRef(0);
  const lock = useRef(false);
  access.current = canView;

  useEffect(() => {
    // A response started in a previous session must never replace this account's history.
    requestSequence.current++;
    lock.current = false;
    setBusy(false);
    setError("");
    return () => { requestSequence.current++; };
  }, [canView, accountId, accountRole]);

  async function load(page: number) {
    if (!access.current || lock.current) return;
    lock.current = true;
    const request = ++requestSequence.current;
    setBusy(true); setError("");
    try {
      const account = await revalidate();
      if (!account || account.id !== accountId || account.role?.name !== accountRole || !access.current || request !== requestSequence.current) throw new Error("Please verify your account to view your material orders.");
      const latest = await customerMaterialOrders({ page, pageSize: 20 });
      // Cookies may have changed while the request was in flight.
      const verified = await revalidate();
      if (!verified || verified.id !== accountId || verified.role?.name !== accountRole || !access.current || request !== requestSequence.current) throw new Error("Please verify your account to view your material orders.");
      setOrders(latest);
    } catch (cause) {
      if (access.current && request === requestSequence.current) setError(errorText(cause));
    } finally {
      if (request === requestSequence.current) { lock.current = false; setBusy(false); }
    }
  }

  const totalPages = Math.max(1, Math.ceil(orders.total / orders.pageSize));
  return <div className="mx-auto max-w-5xl space-y-6 pb-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2"><h1 className="text-3xl font-bold tracking-tight">My material orders</h1><p className="text-sm text-muted-foreground">View your invoices, payment status and warehouse pickup details.</p></div>
      <Button variant="outline" asChild><Link href="/materials"><ArrowLeft className="mr-2 size-4" />Materials catalog</Link></Button>
    </header>
    {!canView ? <p role="status" className="rounded-xl border bg-white p-5 text-sm text-muted-foreground">{isLoading ? "Verifying your account…" : "Please verify your account to view your material orders."}</p> : <>
      <div className="flex items-center justify-between gap-3"><p role="status" className="text-sm text-muted-foreground">{orders.total.toLocaleString("en-US")} {orders.total === 1 ? "order" : "orders"}</p><Button variant="outline" disabled={busy} onClick={() => void load(orders.page)}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}Refresh</Button></div>
      <MaterialNotice error={error} />
      <div aria-busy={busy} className="space-y-3">{orders.items.map(order => {
        const status = materialPublicSaleStatus(order);
        const paid = order.paymentStatus === "PAID" && Number(order.balance) <= 0;
        const href = orderPath(order);
        return <article key={order.id} className="flex flex-wrap items-center justify-between gap-5 rounded-xl border bg-white p-5">
          <div className="min-w-0 flex-1 space-y-2"><div className="flex flex-wrap items-center gap-3"><h2 className="font-semibold">{order.code}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status === "Ready for pickup" ? "bg-emerald-50 text-emerald-800" : status === "Pending payment" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{status}</span></div><p className="text-sm text-muted-foreground"><time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</time></p><p className="break-words text-sm text-muted-foreground">{order.lines.slice(0, 2).map(line => `${line.quantity} × ${line.productName} (${line.presentationName})`).join(" · ")}{order.lines.length > 2 ? ` · +${order.lines.length - 2} more` : ""}</p></div>
          <div className="space-y-1 sm:text-right"><p className="font-semibold">{money(order.total)}</p><p className="text-xs text-muted-foreground">{paid ? "Paid in full" : order.status === "CANCELED" ? "Canceled order" : `Balance: ${money(order.balance)}`}</p></div>
          {href ? <Button variant="outline" asChild><Link href={href}>View order / invoice<ArrowRight className="ml-2 size-4" /></Link></Button> : <p className="text-xs text-muted-foreground">Contact us for order details.</p>}
        </article>;
      })}</div>
      {!orders.items.length && <div className="space-y-3 rounded-xl border bg-white px-5 py-12 text-center"><ClipboardList className="mx-auto size-8 text-slate-400" /><h2 className="font-semibold">{orders.total ? "No orders on this page" : "No material orders yet"}</h2>{orders.total ? <Button variant="outline" disabled={busy} onClick={() => void load(1)}>Back to first page</Button> : <><p className="text-sm text-muted-foreground">Your material purchases will appear here.</p><Button asChild><Link href="/materials">Browse materials</Link></Button></>}</div>}
      {orders.total > 0 && <nav aria-label="Material order pages" className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" disabled={busy || orders.page <= 1} onClick={() => void load(orders.page - 1)}><ArrowLeft className="mr-2 size-4" />Previous</Button><p className="text-sm text-muted-foreground">Page {orders.page} of {totalPages}</p><Button variant="outline" disabled={busy || orders.page >= totalPages} onClick={() => void load(orders.page + 1)}>Next<ArrowRight className="ml-2 size-4" /></Button></nav>}
    </>}
  </div>;
}
