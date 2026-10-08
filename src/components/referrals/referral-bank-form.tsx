"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveReferralBank } from "@/app/api/referrals.api";
import { validAchRoutingNumber, type ReferralBankInput } from "@/lib/referrals";
import { toast } from "sonner";

const emptyBank: ReferralBankInput = { holderName: "", holderType: "PERSONAL", bankName: "", accountType: "CHECKING", routingNumber: "", accountNumber: "", confirmAccountNumber: "", authorized: false };
export function ReferralBankForm({ onSaved, onCancel }: { onSaved: () => Promise<void>; onCancel: () => void }) {
  const [bank, setBank] = useState(emptyBank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = <K extends keyof ReferralBankInput>(key: K, value: ReferralBankInput[K]) => setBank(previous => ({ ...previous, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validAchRoutingNumber(bank.routingNumber)) return setError("Enter a valid 9-digit ACH routing number.");
    if (!/^\d{1,17}$/.test(bank.accountNumber)) return setError("Enter an account number with 1 to 17 digits.");
    if (bank.accountNumber !== bank.confirmAccountNumber) return setError("The account numbers do not match.");
    if (!bank.authorized) return setError("Confirm that you are authorized to receive payments into this account.");
    setSaving(true);
    try {
      await saveReferralBank({ ...bank, holderName: bank.holderName.trim(), bankName: bank.bankName.trim() });
      setBank(emptyBank);
      toast.success("Bank account saved.");
      await onSaved();
    } catch (err) {
      // Do not include submitted bank details in errors or logs.
      setError(err instanceof Error ? err.message : "Could not save the bank account. Please try again.");
    } finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-5" autoComplete="off">
    <p className="text-sm text-muted-foreground">Use a US bank account that accepts ACH deposits in USD. Saving a new account applies to future withdrawal requests.</p>
    <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="referral-holder">Account holder&apos;s legal name</Label><Input id="referral-holder" required maxLength={150} value={bank.holderName} onChange={e => field("holderName", e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="referral-holder-type">Account holder</Label><select id="referral-holder-type" className="h-10 w-full rounded-md border bg-white px-3" value={bank.holderType} onChange={e => field("holderType", e.target.value as ReferralBankInput["holderType"])}><option value="PERSONAL">Individual</option><option value="BUSINESS">Business</option></select></div>
      <div className="space-y-2"><Label htmlFor="referral-bank">Bank name</Label><Input id="referral-bank" required maxLength={100} value={bank.bankName} onChange={e => field("bankName", e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="referral-account-type">Account type</Label><select id="referral-account-type" className="h-10 w-full rounded-md border bg-white px-3" value={bank.accountType} onChange={e => field("accountType", e.target.value as ReferralBankInput["accountType"])}><option value="CHECKING">Checking</option><option value="SAVINGS">Savings</option></select></div>
      <div className="space-y-2"><Label htmlFor="referral-routing">ACH routing number</Label><Input id="referral-routing" required inputMode="numeric" pattern="[0-9]{9}" maxLength={9} value={bank.routingNumber} onChange={e => field("routingNumber", e.target.value.replace(/\D/g, ""))} /></div>
      <div className="space-y-2"><Label htmlFor="referral-account">Account number</Label><Input id="referral-account" required type="password" inputMode="numeric" maxLength={17} value={bank.accountNumber} onChange={e => field("accountNumber", e.target.value.replace(/\D/g, ""))} /></div>
      <div className="space-y-2"><Label htmlFor="referral-account-confirm">Confirm account number</Label><Input id="referral-account-confirm" required type="password" inputMode="numeric" maxLength={17} value={bank.confirmAccountNumber} onChange={e => field("confirmAccountNumber", e.target.value.replace(/\D/g, ""))} /></div>
      <label className="flex items-start gap-3 text-sm sm:col-span-2"><input type="checkbox" required className="mt-1 h-4 w-4 shrink-0" checked={bank.authorized} onChange={e => field("authorized", e.target.checked)} /><span>I am the account holder or an authorized representative and authorize referral reward payments to this bank account.</span></label>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={onCancel}>Cancel</Button><Button disabled={saving}>{saving ? "Saving…" : "Save bank account"}</Button></div>
  </form>;
}
