"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveReferralProfile, saveReferralRoleDefault } from "@/app/api/referrals.api";
import { referralModeLabel, referralRoleLabel, referralRuleLabel, type ReferralAdminUser, type ReferralMode, type ReferralRoleDefault } from "@/lib/referrals";

const select = "h-10 w-full rounded-md border bg-white px-3 text-sm";
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Could not save reward settings. Please try again.";
const validPercent = (value: string) => /^\d+(\.\d{1,4})?$/.test(value) && Number(value) <= 100;
const changesNotice = "Changes apply to future orders. Existing orders keep their saved reward terms. Only direct referrals earn rewards.";

function RuleFields({ mode, percent, allowedModes, setMode, setPercent }: { mode: ReferralMode; percent: string; allowedModes: ReferralMode[]; setMode: (mode: ReferralMode) => void; setPercent: (percent: string) => void }) {
  return <>
    <div className="space-y-2"><Label htmlFor="referral-rule">Reward calculation</Label><select id="referral-rule" className={select} value={mode} onChange={event => setMode(event.target.value as ReferralMode)}>{allowedModes.map(value => <option key={value} value={value}>{referralModeLabel[value]}</option>)}</select></div>
    {mode === "CUSTOM_PERCENT" && <div className="space-y-2"><Label htmlFor="referral-percent">Share of material margin (%)</Label><Input id="referral-percent" inputMode="decimal" required value={percent} onChange={event => setPercent(event.target.value)} /><p className="text-sm text-muted-foreground">Reward = this percentage × (final client material price − app base price).</p>{Number(percent) === 0 && <p className="text-sm text-amber-700">At 0%, links remain available but new orders do not earn a reward.</p>}</div>}
    {mode === "EXTERNAL_MARGIN" && <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground">Each dealer earns the difference between the final client material price and the price they would pay using their own configured markup.</p>}
    {mode === "DEALER_PLAN" && <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground">Use each internal dealer&apos;s assigned earnings plan. If the plan requires final factory or processing costs, rewards wait until those costs are available.</p>}
  </>;
}

export function ReferralRoleDefaultEditor({ rule, onDone, onCancel }: { rule: ReferralRoleDefault; onDone: () => Promise<void>; onCancel: () => void }) {
  const [mode, setMode] = useState<ReferralMode>(rule.mode);
  const [percent, setPercent] = useState(String(rule.percent ?? 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (mode === "CUSTOM_PERCENT" && !validPercent(percent)) return setError("Enter a percentage from 0 to 100, with up to four decimal places.");
    setBusy(true);
    try {
      await saveReferralRoleDefault(rule.role, { mode, ...(mode === "CUSTOM_PERCENT" ? { percent } : {}) });
      toast.success("Role defaults saved."); await onDone();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <form className="space-y-5" onSubmit={submit}>
    <fieldset className="space-y-4" disabled={busy}>
      <p className="text-sm text-muted-foreground">Applies automatically to current and new {referralRoleLabel[rule.role].toLowerCase()} accounts using role defaults. Individual custom settings stay unchanged.</p>
      <RuleFields mode={mode} percent={percent} allowedModes={rule.allowedModes} setMode={setMode} setPercent={setPercent} />
      <p className="text-xs text-muted-foreground">{changesNotice}</p>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button><Button disabled={busy}>{busy ? "Saving…" : "Save role defaults"}</Button></div>
  </form>;
}

export function ReferralProfileEditor({ user, roleDefault, onDone, onCancel }: { user: ReferralAdminUser; roleDefault?: ReferralRoleDefault; onDone: () => Promise<void>; onCancel: () => void }) {
  const [useRoleDefaults, setUseRoleDefaults] = useState(user.useRoleDefaults);
  const [enabled, setEnabled] = useState(user.profile?.enabled ?? true);
  const [mode, setMode] = useState<ReferralMode>(user.profile?.mode && user.allowedModes.includes(user.profile.mode) ? user.profile.mode : user.allowedModes[0] ?? "CUSTOM_PERCENT");
  const [percent, setPercent] = useState(String(user.profile?.percent ?? 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!useRoleDefaults && mode === "CUSTOM_PERCENT" && !validPercent(percent)) return setError("Enter a percentage from 0 to 100, with up to four decimal places.");
    setBusy(true);
    try {
      await saveReferralProfile(user.id, useRoleDefaults ? { useRoleDefaults: true } : { useRoleDefaults: false, enabled, mode, ...(mode === "CUSTOM_PERCENT" ? { percent } : {}) });
      toast.success(useRoleDefaults ? "User now follows role defaults." : "Custom reward settings saved."); await onDone();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <form className="space-y-5" onSubmit={submit}>
    <fieldset className="space-y-4" disabled={busy}>
      <div className="space-y-2"><Label htmlFor="referral-settings-source">Settings for this user</Label><select id="referral-settings-source" className={select} value={useRoleDefaults ? "role" : "custom"} onChange={event => setUseRoleDefaults(event.target.value === "role")}><option value="role">Use role defaults</option><option value="custom">Custom settings</option></select></div>
      {useRoleDefaults ? <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm"><p className="font-medium">{referralRoleLabel[user.referralRole]} defaults</p><p>{referralRuleLabel(roleDefault)}</p><p className="text-muted-foreground">The referral link is available automatically for active accounts. Future changes to this role will apply to this user.</p></div> : <>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4" checked={enabled} onChange={event => setEnabled(event.target.checked)} />Enable referral link</label>
        <RuleFields mode={mode} percent={percent} allowedModes={user.allowedModes} setMode={setMode} setPercent={setPercent} />
        <p className="text-sm text-muted-foreground">These custom settings override the role defaults for this user only.</p>
      </>}
      <p className="text-xs text-muted-foreground">{changesNotice}</p>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button><Button disabled={busy}>{busy ? "Saving…" : useRoleDefaults ? "Use role defaults" : "Save custom settings"}</Button></div>
  </form>;
}
