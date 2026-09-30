"use client";

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil, Loader2, Search, Power, PowerOff, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createNetworkAccount, updateNetworkMarkup, type DealerNetwork, type NetworkMember } from '@/app/api/dealer-network.api';
import { NetworkBusinessDialog } from './network-business-dialog';
import { DealerNetworkTree } from './dealer-network-tree';
import { normalizeUSPhoneToE164 } from '@/lib/validators-phone';

export function DealerNetworkClient({ initialData, currentUserId, isAdmin }: {
  initialData: DealerNetwork; currentUserId: number; isAdmin: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<NetworkMember | null>(null);
  const [suspending, setSuspending] = useState<NetworkMember | null>(null);
  const [parentId, setParentId] = useState(String(currentUserId));
  const [mode, setMode] = useState<'INTERNAL' | 'EXTERNAL'>('EXTERNAL');
  const [earningsMode, setEarningsMode] = useState<'AVAILABLE_PROFIT' | 'MARKUP'>('MARKUP');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const parents = initialData.members.filter(member => member.level < 3 && member.isActive && !member.networkSalesBlocked);
  const parent = initialData.members.find(member => member.id === (editing?.parentDealerId ?? Number(parentId)));
  const allowInternal = parent?.level === 1 && parent.dealerMode === "INTERNAL";
  const effectiveMode = allowInternal ? mode : "EXTERNAL";
  const newLabel = parent?.level === 2 ? 'distributor' : 'subdealer';
  const members = initialData.members.filter(member => member.id !== currentUserId &&
    `${member.username} ${member.firstName} ${member.lastName} ${member.parentName ?? ''} ${member.levelLabel}`.toLowerCase().includes(search.toLowerCase()));

  function close() { if (!inFlight.current) { setCreating(false); setEditing(null); setError(''); } }
  function editTerms(member: NetworkMember) { setMode(member.dealerMode); setEarningsMode(member.subdealerEarningsMode ?? 'MARKUP'); setError(''); setEditing(member); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? '').trim();
    inFlight.current = true; setBusy(true); setError('');
    try {
      const taxPercent = Number(value('taxPercent'));
      if (!value('taxPercent') || !Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100)
        throw new Error('Enter a sales tax between 0% and 100%.');
      const terms = { markupPercent: Number(value('markupPercent')), taxPercent, dealerMode: effectiveMode,
        ...(effectiveMode === 'INTERNAL' ? { subdealerEarningsMode: earningsMode,
          subdealerEarningsPercent: earningsMode === 'MARKUP' ? 100 : Number(value('subdealerEarningsPercent')) } : {}) };
      if (editing) {
        await updateNetworkMarkup(editing.id, terms);
        toast.success('Account terms updated. Existing estimates keep their prices and taxes until recalculated.');
      } else {
        const phone = normalizeUSPhoneToE164(value('phone'));
        if (!phone || !/^\+1\d{10}$/.test(phone)) throw new Error('Enter a valid US phone number.');
        await createNetworkAccount({
          username: value('username'), firstName: value('firstName'), lastName: value('lastName'),
          email: value('email'), phone, password: String(data.get('password') ?? ''),
          street: value('street'), city: value('city'), state: value('state').toUpperCase(), postalCode: value('postalCode'),
          ...terms,
          ...(isAdmin ? { parentDealerId: Number(parentId) } : {}),
        });
        toast.success('Account created.');
      }
      setCreating(false); setEditing(null); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'The account could not be saved.'); }
    finally { inFlight.current = false; setBusy(false); }
  }

  return <div className="w-full px-4 py-6 md:px-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-4xl font-bold">{initialData.level === null ? 'Dealer network' : 'My dealers'}</h1>
      {initialData.canCreate && <Button variant="green" onClick={() => {
        setParentId(String(isAdmin ? parents[0]?.id ?? '' : currentUserId)); setMode('EXTERNAL'); setEarningsMode('MARKUP'); setError(''); setCreating(true);
      }}><Plus className="mr-2 h-4 w-4" />{isAdmin ? 'New account' : `New ${initialData.level === 'Subdealer' ? 'distributor' : 'subdealer'}`}</Button>}
    </div>
    {isAdmin || initialData.level !== null ? <DealerNetworkTree members={initialData.members.filter(member => member.id !== currentUserId)} currentUserId={currentUserId} showMarkupSource={isAdmin} busy={busy} onEdit={editTerms} onBusiness={setSuspending} /> : <>
    <div className="mb-4 flex max-w-sm items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><Input aria-label="Search dealers" placeholder="Search accounts..." value={search} onChange={event => setSearch(event.target.value)} /></div>
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr>
        {['Account', 'Level', 'Parent', 'Email', 'Material markup', 'Sales tax', 'Status', ''].map(label => <th key={label} className="p-4 font-medium">{label}</th>)}
      </tr></thead><tbody>
        {members.map(member => <tr key={member.id} className="border-t">
          <td className="p-4"><Link className="font-medium hover:underline" href={`/estimates?owner=${member.id}`}>{member.username}</Link><div className="text-muted-foreground">{member.firstName} {member.lastName}</div></td>
          <td className="p-4">{member.levelLabel}{(member.level === 1 || member.level === 2 && member.parentDealerMode === 'INTERNAL') && <div className="text-xs text-muted-foreground">{member.dealerMode === 'INTERNAL' ? 'Internal' : 'External'}</div>}</td>
          <td className="p-4">{member.parentName ?? '—'}</td><td className="p-4">{member.email ?? '—'}</td>
          <td className="p-4 tabular-nums">{member.markupPercent != null && member.parentDealerId ? `${member.markupPercent}%` : '—'}</td>
          <td className="p-4 tabular-nums">{member.taxPercent != null ? `${member.taxPercent}%` : '—'}</td>
          <td className="p-4"><span className={`rounded-full px-2 py-1 text-xs ${!member.isActive || member.networkAccessBlocked ? 'bg-slate-100 text-slate-600' : member.networkSalesBlocked ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{!member.isActive || member.networkAccessBlocked ? 'Inactive' : member.networkSalesBlocked ? 'Business paused' : 'Active'}</span>{member.businessAction?.status === 'PENDING' && <span className="mt-2 block text-xs text-amber-700">{member.businessAction.suspended ? 'Pause' : 'Resume'} requested</span>}</td>
          <td className="p-4">{member.canManage && <div className="flex gap-2">
            {member.parentDealerId && <Button variant="outline" size="icon" className="h-8 w-8" aria-label={`Edit terms for ${member.username}`} title="Edit terms" onClick={() => editTerms(member)}><Pencil className="h-4 w-4" /></Button>}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={busy || (!member.canSuspend && !member.canRequestSuspension && !member.canReviewSuspension && !member.canWithdrawRequest)} aria-label={`Manage new business for ${member.username}`} title={member.businessAction?.status === 'PENDING' ? (member.canReviewSuspension ? 'Review request' : 'View request') : member.canSuspend ? (member.networkSuspended ? 'Resume new business' : 'Pause new business') : member.networkSuspended ? 'Request to resume new business' : 'Request to pause new business'} onClick={() => setSuspending(member)}>
              {member.businessAction?.status === 'PENDING' ? <ClipboardCheck className="h-4 w-4 text-amber-600" /> : member.networkSuspended ? <Power className="h-4 w-4 text-emerald-600" /> : <PowerOff className="h-4 w-4 text-red-600" />}
            </Button>
          </div>}</td>
        </tr>)}
        {!members.length && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No accounts found.</td></tr>}
      </tbody></table>
    </div>
    </>}
    <Dialog open={creating || !!editing} onOpenChange={open => { if (!open) close(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" showCloseButton={!busy} aria-describedby={undefined}>
        <DialogHeader><DialogTitle>{editing ? `Account terms · ${editing.username}` : `New ${newLabel}`}</DialogTitle></DialogHeader>
        <form key={editing?.id ?? 'new'} className="space-y-4" onSubmit={event => void submit(event)}>
          <fieldset disabled={busy} className="space-y-4">
            {!editing && <>
              {isAdmin && <label className="block text-sm font-medium">Parent dealer<select className="mt-1 h-10 w-full rounded-md border bg-white px-3" value={parentId} onChange={event => setParentId(event.target.value)} required><option value="">Select account</option>{parents.map(member => <option key={member.id} value={member.id}>{member.username} · {member.levelLabel}</option>)}</select></label>}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="firstName" label="First name" maxLength={100} /><Field name="lastName" label="Last name" maxLength={100} />
                <Field name="username" label="Username" minLength={4} maxLength={24} pattern="[A-Za-z][A-Za-z0-9._\-]{2,22}[A-Za-z0-9]" autoComplete="off" />
                <Field name="password" label="Password" type="password" minLength={8} maxLength={255} autoComplete="new-password" />
                <Field name="email" label="Email" type="email" maxLength={150} />
                <Field name="phone" label="Phone" type="tel" placeholder="(305) 555-1234" />
              </div>
              <Field name="street" label="Street address" maxLength={150} />
              <div className="grid grid-cols-3 gap-3"><Field name="city" label="City" maxLength={100} /><Field name="state" label="State" maxLength={2} placeholder="FL" /><Field name="postalCode" label="ZIP code" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} /></div>
            </>}
            {allowInternal && <label className="block text-sm font-medium">Subdealer type<select className="mt-1 h-10 w-full rounded-md border bg-white px-3" value={mode} onChange={event => setMode(event.target.value as 'INTERNAL' | 'EXTERNAL')}><option value="EXTERNAL">External</option><option value="INTERNAL">Internal</option></select></label>}
            {effectiveMode === 'INTERNAL' && <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
              <label className="block text-sm font-medium">Material earnings<select className="mt-1 h-10 w-full rounded-md border bg-white px-3" value={earningsMode} onChange={event => setEarningsMode(event.target.value as 'AVAILABLE_PROFIT' | 'MARKUP')}><option value="MARKUP">Full resale markup</option><option value="AVAILABLE_PROFIT">Percentage of available profit</option></select></label>
              {earningsMode === 'AVAILABLE_PROFIT' && <Field name="subdealerEarningsPercent" label="Earnings (%)" type="number" min={0} max={100} step="0.0001" defaultValue={editing?.subdealerEarningsPercent ?? '50'} />}
            </div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="markupPercent" label="Material markup (%)" type="number" min={0} max={1000} step="0.0001" defaultValue={editing?.markupPercent ?? '0'} />
              <Field name="taxPercent" label="Sales tax (%)" type="number" min={0} max={100} step="0.01" defaultValue={editing?.taxPercent ?? initialData.defaultTaxPercent} />
            </div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={close} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy || (!editing && isAdmin && !parentId)}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? 'Save' : 'Create account'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
    {suspending && <NetworkBusinessDialog member={suspending} onClose={() => setSuspending(null)} onChanged={() => { setSuspending(null); router.refresh(); }} />}
  </div>;
}

function Field({ label, name, ...props }: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return <label className="block text-sm font-medium">{label}<Input className="mt-1" name={name} required {...props} /></label>;
}
