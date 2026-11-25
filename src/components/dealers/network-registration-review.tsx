"use client";

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { isApiError } from '@/app/api/_base';
import { reviewNetworkRegistration, type NetworkBusinessDetails, type NetworkRegistrationRequest } from '@/app/api/dealer-network.api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function RegistrationBusinessDetails({ details }: { details: NetworkBusinessDetails }) {
  return <>
    <div><dt className="text-muted-foreground">Company name</dt><dd>{details.companyName || 'Not provided'}</dd></div>
    <div><dt className="text-muted-foreground">Estimated monthly sales</dt><dd>{details.estimatedMonthlySales == null ? 'Not provided' : usd.format(Number(details.estimatedMonthlySales))}</dd></div>
    <div><dt className="text-muted-foreground">Years of experience</dt><dd>{details.yearsOfExperience}</dd></div>
  </>;
}

export function NetworkRegistrationReview({ request, onClose, onReviewed }: {
  request: NetworkRegistrationRequest;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  async function review(approve: boolean) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await reviewNetworkRegistration(request.id, approve);
      toast.success(approve ? `Account approved for ${request.username}.` : `Application rejected for ${request.username}.`);
      onReviewed();
    } catch (cause) {
      if (isApiError(cause) && cause.status === 404) {
        toast.info('This application is no longer pending.');
        onReviewed();
        return;
      }
      setError(cause instanceof Error ? cause.message : 'Could not review this application. Please try again.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const details = [
    ['Name', `${request.firstName} ${request.lastName}`],
    ['Username', request.username],
    ['Email', request.email],
    ['Phone', request.phone],
    ['Address', [request.street, request.addressLine2, request.city, `${request.state} ${request.postalCode}`].filter(Boolean).join(', ')],
    ['Current invitation markup', `${request.markupPercent}%`],
    ['Submitted', new Date(request.createdAt).toLocaleString()],
  ];

  return <Dialog open onOpenChange={open => { if (!open && !inFlight.current) onClose(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto" showCloseButton={!busy} aria-describedby={undefined}>
      <DialogHeader><DialogTitle>{request.level} application</DialogTitle></DialogHeader>
      <dl className="grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
        {details.map(([label, value]) => <div key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="break-words font-medium">{value}</dd>
        </div>)}
        <RegistrationBusinessDetails details={request} />
      </dl>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button variant="outline" disabled={busy} onClick={() => void review(false)}>Reject</Button>
        <Button disabled={busy} onClick={() => void review(true)}>Approve</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
