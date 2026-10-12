"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cancelCustomerMaterialOrder, customerMaterialOrder, publicMaterialCheckout, publicMaterialSale, type MaterialSale } from "@/app/api/materials.api";
import { MaterialSaleReceipts, MaterialSaleSummary } from "@/app/warehouse/materials/material-sale-summary";
import { MaterialNotice, materialPanelClass, money, useMaterialAction } from "@/app/warehouse/materials/materials-shared";

type CancellationPermission = { userId: number; saleId: number; canCancel: boolean };

export function PublicMaterialSaleClient({ initial, token, paymentReturn }: {
  initial: MaterialSale;
  token: string;
  paymentReturn?: "canceled" | "returned";
}) {
  const [sale, setSale] = useState(initial);
  const [permission, setPermission] = useState<CancellationPermission | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const task = useMaterialAction();
  const { user, isAuthenticated, isLoading, error: authError, revalidate } = useAuth();
  const updateRevision = useRef(0);
  const mutating = useRef(false);
  const awaitingPayment = sale.status === "CONFIRMED" && Number(sale.balance) > 0;
  const fullyPaid = sale.status === "CONFIRMED" && sale.paymentStatus === "PAID" && Number(sale.balance) <= 0;
  const pending = sale.payments.some(payment => payment.status === "PENDING");
  const cancellableOnlineOrder = awaitingPayment && Boolean(sale.expiresAt) && Number(sale.paidAmount) === 0 &&
    !sale.payments.some(payment => payment.status === "PAID" || payment.paidAt);
  const accountId = isAuthenticated && !isLoading && !authError ? user?.id : undefined;
  const canCancel = cancellableOnlineOrder && permission?.canCancel === true &&
    permission.userId === accountId && permission.saleId === sale.id;

  useEffect(() => {
    let alive = true;
    setPermission(null);
    if (!accountId || !cancellableOnlineOrder) { setConfirmCancel(false); return; }
    const revision = updateRevision.current;
    void customerMaterialOrder(sale.id).then(order => {
      if (alive && revision === updateRevision.current) {
        setPermission({ userId: accountId, saleId: sale.id, canCancel: order.canCancel });
        if (!order.canCancel) setConfirmCancel(false);
      }
    }).catch(() => {
      // Public payment links remain usable without ownership or a verified session.
      if (alive) { setPermission(null); setConfirmCancel(false); }
    });
    return () => { alive = false; };
  }, [accountId, cancellableOnlineOrder, sale]);

  useEffect(() => {
    if (!pending && !(paymentReturn === "returned" && awaitingPayment)) return;
    let alive = true, attempts = 0, inFlight = false;
    const timer = window.setInterval(async () => {
      if (mutating.current || inFlight) return;
      if (++attempts > 18) { window.clearInterval(timer); return; }
      const revision = updateRevision.current;
      inFlight = true;
      try {
        const next = await publicMaterialSale(token);
        if (alive && revision === updateRevision.current) setSale(next);
      } catch { /* Manual refresh remains available after a connection failure. */ }
      finally { inFlight = false; }
    }, 10000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [pending, token, paymentReturn, awaitingPayment]);

  const refresh = () => task.read(async () => {
    const revision = ++updateRevision.current;
    const next = await publicMaterialSale(token);
    if (revision === updateRevision.current) setSale(next);
  }, "Status updated.");

  const cancel = () => task.read(async () => {
    if (!canCancel || !confirmCancel || !accountId) throw new Error("This order cannot be canceled here. Refresh its status and try again.");
    mutating.current = true;
    ++updateRevision.current;
    try {
      const account = await revalidate();
      if (!account || account.id !== accountId) {
        setPermission(null);
        setConfirmCancel(false);
        throw new Error("Please sign in with the account that placed this order, then refresh its status.");
      }
      const next = await cancelCustomerMaterialOrder(sale.id);
      ++updateRevision.current;
      setSale(next);
      setPermission({ userId: accountId, saleId: sale.id, canCancel: next.canCancel });
      setConfirmCancel(false);
    } finally { mutating.current = false; }
  }, "Order canceled. Your materials are no longer reserved.");

  const checkout = () => task.run("checkout", async () => {
    mutating.current = true;
    ++updateRevision.current;
    try {
      const session = await publicMaterialCheckout(token);
      window.location.assign(session.url);
    } finally { mutating.current = false; }
  }, "");

  return <main className="min-h-dvh bg-slate-50 px-4 py-10"><div className="mx-auto max-w-3xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Your material order</h1><div className="flex flex-wrap gap-2">{accountId && <Button asChild variant="outline"><Link href="/materials/orders">My material orders</Link></Button>}<Button asChild variant="outline"><Link href="/materials">Materials catalog</Link></Button></div></div>
    <MaterialSaleSummary sale={sale} publicView loadSale={() => publicMaterialSale(token)} />
    <MaterialNotice error={task.error} success={task.success} />
    <section className={materialPanelClass}>
      {awaitingPayment ? <>
        <h2 className="font-semibold">Complete your payment</h2>
        {paymentReturn === "canceled" && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">You returned from payment. Your order is still awaiting payment.{canCancel ? " You can resume payment or cancel this order below." : " You can resume payment below."}</p>}
        {paymentReturn === "returned" && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">We are checking your payment status. Payment is confirmed only when this page shows it as received.</p>}
        <p className="text-sm text-muted-foreground">Your materials are reserved. Complete payment before collecting your order.</p>
        {sale.expiresAt && <p className="text-sm text-muted-foreground">Unpaid online reservations expire at {new Date(sale.expiresAt).toLocaleString()}.</p>}
        <Button disabled={task.busy || confirmCancel} onClick={checkout}>Pay {money(sale.balance)} securely with Stripe</Button>
        {pending && <p className="text-sm text-muted-foreground">If you just paid, confirmation can take a moment. This page will update automatically; you can also refresh the status below.</p>}
      </> : sale.status === "CANCELED" ? <p className="text-sm">This order has been canceled. You can start a new order from the catalog.</p>
        : sale.status === "DELIVERED" ? <><h2 className="font-semibold">Order delivered</h2><p className="text-sm text-muted-foreground">Your materials have been handed over.</p></>
          : fullyPaid ? <><h2 className="font-semibold text-emerald-800">Payment received</h2><p className="text-sm text-muted-foreground">Your materials are ready for pickup. Show order number <strong className="text-foreground">{sale.code}</strong> on your phone or bring your printed invoice. Warehouse staff will verify the current payment and delivery status before handing over your materials.</p></>
            : <><h2 className="font-semibold">Order awaiting confirmation</h2><p className="text-sm text-muted-foreground">This order is not ready for pickup. Contact us if you need help with its status.</p></>}
      {canCancel && <div className="border-t pt-4">
        {confirmCancel ? <div role="group" aria-label="Confirm order cancellation" className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm">Cancel this unpaid order? Your materials will no longer be reserved.</p>
          <div className="flex flex-wrap gap-2"><Button variant="destructive" disabled={task.busy} onClick={cancel}>{task.busy ? "Canceling order…" : "Yes, cancel order"}</Button><Button variant="outline" disabled={task.busy} onClick={() => setConfirmCancel(false)}>Keep order</Button></div>
        </div> : <Button variant="outline" disabled={task.busy} onClick={() => { task.clear(); setConfirmCancel(true); }}>Cancel order</Button>}
      </div>}
      <div><Button variant="outline" disabled={task.busy} onClick={refresh}>Refresh status</Button></div>
    </section>
    <MaterialSaleReceipts sale={sale} publicView />
  </div></main>;
}
