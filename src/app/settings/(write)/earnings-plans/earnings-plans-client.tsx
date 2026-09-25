"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";
import { deleteEarningsPlan, saveEarningsPlan } from "@/app/api/earnings-plans.api";
import { earningsBasisDescriptions, earningsBasisLabels, type DealerEarningsBasis, type DealerEarningsPlan, type SaveEarningsPlan } from "@/lib/dealer-earnings";

export function EarningsPlansClient({ initialPlans }: { initialPlans: DealerEarningsPlan[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [editing, setEditing] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [basis, setBasis] = useState<DealerEarningsBasis>("DEALER_MARKUP");
  const [percent, setPercent] = useState("100");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<DealerEarningsPlan | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const newPlanButtonRef = useRef<HTMLButtonElement | null>(null);
  const open = (trigger: HTMLButtonElement, plan?: DealerEarningsPlan) => {
    openerRef.current = trigger;
    setEditing(plan?.id ?? null);
    setName(plan?.name ?? "");
    setBasis(plan?.basis ?? "DEALER_MARKUP");
    setPercent(plan?.percent == null ? "100" : String(Number(plan.percent)));
    setIsDialogOpen(true);
  };
  const persist = async (data: SaveEarningsPlan, id?: number) => {
    setBusy(true);
    try {
      const saved = await saveEarningsPlan(data, id);
      setPlans(current => current.some(plan => plan.id === saved.id)
        ? current.map(plan => plan.id === saved.id ? saved : plan) : [...current, saved]);
      setIsDialogOpen(false);
      toast.success("Earnings plan saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the earnings plan.");
    } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleting || busy) return;
    const id = deleting.id;
    setBusy(true);
    try {
      await deleteEarningsPlan(id);
      setPlans(current => current.filter(plan => plan.id !== id));
      toast.success("Earnings plan deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the earnings plan.");
    } finally {
      setDeleting(null);
      setBusy(false);
    }
  };
  const visible = plans.filter(plan =>
    (status === "all" || plan.isActive === (status === "active")) &&
    `${plan.name} ${earningsBasisLabels[plan.basis]} ${Number(plan.percent)}`.toLowerCase().includes(search.trim().toLowerCase()),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">Internal Dealer Earnings Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create named plans and assign them to internal dealers in <Link href="/settings/users" className="underline">Users</Link>.</p>
      </div>
      <Button ref={newPlanButtonRef} disabled={busy} onClick={event => open(event.currentTarget)}>New earnings plan</Button>
    </div>
    <Dialog open={isDialogOpen} onOpenChange={isOpen => {
      if (!busy) setIsDialogOpen(isOpen);
    }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" showCloseButton={!busy} onCloseAutoFocus={event => {
        event.preventDefault();
        (openerRef.current?.isConnected ? openerRef.current : newPlanButtonRef.current)?.focus();
      }}>
        <DialogHeader>
          <DialogTitle>{editing == null ? "New earnings plan" : "Edit earnings plan"}</DialogTitle>
          <DialogDescription>Set the earnings base and percentage for internal dealers.</DialogDescription>
        </DialogHeader>
        <form onSubmit={event => {
          event.preventDefault();
          if (busy) return;
          if (!/^\d{1,3}(?:\.\d{1,4})?$/.test(percent) || Number(percent) > 100) {
            toast.error("Enter a percentage from 0 to 100, with up to 4 decimal places."); return;
          }
          void persist({ name: name.trim(), basis, percent, isActive: plans.find(p => p.id === editing)?.isActive ?? true }, editing ?? undefined);
        }}>
          <fieldset className="space-y-4" disabled={busy}>
            <label className="block space-y-1"><span className="text-sm font-medium">Plan name</span>
              <Input required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="Example: Sales team — real profit 20%" />
            </label>
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <label className="block space-y-1"><span className="text-sm font-medium">Earnings base</span>
                <select className="h-10 w-full rounded-md border bg-white px-2 text-sm" value={basis} onChange={event => setBasis(event.target.value as DealerEarningsBasis)}>
                  {Object.entries(earningsBasisLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block space-y-1"><span className="text-sm font-medium">Percentage (%)</span>
                <Input required type="number" min="0" max="100" step="0.0001" value={percent} onChange={event => setPercent(event.target.value)} />
              </label>
            </div>
            <p className="text-sm text-muted-foreground">{earningsBasisDescriptions[basis]}</p>
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Dealer earnings = {percent || "…"}% × {earningsBasisLabels[basis].toLowerCase()}</p>
            <p className="text-xs text-muted-foreground">Material only, after discounts and before sales tax. Active estimates update to the assigned plan until the first checkout, payment, or order. After that, they keep their saved earnings plan.</p>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save plan"}</Button>
            </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
    <DeleteConfirmationDialog
      isOpen={deleting !== null}
      onClose={() => setDeleting(null)}
      onConfirm={remove}
      title="Delete earnings plan?"
      description={`Permanently delete "${deleting?.name ?? ""}"? Orders and estimates with a started checkout or payment keep their saved earnings plan.`}
      confirmText="Delete plan"
    />
    <div className="flex flex-wrap gap-3">
      <Input className="max-w-md" aria-label="Search earnings plans" placeholder="Search plans…" value={search} onChange={event => setSearch(event.target.value)} />
      <select aria-label="Plan status" className="rounded-md border bg-white px-2 text-sm" value={status} onChange={event => setStatus(event.target.value)}>
        <option value="all">All plans</option><option value="active">Active</option><option value="inactive">Inactive</option>
      </select>
    </div>
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50"><tr>{["Plan", "Earnings base", "Percentage", "Internal dealers", "Status", "Actions"].map(label => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
        <tbody>{visible.map(plan => <tr key={plan.id} className="border-t">
          <td className="px-4 py-3 font-medium">{plan.name}</td>
          <td className="px-4 py-3">{earningsBasisLabels[plan.basis]}</td>
          <td className="px-4 py-3 tabular-nums">{Number(plan.percent)}%</td>
          <td className="px-4 py-3">{plan._count?.users ?? 0}</td>
          <td className="px-4 py-3">
            <label className="inline-flex items-center gap-2" title={plan.isActive && (plan._count?.users ?? 0) > 0 ? "Reassign its dealers before deactivating." : undefined}>
              <Switch checked={plan.isActive} disabled={busy || (plan.isActive && (plan._count?.users ?? 0) > 0)}
                aria-label={`Active status for ${plan.name}`}
                onCheckedChange={isActive => void persist({ name: plan.name, basis: plan.basis, percent: plan.percent, isActive }, plan.id)} />
              <span>{plan.isActive ? "Active" : "Inactive"}</span>
            </label>
          </td>
          <td className="px-4 py-3"><div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={event => open(event.currentTarget, plan)}>Edit</Button>
            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" disabled={busy || (plan._count?.users ?? 0) > 0}
              title={(plan._count?.users ?? 0) > 0 ? "Reassign its dealers before deleting." : "Permanently delete this plan."}
              onClick={() => setDeleting(plan)}>
              Delete
            </Button>
          </div></td>
        </tr>)}</tbody>
      </table>
      {!visible.length && <p className="p-6 text-sm text-muted-foreground">{plans.length ? "No matching plans." : "No earnings plans yet. Create your first plan to assign it to internal dealers."}</p>}
    </div>
  </div>;
}
