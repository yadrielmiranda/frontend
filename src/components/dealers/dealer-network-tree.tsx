"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronRight, ChevronsDownUp, ChevronsUpDown, ClipboardCheck, Network, Pencil, Power, PowerOff, Search, Store, X } from 'lucide-react';
import type { NetworkMember } from '@/app/api/dealer-network.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Branch = {
  member: NetworkMember;
  children: Branch[];
  subdealers: number;
  distributors: number;
  pending: number;
};

const levelStyles = {
  1: { Icon: Building2, icon: 'bg-blue-100 text-blue-700', badge: 'bg-blue-100/80 text-blue-800 ring-blue-200', row: 'bg-blue-50/50 hover:bg-blue-50', line: 'border-blue-300' },
  2: { Icon: Network, icon: 'bg-violet-100 text-violet-700', badge: 'bg-violet-50 text-violet-800 ring-violet-200', row: 'hover:bg-violet-50/50', line: 'border-violet-200' },
  3: { Icon: Store, icon: 'bg-teal-100 text-teal-700', badge: 'bg-teal-50 text-teal-800 ring-teal-200', row: 'hover:bg-teal-50/50', line: 'border-teal-200' },
};

function buildBranches(members: NetworkMember[]) {
  const nodes = new Map(members.map(member => [member.id, { member, children: [], subdealers: 0, distributors: 0, pending: 0 } as Branch]));
  const roots: Branch[] = [];
  for (const node of nodes.values()) {
    const parent = node.member.parentDealerId == null ? undefined : nodes.get(node.member.parentDealerId);
    // Conserva visibles las cuentas cuyo superior ya no aparece en el listado.
    if (parent && parent.member.level < node.member.level) parent.children.push(node);
    else roots.push(node);
  }
  const compare = (a: Branch, b: Branch) => a.member.username.localeCompare(b.member.username, 'en', { sensitivity: 'base', numeric: true });
  function count(branch: Branch) {
    branch.children.sort(compare);
    branch.pending = branch.member.businessAction?.status === 'PENDING' ? 1 : 0;
    for (const child of branch.children) {
      count(child);
      branch.subdealers += Number(child.member.level === 2) + child.subdealers;
      branch.distributors += Number(child.member.level === 3) + child.distributors;
      branch.pending += child.pending;
    }
  }
  roots.sort(compare).forEach(count);
  return roots;
}

function filterBranches(branches: Branch[], query: string, pendingOnly: boolean) {
  let matches = 0;
  function visit(branch: Branch, parentMatches: boolean): Branch | null {
    const { member } = branch;
    const searchMatches = !query || parentMatches || `${member.username} ${member.firstName} ${member.lastName} ${member.email ?? ''} ${member.levelLabel}`.toLowerCase().includes(query);
    const ownMatch = searchMatches && (!pendingOnly || member.businessAction?.status === 'PENDING');
    if (ownMatch) matches++;
    const children = branch.children.map(child => visit(child, searchMatches)).filter((child): child is Branch => child !== null);
    // Incluye los superiores como contexto cuando coincide una cuenta subordinada.
    return ownMatch || children.length ? { ...branch, children } : null;
  }
  return { roots: branches.map(branch => visit(branch, false)).filter((branch): branch is Branch => branch !== null), matches };
}

function businessStatus(member: NetworkMember) {
  if (!member.isActive) return { label: 'Inactive', color: 'bg-slate-100 text-slate-600 ring-slate-200' };
  if (member.networkAccessBlocked) return { label: 'Blocked by parent', color: 'bg-slate-100 text-slate-600 ring-slate-200' };
  if (member.networkSuspended) return { label: 'Business paused', color: 'bg-amber-50 text-amber-800 ring-amber-200' };
  if (member.networkSalesBlocked) return { label: 'Paused by parent', color: 'bg-amber-50 text-amber-800 ring-amber-200' };
  return { label: 'Active', color: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
}

export function DealerNetworkTree({ members, busy, onEdit, onBusiness, currentUserId, showMarkupSource = false }: {
  members: NetworkMember[];
  busy: boolean;
  onEdit: (member: NetworkMember) => void;
  onBusiness: (member: NetworkMember) => void;
  currentUserId?: number;
  showMarkupSource?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [collapsedResults, setCollapsedResults] = useState<Set<number>>(() => new Set());
  const branches = useMemo(() => buildBranches(members), [members]);
  const query = search.trim().toLowerCase();
  const filtering = Boolean(query) || pendingOnly;
  const visible = useMemo(() => filterBranches(branches, query, pendingOnly), [branches, query, pendingOnly]);
  const pendingCount = branches.reduce((sum, branch) => sum + branch.pending, 0);
  const branchIds: number[] = [];
  function collectBranches(branch: Branch) {
    if (branch.children.length) branchIds.push(branch.member.id);
    branch.children.forEach(collectBranches);
  }
  visible.roots.forEach(collectBranches);
  const isExpanded = (id: number) => filtering ? !collapsedResults.has(id) : expanded.has(id);
  const anyExpanded = branchIds.some(isExpanded);
  const allExpanded = branchIds.length > 0 && branchIds.every(isExpanded);

  function updateSearch(value: string) { setSearch(value); setCollapsedResults(new Set()); }
  function toggle(id: number) {
    const update = (previous: Set<number>) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    };
    if (filtering) setCollapsedResults(update); else setExpanded(update);
  }
  function expandAll(open: boolean) {
    if (filtering) setCollapsedResults(new Set(open ? [] : branchIds));
    else setExpanded(new Set(open ? branchIds : []));
  }
  function clearFilters() { setSearch(''); setPendingOnly(false); setCollapsedResults(new Set()); }

  const rows: { branch: Branch; depth: number }[] = [];
  function collectRows(branch: Branch, depth: number) {
    rows.push({ branch, depth });
    if (isExpanded(branch.member.id)) branch.children.forEach(child => collectRows(child, depth + 1));
  }
  visible.roots.forEach(branch => collectRows(branch, 0));

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full sm:max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input className="pl-9 pr-9" aria-label="Search dealer network" placeholder="Search accounts or email..." value={search} onChange={event => updateSearch(event.target.value)} />
        {search && <button type="button" aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2" onClick={() => updateSearch('')}><X className="h-4 w-4" /></button>}
      </div>
      <Button variant="outline" aria-pressed={pendingOnly} disabled={!pendingCount && !pendingOnly} className={pendingOnly ? 'border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200 hover:text-amber-900' : pendingCount ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900' : ''} onClick={() => { setPendingOnly(value => !value); setCollapsedResults(new Set()); }}>
        <ClipboardCheck className="h-4 w-4" />Pending requests<span className="rounded-full bg-white/80 px-2 py-0.5 text-xs tabular-nums">{pendingCount}</span>
      </Button>
    </div>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2">
        <p aria-live="polite" className="text-sm text-slate-500">{filtering ? `${visible.matches} matching ${visible.matches === 1 ? 'account' : 'accounts'}` : `${members.length} ${members.length === 1 ? 'account' : 'accounts'}`}</p>
        <div className="flex items-center gap-1">
          {filtering && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}
          <Button variant="ghost" size="sm" className="text-slate-600" disabled={!branchIds.length || allExpanded} onClick={() => expandAll(true)}><ChevronsUpDown className="h-4 w-4" />Expand all</Button>
          <Button variant="ghost" size="sm" className="text-slate-600" disabled={!anyExpanded} onClick={() => expandAll(false)}><ChevronsDownUp className="h-4 w-4" />Collapse all</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <caption className="sr-only">Dealer network grouped by dealer, subdealer and distributor</caption>
          <thead className="bg-slate-50 text-left text-slate-600"><tr>
            {['Account', 'Level', 'Email', 'Material markup', 'Sales tax', 'Status', 'Actions'].map(label => <th key={label} scope="col" className={`whitespace-nowrap px-4 py-3 font-medium ${label === 'Actions' ? 'text-right' : ''}`}>{label}</th>)}
          </tr></thead>
          <tbody>
            {rows.map(({ branch, depth }) => {
              const { member } = branch;
              const style = levelStyles[member.level as keyof typeof levelStyles] ?? levelStyles[3];
              const { Icon } = style;
              const status = businessStatus(member);
              const hasChildren = branch.children.length > 0;
              const open = isExpanded(member.id);
              const ownPending = member.businessAction?.status === 'PENDING';
              const pendingBelow = branch.pending - Number(ownPending);
              const counts = [branch.subdealers ? `${branch.subdealers} ${branch.subdealers === 1 ? 'subdealer' : 'subdealers'}` : '', branch.distributors ? `${branch.distributors} ${branch.distributors === 1 ? 'distributor' : 'distributors'}` : ''].filter(Boolean).join(' · ');
              return <tr key={member.id} className={`border-t border-slate-200/80 transition-colors ${style.row}`}>
                <td className={`border-l-2 py-4 pr-4 ${style.line}`} style={{ paddingLeft: `${12 + depth * 28}px` }}>
                  <div className="flex min-w-[240px] items-start gap-2">
                    {hasChildren ? <button type="button" aria-label={`${open ? 'Collapse' : 'Expand'} ${member.username}`} aria-expanded={open} className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500" onClick={() => toggle(member.id)}><ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} /></button> : <span aria-hidden="true" className="w-7 shrink-0" />}
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.icon}`}><Icon aria-hidden="true" className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <Link className="font-semibold text-slate-900 hover:underline" href={`/estimates?owner=${member.id}`}>{member.username}</Link>
                      <div className="text-xs leading-5 text-slate-500">{member.firstName} {member.lastName}</div>
                      {(counts || pendingBelow > 0) && <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        {counts && <span>{counts}</span>}
                        {pendingBelow > 0 && <span title="Pending requests in this branch" className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800"><ClipboardCheck className="h-3 w-3" />{pendingBelow} {pendingBelow === 1 ? 'request' : 'requests'}</span>}
                      </div>}
                      {depth === 0 && member.parentDealerId != null && member.parentDealerId !== currentUserId && member.parentName && <div className="text-xs text-slate-500">Parent: {member.parentName}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style.badge}`}>{member.levelLabel}</span>{(member.level === 1 || member.level === 2 && member.parentDealerMode === 'INTERNAL') && <div className="mt-1 pl-1 text-xs text-slate-500">{member.dealerMode === 'INTERNAL' ? 'Internal' : 'External'}</div>}</td>
                <td className="px-4 py-4 text-slate-600">{member.email ?? '—'}</td>
                <td className="px-4 py-4 text-slate-700">{member.markupPercent != null ? <>
                  <span className="font-medium tabular-nums">{member.markupPercent}%</span>
                  {showMarkupSource && <div className="mt-1 text-xs text-slate-500">From {member.parentDealerId == null ? 'Authentic' : member.parentName ?? 'parent account'}</div>}
                </> : <span className="text-slate-400">—</span>}</td>
                <td className="px-4 py-4 text-slate-700">{member.taxPercent != null ? <>
                  <span className="font-medium tabular-nums">{member.taxPercent}%</span>
                  {showMarkupSource && <div className="mt-1 text-xs text-slate-500">From {member.parentDealerId == null ? 'Authentic' : member.parentName ?? 'parent account'}</div>}
                </> : <span className="text-slate-400">—</span>}</td>
                <td className="px-4 py-4"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.color}`}>{status.label}</span>{ownPending && <span className="mt-2 block whitespace-nowrap text-xs font-medium text-amber-700">{member.businessAction!.suspended ? 'Pause' : 'Resume'} requested</span>}</td>
                <td className="px-4 py-4">{member.canManage && <div className="flex justify-end gap-2">
                  {member.parentDealerId && <Button variant="outline" size="icon" className="h-8 w-8 text-slate-600" aria-label={`Edit terms for ${member.username}`} title="Edit terms" disabled={busy} onClick={() => onEdit(member)}><Pencil className="h-4 w-4" /></Button>}
                  <Button variant="outline" size="icon" className={`h-8 w-8 ${ownPending ? 'border-amber-200 bg-amber-50 text-amber-700' : member.networkSuspended ? 'text-emerald-600' : 'text-red-500'}`} disabled={busy || (!member.canSuspend && !member.canRequestSuspension && !member.canReviewSuspension && !member.canWithdrawRequest)} aria-label={`Manage new business for ${member.username}`} title={ownPending ? (member.canReviewSuspension ? 'Review request' : 'View request') : member.canSuspend ? (member.networkSuspended ? 'Resume new business' : 'Pause new business') : member.networkSuspended ? 'Request to resume new business' : 'Request to pause new business'} onClick={() => onBusiness(member)}>
                    {ownPending ? <ClipboardCheck className="h-4 w-4" /> : member.networkSuspended ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                  </Button>
                </div>}</td>
              </tr>;
            })}
            {!rows.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">{pendingOnly ? 'No pending requests match your search.' : 'No accounts found.'}{filtering && <div className="mt-2"><Button variant="link" onClick={clearFilters}>Clear filters</Button></div>}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}
