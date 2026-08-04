import type { InstallationJob } from "@/lib/types";
import { formatMoney } from "@/lib/formatters";
import {
  paidBaseFor,
  paidInstallationCredit,
  titleCase,
} from "@/lib/installation-flow";

export function InstallationQuoteSummary({ job }: { job: InstallationJob }) {
  const quote = job.quotes[0];
  if (!quote) return null;

  const materialSubtotal = Number(job.estimate.priceT);
  const materialTax = Number(job.estimate.taxAmount);
  const materialTotal = Number(job.estimate.totalPayable);
  const installationTotal = Number(quote.total);
  const permitFee = job.permit ? Number(job.permit.permitFeeSnapshot) : 0;
  const cityFee =
    job.permit?.cityFee == null ? null : Number(job.permit.cityFee);
  const depositPaid = paidBaseFor(job, "INSTALLATION_DEPOSIT");
  const canceled = job.status === "CANCELED";
  const knownProjectTotal = canceled
    ? materialTotal + depositPaid
    : materialTotal + installationTotal + permitFee + (cityFee ?? 0);
  const installationBalance = Math.max(
    0,
    installationTotal - paidInstallationCredit(job),
  );

  return (
    <section className="mt-8 border-t border-slate-300 pt-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Installation Quote · Version {quote.version}
          </h2>
          <p className="text-xs text-slate-500">
            {titleCase(quote.status)} · {titleCase(quote.approvalReason)} ·
            Profile: {quote.profileNameSnapshot}
          </p>
        </div>
        <strong>{formatMoney(Number(quote.total))}</strong>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left uppercase text-slate-500">
            <tr>
              <th className="p-2">Service</th>
              <th className="p-2">Origin</th>
              <th className="p-2 text-right">Rate</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((line) => (
              <tr key={line.id} className="border-t border-slate-200">
                <td className="p-2">
                  <span className="font-medium">
                    {line.serviceNameSnapshot}
                  </span>
                  {line.componentLabel && (
                    <span className="block text-slate-500">
                      {line.componentLabel}
                    </span>
                  )}
                </td>
                <td className="p-2">{titleCase(line.origin)}</td>
                <td className="p-2 text-right">
                  {formatMoney(Number(line.rate))}
                </td>
                <td className="p-2 text-right">
                  {Number(line.billableQuantity).toFixed(2)} ×{" "}
                  {line.occurrences}
                </td>
                <td className="p-2 text-right font-medium">
                  {formatMoney(Number(line.adjustedAmount))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto mt-3 grid max-w-sm grid-cols-2 gap-1 text-xs">
        <span className="text-slate-500">Material subtotal</span>
        <span className="text-right">{formatMoney(materialSubtotal)}</span>
        <span className="text-slate-500">Material tax</span>
        <span className="text-right">{formatMoney(materialTax)}</span>
        <span className="font-medium">Material total</span>
        <span className="text-right font-medium">
          {formatMoney(materialTotal)}
        </span>
        <span className="mt-2 text-slate-500">Installation subtotal</span>
        <span className="mt-2 text-right">
          {formatMoney(Number(quote.adjustedSubtotal))}
        </span>
        {Number(quote.serviceMinimumAdjustment) > 0 && (
          <>
            <span className="text-slate-500">Service minimum adjustment</span>
            <span className="text-right">
              {formatMoney(Number(quote.serviceMinimumAdjustment))}
            </span>
          </>
        )}
        {Number(quote.minimumAdjustment) > 0 && (
          <>
            <span className="text-slate-500">
              Minimum installation total adjustment
            </span>
            <span className="text-right">
              {formatMoney(Number(quote.minimumAdjustment))}
            </span>
          </>
        )}
        <strong>Installation total</strong>
        <strong className="text-right">
          {formatMoney(Number(quote.total))}
        </strong>
        {depositPaid > 0 && canceled ? (
          <>
            <span className="text-amber-700">
              Non-refundable deposit retained
            </span>
            <span className="text-right text-amber-700">
              {formatMoney(depositPaid)}
            </span>
          </>
        ) : depositPaid > 0 ? (
          <>
            <span className="text-emerald-700">
              Non-refundable deposit paid
            </span>
            <span className="text-right text-emerald-700">
              -{formatMoney(depositPaid)}
            </span>
            <strong>Installation balance</strong>
            <strong className="text-right">
              {formatMoney(installationBalance)}
            </strong>
          </>
        ) : (
          <>
            <span className="text-slate-500">
              Non-refundable deposit due
            </span>
            <span className="text-right">
              {formatMoney(Number(job.depositAmountSnapshot ?? 0))}
            </span>
          </>
        )}
        {job.permit && !canceled && (
          <>
            <span className="mt-2 text-slate-500">Permit Fee</span>
            <span className="mt-2 text-right">
              {formatMoney(Number(job.permit.permitFeeSnapshot))}
            </span>
            <span className="text-slate-500">City Fee</span>
            <span className="text-right">
              {job.permit.cityFee == null
                ? "Pending"
                : formatMoney(Number(job.permit.cityFee))}
            </span>
          </>
        )}
        <strong className="mt-2 border-t border-slate-300 pt-2">
          {canceled
            ? "Material + retained deposit"
            : cityFee == null && job.permit
            ? "Known project total"
            : "Project total"}
        </strong>
        <strong className="mt-2 border-t border-slate-300 pt-2 text-right">
          {formatMoney(knownProjectTotal)}
        </strong>
        {!canceled && cityFee == null && job.permit && (
          <span className="col-span-2 text-right text-[11px] text-amber-700">
            City Fee will be added after permit approval.
          </span>
        )}
        <span className="col-span-2 text-right text-[11px] text-slate-500">
          {canceled
            ? "Installation was canceled; the deposit remains non-refundable."
            : "The deposit is credited toward installation and is not added to the project total."}
        </span>
      </div>
    </section>
  );
}
