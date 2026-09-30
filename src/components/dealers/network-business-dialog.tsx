"use client";

import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { setNetworkSuspension, requestNetworkSuspension, reviewNetworkSuspension, withdrawNetworkSuspension, type NetworkMember } from '@/app/api/dealer-network.api';

export function NetworkBusinessDialog({ member, onClose, onChanged }: {
  member: NetworkMember; onClose: () => void; onChanged: () => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const previous = member.businessAction;
  const pending = previous?.status === 'PENDING' ? previous : null;
  const requesting = !member.canSuspend;
  const verb = member.networkSuspended ? 'resume' : 'pause';
  const validReason = reason.trim().length >= 3 && reason.trim().length <= 500;

  async function submit(action: 'change' | 'approve' | 'reject' | 'withdraw') {
    if (inFlight.current) return;
    if ((action === 'change' || action === 'reject') && !validReason) return;
    if (action === 'change' && !member.canSuspend && !member.canRequestSuspension) return;
    if ((action === 'approve' || action === 'reject') && (!pending || !member.canReviewSuspension)) return;
    if (action === 'withdraw' && (!pending || !member.canWithdrawRequest)) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      if (action === 'withdraw') {
        await withdrawNetworkSuspension(pending!.id);
        toast.success('Request withdrawn.');
      } else if (action === 'approve' || action === 'reject') {
        await reviewNetworkSuspension(pending!.id, action === 'approve', reason.trim() || undefined);
        toast.success(action === 'approve' ? 'Request approved.' : 'Request declined.');
      } else if (requesting) {
        await requestNetworkSuspension(member.id, !member.networkSuspended, reason.trim());
        toast.success('Request sent to administration.');
      } else {
        await setNetworkSuspension(member.id, !member.networkSuspended, reason.trim());
        toast.success(member.networkSuspended ? 'New business resumed.' : 'New business paused.');
      }
      onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : 'The request could not be completed.'); }
    finally { inFlight.current = false; setBusy(false); }
  }

  return <Dialog open onOpenChange={open => { if (!open && !inFlight.current) onClose(); }}>
    <DialogContent showCloseButton={!busy} aria-describedby={undefined}>
      <DialogHeader><DialogTitle>{pending ? `Request to ${pending.suspended ? 'pause' : 'resume'} new business` : `${requesting ? 'Request to ' : ''}${requesting ? verb : member.networkSuspended ? 'Resume' : 'Pause'} new business`} · {member.username}</DialogTitle></DialogHeader>
      {pending ? <div className="space-y-2 rounded-md border bg-slate-50 p-3 text-sm">
        <p className="text-muted-foreground">{pending.actorName} · {new Date(pending.createdAt).toLocaleString()}</p>
        <p className="whitespace-pre-wrap break-words">{pending.reason}</p>
        <p className="font-medium">Pending administrative review</p>
      </div> : <p className="text-sm text-muted-foreground">{requesting
        ? 'Administration must approve this request before the business status changes.'
        : member.networkSuspended
          ? 'New business can resume if the parent accounts are active. Separate pauses on distributors remain in place.'
          : 'Pause new business for this account and its distributors. Access, existing orders and projects with payments already received remain available.'}</p>}
      {(!pending || member.canReviewSuspension) && <label className="block text-sm font-medium">
        {pending ? 'Decision note (required to decline)' : 'Reason (internal)'}
        <Textarea className="mt-1" value={reason} onChange={event => setReason(event.target.value)} maxLength={500} disabled={busy} rows={3} />
      </label>}
      {!pending && previous && <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer">Last activity</summary>
        <div className="mt-2 space-y-1 break-words">
          <p>{previous.suspended ? 'Pause' : 'Resume'} · {previous.status.toLowerCase()}</p>
          <p>{previous.actorName} · {new Date(previous.createdAt).toLocaleString()}</p>
          <p className="whitespace-pre-wrap">{previous.reason}</p>
          {previous.reviewNote && <p className="whitespace-pre-wrap">Decision: {previous.reviewNote}</p>}
        </div>
      </details>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        {busy && <Loader2 className="h-4 w-4 animate-spin self-center" />}
        <Button variant="outline" disabled={busy} onClick={onClose}>Close</Button>
        {pending ? member.canReviewSuspension ? <>
          <Button variant="outline" disabled={busy || !validReason} onClick={() => void submit('reject')}>Decline</Button>
          <Button disabled={busy || !member.canSuspend || Boolean(reason.trim() && !validReason)} onClick={() => void submit('approve')}>Approve</Button>
        </> : member.canWithdrawRequest && <Button variant="outline" disabled={busy} onClick={() => void submit('withdraw')}>Withdraw request</Button>
        : <Button disabled={busy || !validReason} onClick={() => void submit('change')}>
          {requesting ? 'Submit request' : member.networkSuspended ? 'Resume new business' : 'Pause new business'}
        </Button>}
      </div>
    </DialogContent>
  </Dialog>;
}
