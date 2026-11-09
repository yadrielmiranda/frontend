"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getFactoryPaymentDetail, saveFactoryPaymentManufacturer, syncFactoryPaymentTotal, voidFactoryPayment } from "@/app/api/factory-payments.api";
import { factoryDate, factoryMoney, factoryPaymentKindLabels, factoryPaymentStatusLabels, type FactoryManufacturer, type FactoryPayment, type FactoryPaymentDetail } from "@/lib/factory-payments";
import { PaymentDialog } from "./payment-dialog";

function PaymentCard({ payment, busy, onVoid }: {
  payment: FactoryPayment;
  busy: boolean;
  onVoid: () => void;
}) {
  return <article className={`rounded-xl border p-4 ${payment.voidedAt ? "bg-slate-50" : "bg-white"}`}>
    <div className="flex flex-wrap justify-between gap-3">
      <div><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">{payment.invoiceNumber}</h4>{payment.voidedAt && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Voided</span>}</div>
        <p className="mt-1 text-sm text-muted-foreground">{factoryDate(payment.paidOn)} · {factoryPaymentKindLabels[payment.kind]}</p>
      </div>
      <p className={`text-lg font-semibold tabular-nums ${payment.voidedAt ? "text-slate-500 line-through" : "text-slate-950"}`}>{factoryMoney(payment.amount)}</p>
    </div>
    {payment.reference && <p className="mt-3 break-words text-sm"><span className="font-medium">Reference:</span> {payment.reference}</p>}
    {payment.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{payment.note}</p>}
    {payment.voidedAt && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-red-800">Voided {factoryDate(payment.voidedAt)}{payment.voidedByName ? ` by ${payment.voidedByName}` : ""}: {payment.voidReason}</p>}
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">Recorded {factoryDate(payment.createdAt)}{payment.createdByName ? ` by ${payment.createdByName}` : ""}</p>
      {!payment.voidedAt && <div className="flex gap-2">
        <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={onVoid}>Void</Button>
      </div>}
    </div>
  </article>;
}

export function PaymentDetailDialog({ orderId, manufacturers, onClose, onChanged }: {
  orderId: number;
  manufacturers: FactoryManufacturer[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<FactoryPaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [manufacturerId, setManufacturerId] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voiding, setVoiding] = useState<FactoryPayment | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [reload, setReload] = useState(0);
  const inFlight = useRef(false);
  const defaults = useRef(manufacturers);

  useEffect(() => {
    let current = true;
    getFactoryPaymentDetail(orderId).then(result => {
      if (!current) return;
      setDetail(result);
      setManufacturerId(String(result.order.manufacturer?.id ?? defaults.current.find(row => row.active && row.isDefault)?.id ?? ""));
      setError("");
    }).catch(cause => { if (current) setError(cause instanceof Error ? cause.message : "Could not load payment history."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [orderId, reload]);

  const apply = (result: FactoryPaymentDetail) => {
    setDetail(result);
    setManufacturerId(String(result.order.manufacturer?.id ?? defaults.current.find(row => row.active && row.isDefault)?.id ?? ""));
    setError(""); onChanged();
  };
  const mutate = async (work: () => Promise<FactoryPaymentDetail>, message: string) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(""); setProgress(message);
    try { apply(await work()); setVoiding(null); toast.success(message.replace(/…$/, ".")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the change."); }
    finally { inFlight.current = false; setBusy(false); setProgress(""); }
  };
  const order = detail?.order;
  const activeManufacturers = manufacturers.filter(row => row.active || row.id === order?.manufacturer?.id);
  const assignedManufacturerActive = !order?.manufacturer || manufacturers.some(row => row.id === order.manufacturer?.id && row.active);
  const canRecord = Boolean(order?.imported && !order.sourceCostChanged && assignedManufacturerActive && manufacturers.some(row => row.active));

  return <>
    <Dialog open onOpenChange={open => { if (!open && !busy && !paymentOpen && !voiding) onClose(); }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-5xl" showCloseButton={!busy && !paymentOpen && !voiding}>
        <DialogHeader><DialogTitle>{order ? `Factory payments · Order ${order.orderNumber}` : "Factory payments"}</DialogTitle><DialogDescription>{order ? `PO ${order.poNumber || "not imported"}${order.projectName ? ` · ${order.projectName}` : ""}` : "Payment history and balance for this order."}</DialogDescription></DialogHeader>
        {loading && <p role="status" className="py-10 text-center text-sm text-muted-foreground">Loading payment history…</p>}
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>{error}</p><Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={() => { setLoading(true); setReload(value => value + 1); }}>Refresh history</Button></div>}
        {order && detail && <>
          <div className="grid gap-3 sm:grid-cols-3">{[["Factory total", order.factoryTotal], ["Paid", order.paid], [order.status === "CREDIT" ? "Credit balance" : "Remaining", order.remaining == null ? null : order.remaining.replace(/^-/, "")]].map(([label, value]) => <div key={label} className="rounded-xl border bg-slate-50 p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{factoryMoney(value)}</p></div>)}</div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="space-y-1"><span className="block text-sm font-medium">Manufacturer</span><select aria-label="Manufacturer for this PO" className="h-10 max-w-full rounded-md border bg-white px-3 text-sm disabled:bg-slate-100" disabled={busy || loading || !order.imported} value={manufacturerId} onChange={event => setManufacturerId(event.target.value)}><option value="">Select manufacturer…</option>{activeManufacturers.map(row => <option key={row.id} value={row.id}>{row.name}{!row.active ? " (inactive)" : ""}</option>)}</select></label>
              <Button variant="outline" disabled={busy || loading || !order.imported || !manufacturerId || Number(manufacturerId) === order.manufacturer?.id} onClick={() => void mutate(() => saveFactoryPaymentManufacturer(orderId, Number(manufacturerId), order.version), "Manufacturer saved…")}>Save manufacturer</Button>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">{factoryPaymentStatusLabels[order.status]}</span>
          </div>
          {!order.imported && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Import this order’s PO from JSON before recording a factory payment.</p>}
          {!assignedManufacturerActive && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">This manufacturer is inactive. Assign an active manufacturer before recording another payment.</p>}
          {order.sourceCostChanged && <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p>{order.factoryTotal === order.importedTotal
              ? `The imported PO cost was updated. The rounded total remains ${factoryMoney(order.importedTotal)}. Confirm it before recording another payment.`
              : `The imported factory total changed from ${factoryMoney(order.factoryTotal)} to ${factoryMoney(order.importedTotal)}. Review the new total before recording another payment.`}</p>
            <Button size="sm" variant="outline" disabled={busy || loading || !order.imported || order.version == null} onClick={() => void mutate(() => syncFactoryPaymentTotal(orderId, order.version!), "Tracking total updated…")}>Use {factoryMoney(order.importedTotal)} for tracking</Button>
          </div>}
          <section className="space-y-3 border-t pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">Payment history <span className="font-normal text-muted-foreground">({detail.payments.length})</span></h3><div className="flex gap-2"><Button variant="ghost" size="icon" aria-label="Refresh payment history" disabled={busy || loading} onClick={() => { setLoading(true); setReload(value => value + 1); }}><RefreshCw aria-hidden="true" /></Button><Button disabled={busy || loading || !canRecord} onClick={() => setPaymentOpen(true)}><Plus aria-hidden="true" />Record payment</Button></div></div>
            {!manufacturers.some(row => row.active) && <p className="text-sm text-amber-800">Add an active manufacturer to record payments.</p>}
            {!detail.payments.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No payments recorded for this order.</p>}
            {detail.payments.map(payment => <PaymentCard key={payment.id} payment={payment} busy={busy || loading} onVoid={() => { setVoiding(payment); setVoidReason(""); }} />)}
          </section>
          {detail.events.length > 0 && <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-medium">Activity history ({detail.events.length})</summary><ol className="mt-3 space-y-3">{detail.events.map(event => <li key={event.id} className="border-t pt-3 text-sm"><p className="whitespace-pre-wrap break-words">{event.detail || event.action.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString("en-US")}{event.actorName ? ` · ${event.actorName}` : ""}</p></li>)}</ol></details>}
        </>}
        {progress && <p role="status" className="text-sm text-muted-foreground">{progress}</p>}
      </DialogContent>
    </Dialog>
    {paymentOpen && order && <PaymentDialog order={order} manufacturers={manufacturers} onClose={() => {
      setPaymentOpen(false);
      // Reconcile history even if a successful save response was lost in transit.
      setLoading(true);
      setReload(value => value + 1);
    }} onSaved={apply} />}
    <Dialog open={voiding !== null} onOpenChange={open => { if (!open && !busy) setVoiding(null); }}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!busy}>
        <DialogHeader><DialogTitle>Void payment?</DialogTitle><DialogDescription>Remove {factoryMoney(voiding?.amount)} from the paid balance for invoice {voiding?.invoiceNumber}. Its record stays in the history. To correct it, record a new payment after voiding.</DialogDescription></DialogHeader>
        <form onSubmit={event => { event.preventDefault(); if (voiding && voidReason.trim()) void mutate(() => voidFactoryPayment(voiding.id, voidReason.trim()), "Payment voided…"); }}>
          <fieldset disabled={busy} className="space-y-4"><label className="block space-y-1"><span className="text-sm font-medium">Reason</span><textarea required maxLength={500} rows={3} autoFocus className="w-full rounded-md border bg-white p-3 text-sm" value={voidReason} onChange={event => setVoidReason(event.target.value)} /></label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter><Button type="button" variant="outline" onClick={() => setVoiding(null)}>Cancel</Button><Button type="submit" variant="destructive" disabled={!voidReason.trim()}>{busy ? "Voiding…" : "Void payment"}</Button></DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
