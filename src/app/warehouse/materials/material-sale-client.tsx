"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isApiError } from "@/app/api/_base";
import { cancelMaterialCheckout, materialCheckout, materialSale, materialSaleAction, recordMaterialPayment, syncMaterialPayments, type MaterialSale } from "@/app/api/materials.api";
import { MaterialField, MaterialNotice, MaterialSubmit, materialInputClass, materialPanelClass, money, useMaterialAction } from "./materials-shared";
import { MaterialSaleReceipts, MaterialSaleSummary } from "./material-sale-summary";

type PaymentBody = Omit<Parameters<typeof recordMaterialPayment>[1], "requestKey">;

export function MaterialSaleClient({ initial, admin }: { initial: MaterialSale; admin: boolean }) {
  const [sale, setSale] = useState(initial), [manual, setManual] = useState(false), [confirmDelivery, setConfirmDelivery] = useState(false), [confirmCancel, setConfirmCancel] = useState(false);
  const [payment, setPayment] = useState({ amount: "", paymentMethod: "", reference: "", note: "", paidAt: "", fundsVerified: false });
  const [unconfirmedPayment, setUnconfirmedPayment] = useState<PaymentBody | null>(null);
  const task = useMaterialAction();
  const pending = sale.payments.some(p => p.status === "PENDING");
  const canPay = sale.status === "CONFIRMED" && Number(sale.balance) > 0;
  async function refresh() { setSale(await materialSale(sale.id)); }
  function savePayment(body: PaymentBody) {
    void task.run({ saleId: sale.id, ...body }, async requestKey => {
      try {
        await recordMaterialPayment(sale.id, { requestKey, ...body }); await refresh();
        setUnconfirmedPayment(null); setManual(false);
        setPayment({ amount: "", paymentMethod: "", reference: "", note: "", paidAt: "", fundsVerified: false });
      } catch (error) {
        const uncertain = !isApiError(error) || error.status >= 500 || error.status === 408;
        setUnconfirmedPayment(current => current ?? (uncertain ? body : null));
        throw error;
      }
    }, "Payment recorded.");
  }
  async function action(kind: "confirm" | "cancel" | "deliver") { await task.run({ id: sale.id, kind }, async key => { setSale(await materialSaleAction(sale.id, kind, key)); setConfirmDelivery(false); setConfirmCancel(false); }, kind === "deliver" ? "Delivery recorded and stock updated." : kind === "confirm" ? "Sale confirmed. Stock is now reserved." : "Sale canceled and reservations released."); }
  return <div className="space-y-5"><div className="flex flex-wrap justify-between gap-3"><Button asChild variant="outline"><Link href="/warehouse/materials/sales">All material sales</Link></Button><Button variant="outline" disabled={task.busy} onClick={() => task.read(refresh)}>Refresh payment status</Button></div><MaterialSaleSummary sale={sale} /><MaterialNotice error={task.error} success={task.success} />
    <section className={materialPanelClass}><h3 className="font-semibold">Sale actions</h3>
      {sale.status === "DRAFT" && <><p className="text-sm text-muted-foreground">Review the products and prices above. Confirming reserves their quantities without changing physical stock.</p><Button disabled={task.busy} onClick={() => action("confirm")}>Confirm sale and reserve stock</Button></>}
      {sale.status === "CONFIRMED" && <><p className="text-sm text-muted-foreground">Stock remains reserved until delivery. Full payment is required before handing over the materials.</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={task.busy} onClick={() => task.read(async () => navigator.clipboard.writeText(sale.publicUrl), "Payment link copied.")}>Copy customer payment link</Button><Button asChild variant="outline"><Link href={sale.publicUrl} target="_blank">View customer page</Link></Button>{canPay && <><Button disabled={task.busy} onClick={() => task.run("checkout", async () => { const checkout = await materialCheckout(sale.id); window.location.assign(checkout.url); }, "")}>Pay {money(sale.balance)} with Stripe</Button>{admin && <Button variant="outline" disabled={task.busy || pending || Boolean(unconfirmedPayment)} onClick={() => { setManual(!manual); setPayment(current => ({ ...current, amount: sale.balance })); }}>Record received payment</Button>}</>}</div>
        {pending && <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"><p>A Stripe checkout is pending. Refresh its status, or cancel that checkout before recording a different payment.</p>{admin && <Button variant="outline" size="sm" disabled={task.busy} onClick={() => task.run("cancel-checkout", async () => { await cancelMaterialCheckout(sale.id); await refresh(); }, "Checkout status updated.")}>Cancel pending checkout</Button>} {admin && <Button variant="outline" size="sm" disabled={task.busy} onClick={() => task.run("sync-payments", async () => setSale(await syncMaterialPayments(sale.id)), "Stripe payments synchronized.")}>Sync Stripe payments</Button>}</div>}
        {Number(sale.balance) <= 0 && !confirmDelivery && <Button disabled={task.busy} onClick={() => setConfirmDelivery(true)}>Record delivery</Button>}
        {confirmDelivery && <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"><p>Confirm that all listed materials are being handed over. Stock will be deducted now; closed packages will be opened automatically when loose units are needed.</p><div className="flex gap-2"><Button disabled={task.busy} onClick={() => action("deliver")}>Confirm physical delivery</Button><Button variant="outline" disabled={task.busy} onClick={() => setConfirmDelivery(false)}>Back</Button></div></div>}
      </>}
      {sale.status === "DELIVERED" && <p className="text-sm text-emerald-800">Delivered on {new Date(sale.deliveredAt ?? sale.createdAt).toLocaleString()}. Physical stock has been deducted.</p>}
      {sale.status === "CANCELED" && <p className="text-sm text-muted-foreground">This sale is canceled. Its stock is no longer reserved.</p>}
      {["DRAFT", "CONFIRMED"].includes(sale.status) && Number(sale.paidAmount) === 0 && <div className="border-t pt-4">{!confirmCancel ? <Button variant="outline" size="sm" disabled={task.busy} onClick={() => setConfirmCancel(true)}>Cancel unpaid sale</Button> : <div className="flex flex-wrap items-center gap-3"><p className="text-sm">Cancel this sale and release its reserved stock?</p><Button variant="destructive" size="sm" disabled={task.busy} onClick={() => action("cancel")}>Confirm cancellation</Button><Button variant="outline" size="sm" disabled={task.busy} onClick={() => setConfirmCancel(false)}>Keep sale</Button></div>}</div>}
    </section>
    {admin && manual && canPay && !pending && !unconfirmedPayment && <form className={materialPanelClass} onSubmit={event => { event.preventDefault(); if (!payment.fundsVerified) return; savePayment({ amount: Number(payment.amount), paymentMethod: payment.paymentMethod, reference: payment.reference.trim() || undefined, note: payment.note.trim() || undefined, paidAt: payment.paidAt ? new Date(payment.paidAt).toISOString() : undefined, fundsVerified: true }); }}><h3 className="font-semibold">Record a payment already received</h3><div className="grid gap-4 sm:grid-cols-2"><MaterialField label="Amount received"><Input required type="number" min="0.01" max={sale.balance} step="0.01" value={payment.amount} onChange={event => setPayment(p => ({ ...p, amount: event.target.value }))} /></MaterialField><MaterialField label="Method"><select required className={materialInputClass} value={payment.paymentMethod} onChange={event => setPayment(p => ({ ...p, paymentMethod: event.target.value }))}><option value="">Select a method</option>{["CASH", "ZELLE", "CHECK", "BANK", "WIRE", "ACH", "OTHER"].map(method => <option key={method} value={method}>{method}</option>)}</select></MaterialField><MaterialField label="Received on (optional)"><Input type="datetime-local" value={payment.paidAt} onChange={event => setPayment(p => ({ ...p, paidAt: event.target.value }))} /></MaterialField><MaterialField label="Reference (optional)"><Input maxLength={200} value={payment.reference} onChange={event => setPayment(p => ({ ...p, reference: event.target.value }))} /></MaterialField></div><MaterialField label="Note (optional)"><textarea className={materialInputClass + " h-20"} maxLength={1000} value={payment.note} onChange={event => setPayment(p => ({ ...p, note: event.target.value }))} /></MaterialField><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={payment.fundsVerified} onChange={event => setPayment(p => ({ ...p, fundsVerified: event.target.checked }))} />I verified that these funds were received.</label><MaterialSubmit busy={task.busy} disabled={!payment.fundsVerified}>Save received payment</MaterialSubmit></form>}
    {admin && unconfirmedPayment && <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"><p>The response for this payment was interrupted. Retry the same payment to confirm its saved status without recording it twice.</p><Button disabled={task.busy} onClick={() => savePayment(unconfirmedPayment)}>Retry same payment</Button></div>}<MaterialSaleReceipts sale={sale} />
  </div>;
}
