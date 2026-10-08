"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recoverReferralPayout } from "@/app/api/referrals.api";
import { moneyInCents, referralMoney, type ReferralPayout, type ReferralPayoutRecovery } from "@/lib/referrals";

export function ReferralPayoutRecoveryForm({ payout, onDone, onCancel }: {
  payout: ReferralPayout; onDone: () => Promise<void>; onCancel: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<"PAID" | "FAILED">("PAID");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [bankFee, setBankFee] = useState("0.00");
  const [proofReference, setProofReference] = useState("");
  const [note, setNote] = useState("");
  const [bankOutcomeConfirmed, setBankOutcomeConfirmed] = useState(false);
  const [confirmedNotSent, setConfirmedNotSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!expanded || payout.status !== "PROCESSING" || !payout.processingById) return setError("Refresh the withdrawal before recording its outcome.");
    if (!note.trim() || !bankOutcomeConfirmed) return setError("Explain the outcome and confirm that it has been verified with the bank.");
    if (status === "PAID" && (!reference.trim() || !proofReference.trim() || !paidAt || Number.isNaN(new Date(paidAt).getTime()) || moneyInCents(bankFee) == null)) return setError("Enter the bank reference, receipt reference, transfer date, and bank fee.");
    if (status === "FAILED" && !confirmedNotSent) return setError("Confirm that no funds were sent and no bank transfer is pending.");
    const data: ReferralPayoutRecovery = {
      status, expectedProcessingById: payout.processingById, bankOutcomeConfirmed: true, note: note.trim(),
      ...(status === "PAID" ? { reference: reference.trim(), proofReference: proofReference.trim(), paidAt: new Date(paidAt).toISOString(), bankFee } : { confirmedNotSent: true }),
    };
    setBusy(true);
    try { await recoverReferralPayout(payout.id, data); toast.success("Verified bank outcome recorded."); await onDone(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not record the bank outcome. Refresh and try again."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <div className="rounded-xl bg-slate-50 p-4"><p className="flex justify-between gap-3"><span>{payout.userName}</span><strong>{referralMoney(payout.amount)}</strong></p><p className="mt-1 text-sm text-muted-foreground">{payout.bankName} ···· {payout.accountLast4} · ACH · USD</p></div>
    <p className="text-sm text-muted-foreground">Another administrator is processing this withdrawal. Coordinate with them and verify the bank&apos;s records before recording an outcome. Do not initiate another transfer.</p>
    {!expanded ? <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={onCancel}>Close</Button><Button variant="outline" disabled={!payout.processingById} onClick={() => setExpanded(true)}>Record verified bank outcome</Button></div> : <form onSubmit={submit} className="space-y-5">
      <fieldset disabled={busy} className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">This records a verified outcome for the existing transfer. It does not send money or give you access to the bank account details. If the transfer is still pending or its outcome is uncertain, leave the withdrawal in processing.</div>
        <div className="space-y-2"><Label htmlFor="recovery-status">Verified outcome</Label><select id="recovery-status" className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={status} onChange={e => { setStatus(e.target.value as "PAID" | "FAILED"); setBankOutcomeConfirmed(false); setConfirmedNotSent(false); }}><option value="PAID">Bank confirms the transfer was sent</option><option value="FAILED">Bank confirms no funds sent or transfer pending</option></select></div>
        {status === "PAID" && <>
          <div className="space-y-2"><Label htmlFor="recovery-reference">Bank transfer reference</Label><Input id="recovery-reference" required maxLength={150} value={reference} onChange={e => setReference(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="recovery-proof">Bank receipt reference</Label><Input id="recovery-proof" required maxLength={300} placeholder="Receipt number or location" value={proofReference} onChange={e => setProofReference(e.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="recovery-date">Actual transfer date and time</Label><Input id="recovery-date" type="datetime-local" step="1" required value={paidAt} onChange={e => setPaidAt(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="recovery-fee">Bank fee paid by Authentic (USD)</Label><Input id="recovery-fee" inputMode="decimal" required value={bankFee} onChange={e => setBankFee(e.target.value)} /></div></div>
        </>}
        <div className="space-y-2"><Label htmlFor="recovery-note">Explanation of the verified outcome</Label><Input id="recovery-note" required maxLength={500} value={note} onChange={e => setNote(e.target.value)} /><p className="text-xs text-muted-foreground">Shown to the user. Do not enter account or routing numbers.</p></div>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1 h-4 w-4 shrink-0" checked={bankOutcomeConfirmed} onChange={e => setBankOutcomeConfirmed(e.target.checked)} /><span>I have verified this outcome directly with the bank and coordinated with the administrator responsible for the withdrawal, or confirmed that they are unavailable. I am recording the existing transfer&apos;s outcome.</span></label>
        {status === "FAILED" && <label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1 h-4 w-4 shrink-0" checked={confirmedNotSent} onChange={e => setConfirmedNotSent(e.target.checked)} /><span>The bank confirms that no funds were sent and no transfer is pending. The reserved amount can be released for a new withdrawal request.</span></label>}
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => { setExpanded(false); setError(null); setBankOutcomeConfirmed(false); setConfirmedNotSent(false); }}>Back</Button><Button disabled={busy || !bankOutcomeConfirmed || (status === "FAILED" && !confirmedNotSent)}>{busy ? "Recording…" : "Record verified outcome"}</Button></div>
    </form>}
  </div>;
}
