"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatMoney, formatDateEn } from "@/lib/formatters";
import { getPaymentHistory, reviewPaymentRefund, synchronizeStripePayments, type PaymentHistoryData } from "@/app/api/payments.api";

type Refund = PaymentHistoryData["refunds"][number];
const active = (status: string) => ["pending", "requires_action", "succeeded"].includes(status);
const statusLabel = (status: string) => ({ succeeded: "Refunded", pending: "Refund pending", requires_action: "Refund requires action", failed: "Refund failed", canceled: "Refund canceled" }[status] ?? status);

export function PaymentHistory({ estimateId, reviewPending = false }: { estimateId: number; reviewPending?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PaymentHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<Refund | null>(null);
  const [decision, setDecision] = useState("");
  const [credits, setCredits] = useState<Record<number, string>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let canceled = false;
    setLoading(true); setError("");
    getPaymentHistory(estimateId).then(result => { if (!canceled) setData(result); })
      .catch(err => { if (!canceled) setError(err instanceof Error ? err.message : "Could not load payment history."); })
      .finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; };
  }, [open, estimateId, reviewPending]);

  async function sync() {
    setSyncing(true);
    try { setData(await synchronizeStripePayments(estimateId)); router.refresh(); toast.success("Stripe payments updated."); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not update Stripe payments."); }
    finally { setSyncing(false); }
  }
  function selectRefund(refund: Refund) {
    setSelected(refund); setDecision(""); setNote("");
    setCredits(Object.fromEntries(refund.allocations.map(a => [a.id, a.principal])));
  }
  const validAmounts = selected?.allocations.every(a => {
    const value = credits[a.id]?.trim(); const amount = Number(value);
    return value !== "" && Number.isFinite(amount) && amount >= 0 && amount <= Number(a.principal) && /^\d+(\.\d{1,2})?$/.test(value);
  });
  async function save() {
    if (!selected || !decision || note.trim().length < 3 || (decision === "reduce" && !validAmounts)) return;
    setSaving(true);
    try {
      await reviewPaymentRefund(estimateId, selected.id, { note: note.trim(), allocations: selected.allocations.map(a => ({ id: a.id, creditAmount: decision === "reduce" ? Number(credits[a.id]) : 0 })) });
      setData(await getPaymentHistory(estimateId)); setSelected(null); router.refresh(); toast.success("Refund review saved.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save refund review."); }
    finally { setSaving(false); }
  }

  return <section id="payment-history" className="scroll-mt-28 rounded-xl border bg-white print:hidden">
    <button type="button" className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left" aria-expanded={open} aria-controls={`payment-history-${estimateId}`} onClick={() => setOpen(!open)}>
      <span className="font-medium">Payment history{(data?.reviewPending ?? reviewPending) && <span className="ml-3 rounded-full bg-amber-50 px-2 py-1 text-xs font-normal text-amber-800">Refund review pending</span>}</span>
      {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
    {open && <div id={`payment-history-${estimateId}`} className="space-y-4 border-t p-5">
      {loading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading payments…</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {data && <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Original receipts are preserved. Confirmed refunds are deducted from the amount paid.</p>
          {data.canReview && <Button type="button" variant="outline" size="sm" disabled={syncing || saving} onClick={sync}>{syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sync Stripe</Button>}
        </div>
        {data.receipts.length ? <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 pr-4">Payment</th><th className="p-2">Date</th><th className="p-2">Method</th><th className="p-2 text-right">Received</th><th className="py-2 pl-2 text-right">Refunded</th></tr></thead>
          <tbody>{data.receipts.map(receipt => <tr key={receipt.id} className="border-b last:border-0"><td className="py-3 pr-4">{receipt.title}</td><td className="whitespace-nowrap p-2">{formatDateEn(receipt.paidAt)}</td><td className="p-2">{receipt.method}</td><td className="whitespace-nowrap p-2 text-right">{formatMoney(Number(receipt.amount))}{Number(receipt.fee) > 0 && <span className="block text-xs text-muted-foreground">Includes {formatMoney(Number(receipt.fee))} fee</span>}</td><td className="whitespace-nowrap py-3 pl-2 text-right">{formatMoney(Number(receipt.refunded))}</td></tr>)}</tbody>
        </table></div> : <p className="text-sm text-muted-foreground">No payments recorded.</p>}
        {data.refunds.map(refund => <div key={refund.id} className="rounded-lg border p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{statusLabel(refund.status)} · {formatMoney(Number(refund.amount))}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateEn(refund.createdAt)} · {refund.reviewedAt ? "Balance reviewed" : active(refund.status) ? "Balance under review" : "No funds deducted"}</p></div>
            {data.canReview && active(refund.status) && !refund.reviewedAt && <Button type="button" variant="outline" size="sm" onClick={() => selectRefund(refund)}>Review balance</Button>}
          </div>
          {refund.reviewedAt && <p className="mt-2 text-muted-foreground">Approved reduction: {formatMoney(refund.allocations.reduce((sum, a) => sum + Number(a.creditAmount), 0))}{refund.note ? ` · ${refund.note}` : ""}</p>}
        </div>)}
      </>}
    </div>}
    <Dialog open={Boolean(selected)} onOpenChange={value => { if (!value && !saving) setSelected(null); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Review refunded balance</DialogTitle><DialogDescription>Confirm whether the customer still owes the returned principal. This saves the balance decision; it does not send a refund.</DialogDescription></DialogHeader>
        {selected && <div className="space-y-4">
          <p className="text-sm">{statusLabel(selected.status)}: <strong>{formatMoney(Number(selected.amount))}</strong>. Processing fees are not added to project principal.</p>
          <label className="block space-y-1 text-sm"><span className="font-medium">Effect on the amount owed</span><select className="w-full rounded-md border bg-white p-2" value={decision} onChange={e => setDecision(e.target.value)}><option value="">Select a decision</option><option value="keep">Keep the current project price</option><option value="reduce">Approve an additional reduction</option></select></label>
          {decision === "keep" && <p className="rounded-md bg-slate-50 p-3 text-sm">Only an unpaid balance will become payable. Use this option when a reduction is already recorded in the project, or a duplicate payment was returned.</p>}
          {decision === "reduce" && <><p className="text-sm text-muted-foreground">Enter only a new reduction that has not already been included in an approved project change.</p>{selected.allocations.map(a => <label key={a.id} className="block space-y-1 text-sm"><span>{a.title} · returned principal {formatMoney(Number(a.principal))}</span><input className="w-full rounded-md border p-2" type="number" min="0" max={a.principal} step="0.01" value={credits[a.id] ?? ""} onChange={e => setCredits({ ...credits, [a.id]: e.target.value })} aria-label={`Approved reduction for ${a.title}`} /></label>)}</>}
          <label className="block space-y-1 text-sm"><span className="font-medium">Reason for this decision</span><textarea className="min-h-24 w-full rounded-md border p-2" maxLength={1000} value={note} onChange={e => setNote(e.target.value)} /></label>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => setSelected(null)}>Cancel</Button><Button type="button" disabled={saving || !decision || note.trim().length < 3 || (decision === "reduce" && !validAmounts)} onClick={save}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save review</Button></div>
        </div>}
      </DialogContent>
    </Dialog>
  </section>;
}
