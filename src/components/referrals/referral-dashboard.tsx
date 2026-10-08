"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Banknote, Copy, RefreshCw, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cancelReferralPayout, createReferralLink, getMyReferrals, requestReferralPayout } from "@/app/api/referrals.api";
import { ApiError } from "@/app/api/_base";
import { moneyInCents, referralDate, referralMoney, referralRewardStatus, referralStatus, type ReferralDashboard as Dashboard } from "@/lib/referrals";
import { ReferralBankForm } from "./referral-bank-form";
import { ReferralQr } from "./referral-qr";

const card = "rounded-2xl border p-6 shadow-sm";
const box = `${card} border-slate-200 bg-white`;
const table = "w-full text-left text-sm [&_th]:pb-3 [&_th]:font-medium [&_th]:text-muted-foreground [&_td]:py-3 [&_tbody_tr]:border-t";
const message = (error: unknown) => error instanceof Error ? error.message : "Could not complete this action. Please try again.";
function HistoryPagination({ page, pages = 1, count, loading, change }: { page: number; pages?: number; count: number; loading: boolean; change: (page: number) => void }) {
  if (pages <= 1 && page === 0) return null;
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{count} total · Page {page + 1} of {Math.max(1, pages)}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={loading || page === 0} onClick={() => change(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={loading || page + 1 >= pages} onClick={() => change(page + 1)}>Next</Button></div></div>;
}
function requestId() {
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function ReferralDashboard({ userId }: { userId: number }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [withdrawalUncertain, setWithdrawalUncertain] = useState(false);
  const [origin, setOrigin] = useState("");
  const [pages, setPages] = useState({ referralsPage: 0, rewardsPage: 0, payoutsPage: 0 });
  const request = useRef<{ amount: string; key: string } | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    try { setData(await getMyReferrals(pages)); setError(null); }
    catch (err) { setError(message(err)); }
    finally { setLoading(false); }
  }, [pages]);
  useEffect(() => { setOrigin(window.location.origin); void reload(); }, [reload]);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(`referral-withdrawal:${userId}`) ?? "null");
      if (saved && typeof saved.amount === "string" && moneyInCents(saved.amount) != null && typeof saved.key === "string" && /^[\da-f-]{36}$/i.test(saved.key)) {
        request.current = saved; setAmount(saved.amount); setWithdrawalUncertain(true);
      }
    } catch { /* Storage may be unavailable; the in-memory retry key remains valid. */ }
  }, [userId]);
  async function action(work: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true);
    try { await work(); toast.success(success); await reload(); }
    catch (err) { toast.error(message(err)); }
    finally { setBusy(false); }
  }
  async function withdraw() {
    if (!data || busy) return;
    const cents = moneyInCents(amount);
    if (!withdrawalUncertain && (cents == null || cents <= 0 || cents > Math.round(Number(data.balances.available) * 100) || cents < Math.round(Number(data.minimumWithdrawal) * 100))) return;
    if (cents == null) return;
    const normalized = (cents / 100).toFixed(2);
    if (request.current?.amount !== normalized) request.current = { amount: normalized, key: requestId() };
    const key = request.current.key;
    try { sessionStorage.setItem(`referral-withdrawal:${userId}`, JSON.stringify(request.current)); } catch { /* Retry is also held in memory. */ }
    setBusy(true);
    try {
      await requestReferralPayout(normalized, key);
      request.current = null;
      try { sessionStorage.removeItem(`referral-withdrawal:${userId}`); } catch { /* No bank details are stored here. */ }
      setWithdrawalUncertain(false);
      setAmount(""); setWithdrawalOpen(false);
      toast.success("Withdrawal request confirmed. You can track it below.");
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500 && (!withdrawalUncertain || err.status === 400)) {
        request.current = null; setWithdrawalUncertain(false);
        try { sessionStorage.removeItem(`referral-withdrawal:${userId}`); } catch { /* Storage may be unavailable. */ }
        toast.error(message(err));
      } else {
        setWithdrawalUncertain(true);
        toast.error("The request could not be confirmed. Retry this same request to check its status safely.");
      }
    } finally { await reload(); setBusy(false); }
  }
  const code = data?.profile?.code;
  const link = code && origin ? `${origin}/login/register?ref=${encodeURIComponent(code)}` : "";
  const amountCents = moneyInCents(amount);
  const validAmount = amountCents != null && amountCents > 0 && amountCents <= Math.round(Number(data?.balances.available ?? 0) * 100) && amountCents >= Math.round(Number(data?.minimumWithdrawal ?? 0) * 100);
  return <main className="container mx-auto max-w-7xl space-y-6 px-4 py-10">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">My referrals</h1><p className="mt-2 text-muted-foreground">Invite new clients and earn rewards on their material purchases.</p></div><Button variant="outline" disabled={loading || busy} onClick={() => void reload()}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button></header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {!data ? <p role="status" className="py-10 text-center text-muted-foreground">{loading ? "Loading your referrals…" : "Your referrals could not be loaded. Please refresh to try again."}</p> : <>
      {Number(data.balances.adjustmentDebt ?? 0) > 0 && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Your rewards include an adjustment of {referralMoney(data.balances.adjustmentDebt ?? 0)} from a return or material change. New available rewards will cover this amount before another withdrawal can be requested.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{([
        ["Pending rewards", data.balances.pending, "Waiting for material payment or final review.", "border-violet-100 border-t-violet-400 bg-violet-50/40", "text-violet-800"],
        ["Available to withdraw", data.balances.available, "Ready to request a bank transfer.", "border-emerald-100 border-t-emerald-400 bg-emerald-50/40", "text-emerald-800"],
        ["Withdrawals in progress", data.balances.reserved, "Reserved for requested or processing transfers.", "border-amber-100 border-t-amber-400 bg-amber-50/40", "text-amber-800"],
        ["Paid to you", data.balances.paid, "Transfers confirmed as sent.", "border-blue-100 border-t-blue-400 bg-blue-50/40", "text-blue-800"],
      ] as const).map(([label, value, detail, color, amountColor]) => <section key={label} className={`${card} border-t-4 ${color}`}><p className="text-sm font-medium text-slate-600">{label}</p><p className={`mt-3 text-3xl font-semibold ${amountColor}`}>{referralMoney(value)}</p><p className="mt-2 text-xs leading-relaxed text-slate-600">{detail}</p></section>)}</div>
      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className={`${card} space-y-5 border-rose-200 bg-white`}><h2 className="flex items-center gap-3 text-xl font-semibold"><span className="rounded-xl bg-rose-100 p-2.5 text-rose-700"><Users aria-hidden="true" className="h-5 w-5" /></span>Your referral link</h2>
          {!data.profile?.enabled ? <div className="rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground">Your referral link is currently unavailable. Contact support for help. Existing rewards and withdrawals remain visible here.</div> : <>
            <p className="text-sm text-muted-foreground">New clients who register through your link become your direct referrals. You earn from their eligible material purchases.</p>
            {link ? <div className="flex flex-col items-start gap-6 sm:flex-row"><div className="min-w-0 flex-1 space-y-4"><Label htmlFor="referral-link">Share your link</Label><Input id="referral-link" value={link} readOnly onFocus={e => e.target.select()} /><Button variant="outline" className="border-rose-200 bg-rose-50/50 text-rose-800 hover:bg-rose-100 hover:text-rose-900" onClick={async () => { try { await navigator.clipboard.writeText(link); toast.success("Referral link copied."); } catch { toast.error("Select and copy the link above."); } }}><Copy className="mr-2 h-4 w-4" />Copy link</Button><p className="text-sm text-muted-foreground">Share the QR code in person or add it to your printed materials.</p></div><ReferralQr url={link} /></div> : <Button disabled={busy} onClick={() => void action(createReferralLink, "Your referral link is ready.")}>Create referral link</Button>}
          </>}
          <p className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">Rewards apply to direct referrals only. Installation, taxes, and processing fees do not earn rewards. Rewards become available after material is fully paid and the order review is complete. Returns or material changes can adjust rewards.</p>
        </section>
        <section className={`${card} space-y-5 border-blue-200 bg-white`}><h2 className="flex items-center gap-3 text-xl font-semibold"><span className="rounded-xl bg-blue-100 p-2.5 text-blue-700"><Wallet aria-hidden="true" className="h-5 w-5" /></span>Withdraw rewards</h2>
          {data.bank ? <div className="rounded-xl border bg-slate-50 p-4 text-sm"><p className="font-semibold">{data.bank.bankName} ···· {data.bank.accountLast4}</p><p className="mt-1 text-muted-foreground">{data.bank.holderName} · {data.bank.accountType === "CHECKING" ? "Checking" : "Savings"}</p><p className="mt-1 text-muted-foreground">US bank · ACH · USD</p><Button variant="link" className="mt-2 h-auto p-0" onClick={() => setBankOpen(true)}>Change bank account</Button></div> : <div className="space-y-3 rounded-xl bg-slate-50 p-4"><p className="text-sm text-muted-foreground">Add a US bank account to request your first withdrawal.</p><Button variant="outline" onClick={() => setBankOpen(true)}><Banknote className="mr-2 h-4 w-4" />Add bank account</Button></div>}
          <div className="space-y-2"><Label htmlFor="withdrawal-amount">Withdrawal amount (USD)</Label><Input id="withdrawal-amount" inputMode="decimal" placeholder="0.00" value={amount} disabled={busy || withdrawalUncertain} onChange={e => setAmount(e.target.value)} /><p className="text-xs text-muted-foreground">Available: {referralMoney(data.balances.available)}{Number(data.minimumWithdrawal) > 0 ? ` · Minimum: ${referralMoney(data.minimumWithdrawal)}` : " · No minimum withdrawal"}</p></div>
          {withdrawalUncertain && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">The last request needs confirmation. Check it before requesting a different amount; this will reuse the same request and prevent a duplicate.</p>}
          <p className="text-sm text-muted-foreground">You receive the full amount requested. Authentic covers bank transfer fees. Transfers are reviewed and sent manually.</p>
          <Button className="w-full" disabled={(!withdrawalUncertain && (!validAmount || !data.bank)) || busy || loading || Boolean(error)} onClick={() => setWithdrawalOpen(true)}>{withdrawalUncertain ? "Check previous request" : "Request withdrawal"}</Button>
        </section>
      </div>
      {((data.referralCount ?? 0) > data.referrals.length || (data.rewardCount ?? 0) > data.rewards.length || (data.payoutCount ?? 0) > data.payouts.length) && <p className="text-sm text-muted-foreground">Use the page controls below to view all activity. Your balances include all pages.</p>}
      <section className={box}><h2 className="mb-5 text-xl font-semibold">Direct referrals <span className="ml-2 text-sm font-normal text-muted-foreground">{data.referralCount ?? data.referrals.length}</span></h2>{!data.referrals.length ? <p className="text-sm text-muted-foreground">Your new referrals will appear here after they create an account using your link.</p> : <div className="overflow-x-auto"><table className={table}><thead><tr><th>Client</th><th>Joined</th><th className="text-right">Rewards earned</th></tr></thead><tbody>{data.referrals.map(item => <tr key={item.id}><td>{item.firstName}</td><td>{referralDate(item.joinedAt)}</td><td className="text-right">{referralMoney(item.rewardTotal)}</td></tr>)}</tbody></table></div>}</section>
      <HistoryPagination page={pages.referralsPage} pages={data.referralPages} count={data.referralCount ?? data.referrals.length} loading={loading || busy} change={page => setPages(value => ({ ...value, referralsPage: page }))} />
      <section className={box}><h2 className="mb-5 text-xl font-semibold">Reward history</h2>{!data.rewards.length ? <p className="text-sm text-muted-foreground">Rewards will appear when your referred clients place eligible orders.</p> : <div className="overflow-x-auto"><table className={table}><thead><tr><th>Date</th><th>Client</th><th>Status</th><th className="text-right">Reward</th></tr></thead><tbody>{data.rewards.map(item => <tr key={item.id}><td>{referralDate(item.createdAt)}</td><td>{item.firstName}</td><td><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{referralRewardStatus(item.status)}</span></td><td className="text-right">{referralMoney(item.amount)}</td></tr>)}</tbody></table></div>}</section>
      <HistoryPagination page={pages.rewardsPage} pages={data.rewardPages} count={data.rewardCount ?? data.rewards.length} loading={loading || busy} change={page => setPages(value => ({ ...value, rewardsPage: page }))} />
      <section className={box}><h2 className="mb-5 text-xl font-semibold">Withdrawal history</h2>{!data.payouts.length ? <p className="text-sm text-muted-foreground">No withdrawals requested yet.</p> : <div className="overflow-x-auto"><table className={`${table} min-w-[620px]`}><thead><tr><th>Requested</th><th>Destination</th><th>Status</th><th className="text-right">Amount</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{data.payouts.map(item => <tr key={item.id}><td>{referralDate(item.requestedAt)}<p className="text-xs text-muted-foreground">#{item.id}</p></td><td>{item.bankName} ···· {item.accountLast4}</td><td>{referralStatus(item.status)}{item.paidAt && <p className="text-xs text-muted-foreground">{referralDate(item.paidAt)}{item.reference ? ` · ${item.reference}` : ""}</p>}{item.note && <p className="max-w-xs text-xs text-muted-foreground">{item.note}</p>}</td><td className="text-right">{referralMoney(item.amount)}</td><td className="text-right">{item.status === "REQUESTED" && <Button size="sm" variant="outline" disabled={busy} onClick={() => void action(() => cancelReferralPayout(item.id), "Withdrawal canceled. The amount is available again.")}>Cancel</Button>}</td></tr>)}</tbody></table></div>}</section>
      <HistoryPagination page={pages.payoutsPage} pages={data.payoutPages} count={data.payoutCount ?? data.payouts.length} loading={loading || busy} change={page => setPages(value => ({ ...value, payoutsPage: page }))} />
    </>}
    <Dialog open={bankOpen} onOpenChange={setBankOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Bank account for ACH payments</DialogTitle><DialogDescription>Enter your bank account details. Only the last four account digits will appear on your dashboard.</DialogDescription></DialogHeader>{bankOpen && <ReferralBankForm onCancel={() => setBankOpen(false)} onSaved={async () => { setBankOpen(false); await reload(); }} />}</DialogContent></Dialog>
    <Dialog open={withdrawalOpen} onOpenChange={open => { if (!busy) setWithdrawalOpen(open); }}><DialogContent><DialogHeader><DialogTitle>{withdrawalUncertain ? "Check previous request" : "Confirm withdrawal"}</DialogTitle><DialogDescription>{withdrawalUncertain ? "Check the same request again to confirm its result. A confirmed request will appear in your withdrawal history with its saved bank destination." : "Your request reserves this amount until the transfer is completed or canceled."}</DialogDescription></DialogHeader><div className="space-y-3 rounded-xl bg-slate-50 p-4"><p className="flex justify-between"><span>You receive</span><strong>{referralMoney(amount || 0)}</strong></p>{!withdrawalUncertain && <p className="text-sm text-muted-foreground">{data?.bank?.bankName} ···· {data?.bank?.accountLast4}</p>}<p className="text-sm text-muted-foreground">ACH to your US bank account. Authentic pays the bank fees.</p></div><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setWithdrawalOpen(false)}>Back</Button><Button disabled={busy || (!withdrawalUncertain && !validAmount) || loading || Boolean(error)} onClick={() => void withdraw()}>{busy ? "Checking…" : withdrawalUncertain ? "Check same request" : "Confirm request"}</Button></div></DialogContent></Dialog>
  </main>;
}
