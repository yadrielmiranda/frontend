"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getReferralRoleDefaults, getReferralUsers } from "@/app/api/referrals.api";
import { referralRoleLabel, referralRuleLabel, type ReferralAdminRoleDefaults, type ReferralAdminUsers, type ReferralAdminUser, type ReferralRoleDefault } from "@/lib/referrals";
import { ReferralProfileEditor, ReferralRoleDefaultEditor } from "./referral-rule-editor";

const box = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
const table = "w-full text-left text-sm [&_th]:pb-3 [&_th]:font-medium [&_th]:text-muted-foreground [&_td]:py-3 [&_tbody_tr]:border-t";
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Could not load reward settings. Please try again.";

function SettingsPage({ title, description, loading, error, onRefresh, children }: {
  title: string; description: string; loading: boolean; error: string | null; onRefresh: () => void; children: ReactNode;
}) {
  return <main className="container mx-auto max-w-7xl space-y-6 px-4 py-10">
    <Link href="/settings/referrals" className="inline-flex items-center gap-2 text-sm hover:underline"><ArrowLeft className="h-4 w-4" />Back to referral rewards</Link>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">{title}</h1><p className="mt-2 max-w-4xl text-muted-foreground">{description}</p></div><Button variant="outline" disabled={loading} onClick={onRefresh}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button></header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {children}
  </main>;
}

export function ReferralRoleDefaults() {
  const [data, setData] = useState<ReferralAdminRoleDefaults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rule, setRule] = useState<ReferralRoleDefault | null>(null);
  const requestVersion = useRef(0);
  const reload = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const next = await getReferralRoleDefaults();
      if (requestVersion.current !== version) return;
      setData(next); setError(null);
    } catch (err) {
      if (requestVersion.current === version) setError(errorMessage(err));
    } finally {
      if (requestVersion.current === version) setLoading(false);
    }
  }, []);
  useEffect(() => { const versionRef = requestVersion; void reload(); return () => { versionRef.current++; }; }, [reload]);

  return <SettingsPage title="Default rewards by role" description="Set the default rewards once for each role. Current and new active accounts use these settings automatically. Individual exceptions keep their custom settings." loading={loading} error={error} onRefresh={() => void reload()}>
    <section className={box} aria-busy={loading}>
      {!data ? <p role="status" className="py-6 text-center text-muted-foreground">{loading ? "Loading role defaults…" : "Refresh to try again."}</p> : <>
        <div className="overflow-x-auto"><table className={`${table} min-w-[580px]`}><thead><tr><th>Role</th><th>Default reward</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{data.roleDefaults.map(item => <tr key={item.role}><td className="font-medium">{referralRoleLabel[item.role]}</td><td>{referralRuleLabel(item)}{item.mode === "CUSTOM_PERCENT" && Number(item.percent) === 0 && <p className="mt-1 text-xs text-amber-700">Links available · No reward until a percentage is set</p>}</td><td className="text-right"><Button variant="outline" size="sm" disabled={loading} onClick={() => setRule(item)}>Edit default</Button></td></tr>)}</tbody></table></div>
        <p className="mt-3 text-xs text-muted-foreground">Reward formulas and percentages are visible only to administrators. Changes apply to future orders; existing orders keep their saved terms.</p>
      </>}
    </section>
    <Dialog open={Boolean(rule)} onOpenChange={open => { if (!open) setRule(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Role defaults · {rule ? referralRoleLabel[rule.role] : ""}</DialogTitle><DialogDescription>Configure the default direct referral rewards for this role.</DialogDescription></DialogHeader>{rule && <ReferralRoleDefaultEditor key={rule.role} rule={rule} onCancel={() => setRule(null)} onDone={async () => { setRule(null); await reload(); }} />}</DialogContent></Dialog>
  </SettingsPage>;
}

export function ReferralIndividualSettings() {
  const [data, setData] = useState<ReferralAdminUsers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [request, setRequest] = useState({ q: "", page: 0 });
  const [user, setUser] = useState<ReferralAdminUser | null>(null);
  const requestVersion = useRef(0);
  const reload = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const next = await getReferralUsers(request.q, request.page);
      if (requestVersion.current !== version) return;
      setData(next); setError(null);
    } catch (err) {
      if (requestVersion.current === version) setError(errorMessage(err));
    } finally {
      if (requestVersion.current === version) setLoading(false);
    }
  }, [request]);
  useEffect(() => { const versionRef = requestVersion; void reload(); return () => { versionRef.current++; }; }, [reload]);
  function changePage(page: number) {
    requestVersion.current++;
    setLoading(true);
    setRequest(current => ({ ...current, page }));
  }
  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const q = search.trim();
    if (q === request.q && request.page === 0) { void reload(); return; }
    requestVersion.current++;
    setLoading(true);
    setRequest({ q, page: 0 });
  }
  const first = data && data.userCount > 0 ? data.page * data.limit + 1 : 0;
  const last = data ? Math.min(data.page * data.limit + data.users.length, data.userCount) : 0;

  return <SettingsPage title="Individual settings" description="Users follow their role defaults unless you add a custom exception. Choose “Use role defaults” to remove an exception." loading={loading} error={error} onRefresh={() => void reload()}>
    <section className={box} aria-busy={loading}>
      <form className="flex max-w-lg gap-2" onSubmit={submitSearch}><Input aria-label="Search referral users" placeholder="Name or username…" value={search} onChange={event => setSearch(event.target.value)} /><Button type="submit" variant="outline"><Search className="mr-2 h-4 w-4" />Search</Button></form>
      {loading && <p role="status" className="mt-4 text-sm text-muted-foreground">Loading users…</p>}
      {data && <>
        <div className="mt-5 overflow-x-auto"><table className={`${table} min-w-[760px]`}><thead><tr><th>User</th><th>Settings</th><th>Effective reward</th><th>Link</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{data.users.map(item => <tr key={item.id}><td><p className="font-medium">{item.firstName} {item.lastName}</p><p className="text-xs text-muted-foreground">{item.username} · {referralRoleLabel[item.referralRole]}</p></td><td><span className={`rounded-full px-2 py-1 text-xs ${item.useRoleDefaults ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700"}`}>{item.useRoleDefaults ? "Uses role defaults" : "Custom settings"}</span></td><td>{referralRuleLabel(item.profile)}{item.configurationIssue === "MISSING_DEALER_PLAN" && <p className="mt-1 max-w-xs text-xs text-amber-700">No active earnings plan assigned. Assign a plan before referred orders are placed, or choose a percentage.</p>}</td><td><span className={`rounded-full px-2 py-1 text-xs ${item.profile?.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.profile?.enabled ? "Available" : "Disabled"}</span></td><td className="text-right"><Button variant="outline" size="sm" disabled={loading} onClick={() => setUser(item)}>Edit settings</Button></td></tr>)}</tbody></table>{!data.users.length && !loading && <p className="py-6 text-sm text-muted-foreground">No matching users.</p>}</div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><p>Showing {first}–{last} of {data.userCount} users · {data.limit} per page</p><nav aria-label="User pages" className="flex items-center gap-3"><Button variant="outline" size="sm" disabled={loading || data.page === 0} onClick={() => changePage(data.page - 1)}>Previous</Button><span>Page {data.page + 1} of {Math.max(1, data.pages)}</span><Button variant="outline" size="sm" disabled={loading || data.page + 1 >= data.pages} onClick={() => changePage(data.page + 1)}>Next</Button></nav></div>
      </>}
    </section>
    <Dialog open={Boolean(user)} onOpenChange={open => { if (!open) setUser(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Reward settings · {user?.firstName} {user?.lastName}</DialogTitle><DialogDescription>Use this user&apos;s role defaults or set an individual exception.</DialogDescription></DialogHeader>{user && <ReferralProfileEditor key={user.id} user={user} roleDefault={data?.roleDefaults.find(rule => rule.role === user.referralRole)} onCancel={() => setUser(null)} onDone={async () => { setUser(null); await reload(); }} />}</DialogContent></Dialog>
  </SettingsPage>;
}
