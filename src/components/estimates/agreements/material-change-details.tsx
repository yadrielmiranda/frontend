import type { MaterialChangeSummary } from '@/app/api/contracts.api';
import { formatMoney } from '@/lib/formatters';

export function MaterialChangeDetails({ change, awaitingSignature }: {
  change: MaterialChangeSummary;
  awaitingSignature: boolean;
}) {
  const payment = awaitingSignature ? change.paymentPreview : null;
  return (
    <div aria-label="Material change and payment summary" className="space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-4">
      <h3 className="font-semibold">Material change summary</h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4"><dt>Previous project total</dt><dd>{formatMoney(Number(change.previousTotal))}</dd></div>
        <div className="flex justify-between gap-4 font-semibold"><dt>{Number(change.difference) < 0 ? 'Project reduction' : 'Additional project amount'}</dt><dd>{formatMoney(Number(change.difference))}</dd></div>
        <div className="flex justify-between gap-4 border-t pt-2"><dt>{change.incomplete ? 'Updated known project total' : 'Updated project total'}</dt><dd className="font-semibold">{formatMoney(Number(change.newTotal))}</dd></div>
        {payment && <>
          <div className="flex justify-between gap-4"><dt>Payments already made</dt><dd>{formatMoney(Number(payment.paid))}</dd></div>
          <div className="flex justify-between gap-4 border-t pt-2 text-base font-semibold"><dt>Amount payable after signing</dt><dd>{formatMoney(Number(payment.dueAfterSigning))}</dd></div>
          <div className="flex justify-between gap-4"><dt>Remaining scheduled balance</dt><dd>{formatMoney(Number(payment.remainingScheduled))}</dd></div>
        </>}
      </dl>
      <p className="text-sm text-muted-foreground">Previous payments remain credited. {awaitingSignature ? 'Review this change before signing. Signing does not charge your payment method.' : 'The current payment status is shown below when online payments are available.'}</p>
      {payment && <p className="text-xs text-muted-foreground">Payment processing fees, if applicable, are shown before checkout.</p>}
      {payment && Number(payment.dueAfterSigning) === 0 && <p className="text-sm text-muted-foreground">No payment becomes due immediately after signing. Any remaining balance follows the agreed payment schedule.</p>}
      {change.incomplete && <p className="text-sm text-amber-800">Pending charges are not included in this total.</p>}
    </div>
  );
}
