"use client";

import { useId, useRef, useState } from 'react';
import { Copy, Link2 } from 'lucide-react';
import { isApiError } from '@/app/api/_base';
import { getMemberInvitationLink, type NetworkMember } from '@/app/api/dealer-network.api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { copyNetworkInvitation, networkInvitationUrl } from './network-invitation-link';

export function MemberInvitationLink({ member }: { member: NetworkMember }) {
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const loading = useRef(false);
  const linkInput = useRef<HTMLInputElement>(null);
  const inputId = useId();

  async function load() {
    if (loading.current) return;
    loading.current = true;
    setLink('');
    setError('');
    try {
      const { token } = await getMemberInvitationLink(member.id);
      setLink(networkInvitationUrl(token));
    } catch (err) {
      setError(isApiError(err) && err.status === 404 ? 'This invitation link is unavailable.'
        : 'Could not load the invitation link. Please try again.');
    } finally {
      loading.current = false;
    }
  }

  return <Dialog onOpenChange={open => { if (open) void load(); }}>
    <DialogTrigger asChild>
      <Button variant="outline" size="sm" aria-label={`View invitation link for ${member.username}`}><Link2 aria-hidden="true" />View link</Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Invitation link</DialogTitle>
        <DialogDescription>{member.firstName} {member.lastName} · {member.username}</DialogDescription>
      </DialogHeader>
      {link ? <div className="min-w-0 space-y-2">
        <label className="text-sm font-medium" htmlFor={inputId}>Registration link</label>
        <Input ref={linkInput} id={inputId} value={link} readOnly onFocus={event => event.target.select()} />
      </div> : error ? <p role="alert" className="text-sm text-red-600">{error}</p>
        : <p role="status" className="text-sm text-muted-foreground">Loading invitation link.</p>}
      <DialogFooter>
        <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
        {error ? <Button onClick={() => void load()}>Try again</Button> :
          <Button disabled={!link} onClick={() => void copyNetworkInvitation(linkInput.current)}><Copy aria-hidden="true" />Copy link</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
