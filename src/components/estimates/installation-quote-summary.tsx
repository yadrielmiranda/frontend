import type { ReactNode } from "react";
import { OriginalPrice } from "@/components/promotions/promotion-price";
import type { InstallationJob } from "@/lib/types";
import { formatMoney, roundMoney } from "@/lib/formatters";
import { additionalServiceTotals } from "@/lib/installation-service-totals";

function SummaryRow({
  label,
  children,
  strong = false,
}: {
  label: string;
  children: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 py-1.5 text-sm">
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={`text-right ${strong ? "font-semibold" : "font-medium"}`}>
        {children}
      </span>
    </div>
  );
}

export function InstallationQuoteSummary({ job }: { job: InstallationJob }) {
  const quote = job.quotes[0];
  const canceled = job.status === "CANCELED";
  const discount = job.manualDiscountSummary;
  const extras = additionalServiceTotals(quote ?? null);
  const additionalServicesTotal = roundMoney(
    extras.reduce((total, service) => total + service.amount, 0),
  );
  const baseInstallationTotal = roundMoney(
    Number(quote?.total ?? 0) - additionalServicesTotal,
  );
  const installationTotal = Number(discount?.installation.total ?? quote?.total ?? 0);
  const installationDiscount = Number(discount?.installation.discount ?? 0);
  const permitFee = job.permit
    ? Number(discount?.permit.total ?? job.permit.permitFeeSnapshot)
    : 0;
  const cityFee = job.permit?.cityFee == null
    ? null
    : Number(discount?.city.total ?? job.permit.cityFee);
  const total = roundMoney(installationTotal + permitFee + (cityFee ?? 0));

  return (
    <div className="p-4">
      <SummaryRow label="Installation">
        {canceled ? "Canceled" : !quote ? "Pending" : installationDiscount > 0 ? (
          <OriginalPrice amount={baseInstallationTotal} label="Before discount" />
        ) : formatMoney(baseInstallationTotal)}
      </SummaryRow>

      {!canceled && quote && (
        <>
          {extras.length > 0 ? (
            <div className="mt-1 border-t pt-1">
              <p className="py-1.5 text-sm font-semibold">Additional services</p>
              <div className="border-l-2 border-slate-200 pl-3">
                {extras.map((service) => (
                  <SummaryRow key={service.serviceId} label={service.name}>
                    {formatMoney(service.amount)}
                  </SummaryRow>
                ))}
              </div>
            </div>
          ) : (
            <SummaryRow label="Additional services">None included</SummaryRow>
          )}
          {installationDiscount > 0 && (
            <SummaryRow label="Additional discount · Installation">
              <span className="text-emerald-700">−{formatMoney(installationDiscount)}</span>
            </SummaryRow>
          )}
        </>
      )}

      {!canceled && (job.permit ? (
        <div className="mt-1 border-t pt-1">
          <p className="py-1.5 text-sm font-semibold">Permit management</p>
          <div className="border-l-2 border-slate-200 pl-3">
            <SummaryRow label="Permit Fee">
              {formatMoney(permitFee)}
            </SummaryRow>
            <SummaryRow label="City Fee">
              {cityFee == null
                ? "Pending"
                : formatMoney(cityFee)}
            </SummaryRow>
          </div>
        </div>
      ) : (
        <SummaryRow label="Permit management">Not included</SummaryRow>
      ))}

      {!canceled && quote && (
        <div className="mt-1 border-t pt-1">
          <SummaryRow label="Total" strong>
            {formatMoney(total)}
          </SummaryRow>
          {job.permit && cityFee == null && (
            <p className="mt-1 text-xs font-medium text-amber-800">
              Final total pending City Fee.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
