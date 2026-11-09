"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { registerFactoryPayment } from "@/app/api/factory-payments.api";
import { factoryMoney, factoryPaymentKindLabels, newFactoryPaymentRequestId, todayForFactoryPayment, type FactoryManufacturer, type FactoryPaymentDetail, type FactoryPaymentKind, type FactoryPaymentOrder } from "@/lib/factory-payments";

export function PaymentDialog({ order, manufacturers, onClose, onSaved }: {
  order: FactoryPaymentOrder;
  manufacturers: FactoryManufacturer[];
  onClose: () => void;
  onSaved: (detail: FactoryPaymentDetail) => void;
}) {
  const [manufacturerId, setManufacturerId] = useState(String(order.manufacturer?.id ?? manufacturers.find(row => row.active && row.isDefault)?.id ?? ""));
  const [paidOn, setPaidOn] = useState(todayForFactoryPayment);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [kind, setKind] = useState<FactoryPaymentKind>("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  const inFlight = useRef(false);
  const options = manufacturers.filter(row => row.active || row.id === order.manufacturer?.id);

  const save = async () => {
    if (inFlight.current) return;
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setError("Enter a positive amount with no more than two decimal places."); return;
    }
    inFlight.current = true;
    setBusy(true); setError(""); setProgress("Saving payment…");
    try {
      requestId.current ??= newFactoryPaymentRequestId();
      const saved = await registerFactoryPayment(order.orderId, {
        manufacturerId: Number(manufacturerId), ...(order.version == null ? {} : { version: order.version }),
        amount, paidOn, invoiceNumber: invoiceNumber.trim(), kind,
        reference: reference.trim() || undefined, note: note.trim() || undefined, requestId: requestId.current,
      });
      onSaved(saved);
      onClose();
      toast.success("Payment recorded.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the payment.");
    } finally { inFlight.current = false; setBusy(false); setProgress(""); }
  };

  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" showCloseButton={!busy}>
      <DialogHeader><DialogTitle>Record factory payment</DialogTitle><DialogDescription>PO {order.poNumber} · Order {order.orderNumber} · Remaining {factoryMoney(order.remaining)}</DialogDescription></DialogHeader>
      <form onSubmit={event => { event.preventDefault(); void save(); }}>
        <fieldset disabled={busy} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2"><span className="text-sm font-medium">Manufacturer</span>
              <select required disabled={order.manufacturer !== null} className="h-10 w-full rounded-md border bg-white px-3 text-sm disabled:bg-slate-100" value={manufacturerId} onChange={event => setManufacturerId(event.target.value)}>
                <option value="">Select manufacturer…</option>{options.map(row => <option key={row.id} value={row.id}>{row.name}{!row.active ? " (inactive)" : ""}</option>)}
              </select>
            </label>
            <label className="block space-y-1"><span className="text-sm font-medium">Payment date</span><Input required type="date" value={paidOn} onChange={event => setPaidOn(event.target.value)} /></label>
            <label className="block space-y-1"><span className="text-sm font-medium">Amount (USD)</span><Input required inputMode="decimal" placeholder="0.00" value={amount} onChange={event => setAmount(event.target.value)} /></label>
            <label className="block space-y-1"><span className="text-sm font-medium">Invoice number</span><Input required maxLength={100} placeholder={`${order.poNumber}-D`} value={invoiceNumber} onChange={event => setInvoiceNumber(event.target.value)} /></label>
            <label className="block space-y-1"><span className="text-sm font-medium">Payment type</span>
              <select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={kind} onChange={event => setKind(event.target.value as FactoryPaymentKind)}>{Object.entries(factoryPaymentKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </label>
            <label className="block space-y-1 sm:col-span-2"><span className="text-sm font-medium">Authorization / reference <span className="font-normal text-muted-foreground">(optional)</span></span><Input maxLength={150} value={reference} onChange={event => setReference(event.target.value)} /></label>
            <label className="block space-y-1 sm:col-span-2"><span className="text-sm font-medium">Note <span className="font-normal text-muted-foreground">(optional)</span></span><textarea maxLength={4000} rows={3} className="w-full rounded-md border bg-white p-3 text-sm" value={note} onChange={event => setNote(event.target.value)} /></label>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {progress && <p role="status" className="text-sm text-muted-foreground">{progress}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!manufacturers.some(row => row.id === Number(manufacturerId) && row.active) || !order.imported || order.sourceCostChanged}>{busy ? "Saving…" : "Record payment"}</Button></DialogFooter>
        </fieldset>
      </form>
    </DialogContent>
  </Dialog>;
}
