"use client";

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getNetworkInvitation, saveNetworkInvitation, type NetworkInvitation, type RegistrationLevel } from '@/app/api/dealer-network.api';
import { ReferralQr } from '@/components/referrals/referral-qr';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MARKUP_PERCENT_PATTERN, shiftDecimalString } from '@/lib/markup-decimal';
import { copyNetworkInvitation, networkInvitationUrl } from './network-invitation-link';

export function NetworkInviteButton({ level }: { level: RegistrationLevel }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [invitation, setInvitation] = useState<NetworkInvitation | null>(null);
  const [markup, setMarkup] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const linkInput = useRef<HTMLInputElement>(null);
  const title = `Invite ${level.toLowerCase()}`;
  const link = invitation?.token ? networkInvitationUrl(invitation.token) : '';

  async function load() {
    if (inFlight.current) return;
    inFlight.current = true;
    setOpen(true);
    setBusy(true);
    setError('');
    setInvitation(null);
    try {
      const result = await getNetworkInvitation();
      setInvitation(result);
      setMarkup(result.markupPercent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your invitation.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !invitation) return;
    const percentage = markup.trim();
    if (!MARKUP_PERCENT_PATTERN.test(percentage)) {
      setError('Enter a percentage with up to 8 integer digits and 16 decimal places.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await saveNetworkInvitation(shiftDecimalString(percentage, 0));
      setInvitation(result);
      setMarkup(result.markupPercent);
      toast.success(invitation.token ? 'Invitation markup updated.' : 'Invitation link created.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the invitation.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <>
    <Button variant="outline" onClick={() => void load()}><Link2 />{title}</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {!invitation && busy && <p role="status" className="text-sm text-muted-foreground">Loading invitation…</p>}
        {invitation && <form onSubmit={save} className="space-y-2">
          <label htmlFor="invitation-markup" className="text-sm font-medium">Material markup (%)</label>
          <div className="flex flex-wrap gap-2">
            <Input className="min-w-32 flex-1" id="invitation-markup" type="text" inputMode="decimal"
              required value={markup} disabled={busy} onChange={event => setMarkup(event.target.value)} />
            <Button type="submit" disabled={busy || !markup.trim() || (!!invitation.token && markup.trim() === invitation.markupPercent)}>
              {busy && <Loader2 className="animate-spin" />}{invitation.token ? 'Save markup' : 'Create link'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Each account uses this invitation’s markup at the time of approval.</p>
        </form>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {!invitation && !busy && <Button variant="outline" onClick={() => void load()}>Try again</Button>}
        {link && <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <label htmlFor="network-invitation-link" className="text-sm font-medium">Registration link</label>
            <div className="flex flex-wrap gap-2">
              <Input ref={linkInput} id="network-invitation-link" readOnly value={link} className="min-w-40 flex-1" onFocus={event => event.target.select()} />
              <Button variant="outline" onClick={() => void copyNetworkInvitation(linkInput.current)}><Copy />Copy link</Button>
            </div>
          </div>
          <ReferralQr url={link} label={`Scan to apply for a ${level.toLowerCase()} account`} filename={`${level.toLowerCase()}-registration-qr.svg`} />
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}
