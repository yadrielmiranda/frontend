"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Eye, RefreshCw, Settings2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getReferralAdmin, revealPayoutBank, saveReferralSettings, transitionReferralPayout } from "@/app/api/referrals.api";
import { moneyInCents, referralDate, referralMoney, referralStatus, type ReferralAdminDashboard, type ReferralPayout, type ReferralPayoutTransition } from "@/lib/referrals";
import { ReferralPayoutRecoveryForm } from "./referral-payout-recovery";

const card = "rounded-2xl border p-6 shadow-sm";
const box = `${card} border-slate-200 bg-white`;
const select = "h-10 w-full rounded-md border bg-white px-3 text-sm";
const table = "w-full text-left text-sm [&_th]:pb-3 [&_th]:font-medium [&_th]:text-muted-foreground [&_td]:py-3 [&_tbody_tr]:border-t";
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Could not complete this action. Please try again.";

function PayoutEditor({ payout, onDone, onCancel }: { payout: ReferralPayout; onDone: () => Promise<void>; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bank, setBank] = useState<Awaited<ReturnType<typeof revealPayoutBank>> | null>(null);
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [bankFee, setBankFee] = useState("0.00");
  const [proofReference, setProofReference] = useState("");
  const [note, setNote] = useState("");
  const [confirmedNotSent, setConfirmedNotSent] = useState(false);
  const [action, setAction] = useState<ReferralPayoutTransition["status"]>(payout.status === "REQUESTED" ? "PROCESSING" : "PAID");
  useEffect(() => {
    const hide = () => { if (document.hidden) setBank(null); };
    document.addEventListener("visibilitychange", hide);
    const timer = bank ? window.setTimeout(() => setBank(null), 120_000) : undefined;
    return () => { document.removeEventListener("visibilitychange", hide); if (timer) window.clearTimeout(timer); };
  }, [bank]);
  async function reveal() {
    setBusy(true); setError(null);
    try { setBank(await revealPayoutBank(payout.id)); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (action === "PAID" && (!reference.trim() || !paidAt || moneyInCents(bankFee) == null)) return setError("Enter a transfer reference, payment date, and valid bank fee.");
    if ((action === "REJECTED" || action === "FAILED") && !note.trim()) return setError("Enter a reason for this action.");
    if (action === "FAILED" && !confirmedNotSent) return setError("Confirm that no funds were sent before releasing the reserved amount.");
    setBusy(true);
    try {
      await transitionReferralPayout(payout.id, { status: action,
        ...(action === "PAID" ? { reference: reference.trim(), paidAt: new Date(paidAt).toISOString(), bankFee, proofReference: proofReference.trim() || undefined } : {}),
        ...(note.trim() ? { note: note.trim() } : {}), ...(action === "FAILED" ? { confirmedNotSent: true } : {}),
      });
      setBank(null); toast.success(action === "PAID" ? "Bank transfer recorded as paid." : "Withdrawal updated."); await onDone();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-5">
    <div className="rounded-xl bg-slate-50 p-4"><p className="flex justify-between gap-3"><span>{payout.userName}</span><strong>{referralMoney(payout.amount)}</strong></p><p className="mt-1 text-sm text-muted-foreground">{payout.bankName} ···· {payout.accountLast4} · ACH · USD</p><p className="mt-2 text-xs text-muted-foreground">Send the full withdrawal amount. Bank fees are paid by Authentic.</p></div>
    {bank ? <div className="space-y-2 rounded-xl border p-4 text-sm"><div className="flex justify-between"><strong>Saved payout destination</strong><button type="button" className="underline" onClick={() => setBank(null)}>Hide</button></div><p>{bank.holderName} · {bank.holderType === "BUSINESS" ? "Business" : "Individual"}</p><p>{bank.bankName} · {bank.accountType === "SAVINGS" ? "Savings" : "Checking"}</p><p>ACH routing: <span className="select-all font-mono">{bank.routingNumber}</span></p><p>Account: <span className="select-all font-mono">{bank.accountNumber}</span></p><p className="text-xs text-muted-foreground">This destination was saved when the withdrawal was requested.</p></div> : payout.status === "PROCESSING" ? <Button type="button" variant="outline" disabled={busy} onClick={() => void reveal()}><Eye className="mr-2 h-4 w-4" />View bank details for this transfer</Button> : null}
    {["REQUESTED", "PROCESSING"].includes(payout.status) ? <>
      <fieldset disabled={busy} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="payout-action">Action</Label><select id="payout-action" className={select} value={action} onChange={e => setAction(e.target.value as ReferralPayoutTransition["status"])}>{payout.status === "REQUESTED" ? <><option value="PROCESSING">Start processing</option><option value="REJECTED">Decline request</option></> : <><option value="PAID">Record completed transfer</option><option value="FAILED">Confirm transfer was not sent</option></>}</select></div>
        {action === "PROCESSING" && <p className="text-sm text-muted-foreground">This reserves the request for processing. It does not send money. Send the ACH transfer through your bank, then return here to record its completion.</p>}
        {action === "PAID" && <><div className="space-y-2"><Label htmlFor="payout-reference">Bank transfer reference</Label><Input id="payout-reference" required maxLength={150} value={reference} onChange={e => setReference(e.target.value)} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="payout-date">Transfer date and time</Label><Input id="payout-date" type="datetime-local" step="1" required value={paidAt} onChange={e => setPaidAt(e.target.value)} /><Button type="button" size="sm" variant="link" className="h-auto px-0" onClick={() => { const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); setPaidAt(now.toISOString().slice(0, 19)); }}>Use current time</Button></div><div className="space-y-2"><Label htmlFor="payout-fee">Bank fee paid by Authentic (USD)</Label><Input id="payout-fee" inputMode="decimal" required value={bankFee} onChange={e => setBankFee(e.target.value)} /></div></div><div className="space-y-2"><Label htmlFor="payout-proof">Receipt reference (optional)</Label><Input id="payout-proof" maxLength={300} placeholder="Receipt number or location" value={proofReference} onChange={e => setProofReference(e.target.value)} /></div><p className="text-sm text-muted-foreground">Record only transfers already sent through your bank. The user receives {referralMoney(payout.amount)} in full.</p></>}
        <div className="space-y-2"><Label htmlFor="payout-note">{action === "FAILED" || action === "REJECTED" ? "Reason" : "Note (optional)"}</Label><Input id="payout-note" maxLength={500} required={action === "FAILED" || action === "REJECTED"} value={note} onChange={e => setNote(e.target.value)} /><p className="text-xs text-muted-foreground">Shown to the user. Do not enter bank account numbers here.</p></div>
        {action === "FAILED" && <label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1 h-4 w-4 shrink-0" checked={confirmedNotSent} onChange={e => setConfirmedNotSent(e.target.checked)} /><span>I have confirmed that no funds were sent. Release the reserved amount back to the user.</span></label>}
      </fieldset>
    </> : <div className="space-y-2 text-sm"><p>Status: {referralStatus(payout.status)}</p>{payout.reference && <p>Reference: {payout.reference}</p>}{payout.paidAt && <p>Paid: {referralDate(payout.paidAt)}</p>}{payout.bankFee != null && <p>Company bank fee: {referralMoney(payout.bankFee)}</p>}{payout.proofReference && <p className="break-all">Receipt: {payout.proofReference}</p>}{payout.note && <p>{payout.note}</p>}</div>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => { setBank(null); onCancel(); }}>Close</Button>{["REQUESTED", "PROCESSING"].includes(payout.status) && <Button disabled={busy}>{busy ? "Saving…" : action === "PAID" ? "Record as paid" : action === "PROCESSING" ? "Start processing" : action === "FAILED" ? "Confirm not sent" : "Decline request"}</Button>}</div>
  </form>;
}

export function ReferralAdmin({ currentUserId }: { currentUserId: number }) {
  const [data, setData] = useState<ReferralAdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [minimum, setMinimum] = useState("0.00");
  const [saving, setSaving] = useState(false);
  const [payout, setPayout] = useState<ReferralPayout | null>(null);
  const [filter, setFilter] = useState("OPEN");
  const [payoutsPage, setPayoutsPage] = useState(0);
  const reload = useCallback(async () => {
    setLoading(true);
    try { const next = await getReferralAdmin(payoutsPage, filter); setData(next); setMinimum(String(next.settings.minimumWithdrawal)); setError(null); }
    catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, [payoutsPage, filter]);
  useEffect(() => { void reload(); }, [reload]);
  async function saveMinimum(event: FormEvent) {
    event.preventDefault(); if (moneyInCents(minimum) == null) return toast.error("Enter a valid amount with up to two decimal places.");
    setSaving(true);
    try { await saveReferralSettings(minimum); toast.success("Withdrawal minimum saved."); await reload(); }
    catch (err) { toast.error(errorMessage(err)); }
    finally { setSaving(false); }
  }
  const payouts = data?.payouts ?? [];
  return <main className="container mx-auto max-w-7xl space-y-6 px-4 py-10">
    <header className="flex flex-wrap justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Referral rewards</h1><p className="mt-2 text-muted-foreground">Manage reward terms and manual ACH withdrawals.</p></div><Button variant="outline" disabled={loading} onClick={() => void reload()}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button></header>
    <nav aria-label="Referral reward settings" className="grid gap-4 sm:grid-cols-2">
      <Link href="/settings/referrals/roles" className={`${card} flex items-center gap-4 border-rose-200 bg-rose-50/40 transition-colors hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400`}><span className="rounded-xl bg-rose-100 p-3 text-rose-700"><Settings2 aria-hidden="true" className="h-6 w-6 shrink-0" /></span><div className="flex-1"><h2 className="font-semibold">Default rewards by role</h2><p className="mt-1 text-sm text-slate-600">Manage the default rewards for each account type.</p></div><ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-rose-700" /></Link>
      <Link href="/settings/referrals/users" className={`${card} flex items-center gap-4 border-blue-200 bg-blue-50/40 transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}><span className="rounded-xl bg-blue-100 p-3 text-blue-700"><Users aria-hidden="true" className="h-6 w-6 shrink-0" /></span><div className="flex-1"><h2 className="font-semibold">Individual settings</h2><p className="mt-1 text-sm text-slate-600">Find a user and manage individual exceptions.</p></div><ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-700" /></Link>
    </nav>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {!data ? <p role="status" className="py-10 text-center text-muted-foreground">{loading ? "Loading referral program…" : "Could not load referral settings. Please refresh to try again."}</p> : <>
      {data.summary && <section className="space-y-3"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{([
        ["Rewards earned", data.summary.earned, "border-emerald-100 border-t-emerald-400 bg-emerald-50/40", "text-emerald-800"],
        ["Withdrawals in progress", data.summary.reserved, "border-amber-100 border-t-amber-400 bg-amber-50/40", "text-amber-800"],
        ["Rewards paid", data.summary.paid, "border-blue-100 border-t-blue-400 bg-blue-50/40", "text-blue-800"],
        ["Bank fees paid by Authentic", data.summary.bankFees, "border-slate-200 border-t-slate-400 bg-slate-50/60", "text-slate-800"],
      ] as const).map(([label, value, color, amountColor]) => <div key={label} className={`${card} border-t-4 ${color}`}><p className="text-sm text-slate-600">{label}</p><p className={`mt-2 text-2xl font-semibold ${amountColor}`}>{referralMoney(value)}</p></div>)}</div><p className="text-xs text-muted-foreground">Earned rewards reflect the latest account reviews{data.summary.rewardsLastEvaluatedAt ? ` (${referralDate(data.summary.rewardsLastEvaluatedAt)})` : ""}. Withdrawals are checked against current balances before processing.</p></section>}
      <section className={box}><h2 className="text-xl font-semibold">Withdrawal settings</h2><form onSubmit={saveMinimum} className="mt-4 flex flex-wrap items-end gap-4"><div className="space-y-2"><Label htmlFor="minimum-withdrawal">Minimum withdrawal (USD)</Label><Input id="minimum-withdrawal" className="max-w-60" inputMode="decimal" value={minimum} onChange={e => setMinimum(e.target.value)} disabled={saving} /></div><Button disabled={saving}>{saving ? "Saving…" : "Save minimum"}</Button></form><p className="mt-3 text-sm text-muted-foreground">Set 0 for no minimum. Users receive their full requested amount; Authentic pays bank fees. Withdrawals are sent manually to US bank accounts via ACH.</p></section>
      <section className={box}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Withdrawal requests</h2><select aria-label="Filter withdrawals by status" className={`${select} w-auto`} value={filter} disabled={loading} onChange={e => { setFilter(e.target.value); setPayoutsPage(0); }}><option value="OPEN">Needs attention</option><option value="ALL">All statuses</option></select></div><div className="mt-5 overflow-x-auto"><table className={`${table} min-w-[640px]`}><thead><tr><th>Requested</th><th>User / destination</th><th>Status</th><th className="text-right">Amount</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{payouts.map(item => <tr key={item.id}><td>{referralDate(item.requestedAt)}<p className="text-xs text-muted-foreground">#{item.id}</p></td><td><p className="font-medium">{item.userName}</p><p className="text-xs text-muted-foreground">{item.bankName} ···· {item.accountLast4}</p></td><td>{referralStatus(item.status)}{item.status === "PROCESSING" && item.processingById !== currentUserId && <p className="max-w-48 text-xs text-muted-foreground">Being processed by another administrator</p>}</td><td className="text-right font-medium">{referralMoney(item.amount)}</td><td className="text-right"><Button size="sm" variant="outline" onClick={() => setPayout(item)}>{item.status === "REQUESTED" || (item.status === "PROCESSING" && item.processingById === currentUserId) ? "Review" : "Details"}</Button></td></tr>)}</tbody></table>{!payouts.length && <p className="py-6 text-sm text-muted-foreground">No withdrawals in this view.</p>}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{data.payoutCount ?? payouts.length} requests · Page {(data.payoutsPage ?? payoutsPage) + 1} of {Math.max(1, data.payoutPages ?? 1)}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={loading || payoutsPage === 0} onClick={() => setPayoutsPage(value => value - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={loading || payoutsPage + 1 >= (data.payoutPages ?? 1)} onClick={() => setPayoutsPage(value => value + 1)}>Next</Button></div></div></section>
    </>}
    <Dialog open={Boolean(payout)} onOpenChange={open => { if (!open) setPayout(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Withdrawal #{payout?.id}</DialogTitle><DialogDescription>Review the saved destination and record the bank transfer status.</DialogDescription></DialogHeader>{payout && (payout.status === "PROCESSING" && payout.processingById !== currentUserId ? <ReferralPayoutRecoveryForm key={payout.id} payout={payout} onCancel={() => setPayout(null)} onDone={async () => { setPayout(null); await reload(); }} /> : <PayoutEditor key={payout.id} payout={payout} onCancel={() => setPayout(null)} onDone={async () => { setPayout(null); await reload(); }} />)}</DialogContent></Dialog>
  </main>;
}
