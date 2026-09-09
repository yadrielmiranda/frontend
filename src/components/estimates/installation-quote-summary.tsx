import { InstallationQuoteTable } from "@/components/installations/installation-quote-table";
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
  const showInternal = quote.pricingDetailsVisible === true;

  const discount = job.manualDiscountSummary;
  const installationTotal = Number(discount?.installation.total ?? quote.total);
  const depositPaid = paidBaseFor(job, "INSTALLATION_DEPOSIT");
  const installationPaymentsPaid = paidBaseFor(job, "INSTALLATION");
  const canceled = job.status === "CANCELED";
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
            {titleCase(quote.status)}
            {showInternal && <> · {titleCase(quote.approvalReason)} · Profile: {quote.profileNameSnapshot}</>}
          </p>
        </div>
        <strong>{formatMoney(installationTotal)}</strong>
      </div>

      <InstallationQuoteTable quote={quote} showInternal={showInternal} />

      <div className="ml-auto mt-3 grid max-w-sm grid-cols-2 gap-1 text-xs">
        {showInternal && (<>
        <span className="text-slate-500">Installation subtotal</span>
        <span className="text-right">
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
        </>)}
        {Number(discount?.installation.discount) > 0 && <><span className="text-emerald-700">Additional discount</span><span className="text-right text-emerald-700">−{formatMoney(Number(discount?.installation.discount))}</span></>}
        <strong className="border-t border-slate-300 pt-2">
          Installation total
        </strong>
        <strong className="border-t border-slate-300 pt-2 text-right">
          {formatMoney(installationTotal)}
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
          </>
        ) : Number(job.depositAmountSnapshot ?? 0) > 0 ? (
          <>
            <span className="text-slate-500">Non-refundable deposit due</span>
            <span className="text-right">
              {formatMoney(discount ? Math.min(Number(job.depositAmountSnapshot ?? 0), installationTotal) : Number(job.depositAmountSnapshot ?? 0))}
            </span>
          </>
        ) : null}
        {!canceled && installationPaymentsPaid > 0 && (
          <>
            <span className="text-emerald-700">Installation payments paid</span>
            <span className="text-right text-emerald-700">
              -{formatMoney(installationPaymentsPaid)}
            </span>
          </>
        )}
        {!canceled && (
          <>
            <strong>Installation balance</strong>
            <strong className="text-right">
              {formatMoney(installationBalance)}
            </strong>
          </>
        )}
        {job.permit && !canceled && (
          <>
            <strong className="col-span-2 mt-3 border-t border-slate-300 pt-2">
              Permit and city fees
            </strong>
            <span className="text-slate-500">Permit Fee</span>
            <span className="text-right">
              {formatMoney(Number(discount?.permit.total ?? job.permit.permitFeeSnapshot))}
            </span>
            <span className="text-slate-500">City Fee</span>
            <span className="text-right">
              {job.permit.cityFee == null
                ? "Pending"
                : formatMoney(Number(discount?.city.total ?? job.permit.cityFee))}
            </span>
          </>
        )}
        {(depositPaid > 0 || canceled) && (
          <span className="col-span-2 mt-2 text-right text-[11px] text-slate-500">
            {canceled
              ? "Installation was canceled; the deposit remains non-refundable."
              : "The deposit is credited only toward installation."}
          </span>
        )}
      </div>
    </section>
  );
}
