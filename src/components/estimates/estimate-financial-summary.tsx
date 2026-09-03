"use client";

import type { ReactNode } from "react";
import { ReceiptText } from "lucide-react";

import type {
  DealerMode,
  EstimateCustomerChargeSummary,
  EstimateRevisionTotals,
  InstallationJob,
  InstallationQuote,
} from "@/lib/types";
import { formatMoney, roundMoney } from "@/lib/formatters";
import { paidBaseFor, paidInstallationCredit } from "@/lib/installation-flow";
import { canSetCustomerOnEstimate } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PiecesBreakdownBar } from "./pieces-breakdown-bar";

export type EstimateFinancialMaterialSummary = {
  totalUnits: number;
  pieceBreakdown: Record<string, number>;
  subtotal: number;
  taxAmount: number;
  totalPayable: number;
  dealerTotal: number;
  dealerTaxAmount: number;
  dealerGrandTotal: number;
  dealerProfit: number;
};

type MaterialTotals = {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
};

type AdditionalServiceTotal = {
  serviceId: number;
  name: string;
  amount: number;
};

const pendingRevisionStatuses = new Set([
  "PENDING_ADMIN_APPROVAL",
  "PENDING_CUSTOMER_APPROVAL",
]);

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

function pendingRevisionTotals(
  job: InstallationJob | null,
  quote: InstallationQuote | null,
): EstimateRevisionTotals | null {
  if (!job || !quote) return null;

  const revision = job.revisions.find(
    (candidate) => candidate.quoteId === quote.id,
  );

  return revision && pendingRevisionStatuses.has(revision.status)
    ? revision.revisedTotals
    : null;
}

function additionalServiceTotals(
  quote: InstallationQuote | null,
): AdditionalServiceTotal[] {
  if (!quote) return [];

  const automaticServiceIds = new Set(
    quote.lines
      .filter((line) => line.origin === "AUTO")
      .map((line) => line.serviceId),
  );
  const grouped = new Map<number, AdditionalServiceTotal>();

  for (const line of quote.lines) {
    if (line.origin !== "USER_SELECTED" && line.origin !== "FIELD_ADDED") {
      continue;
    }

    const current = grouped.get(line.serviceId);
    const amount = numberValue(line.adjustedAmount);

    if (current) {
      current.amount = roundMoney(current.amount + amount);
    } else {
      grouped.set(line.serviceId, {
        serviceId: line.serviceId,
        name: line.serviceNameSnapshot,
        amount: roundMoney(amount),
      });
    }
  }

  const minimums = Array.isArray(quote.serviceMinimumsSnapshot)
    ? quote.serviceMinimumsSnapshot
    : [];

  for (const minimum of minimums) {
    const current = grouped.get(Number(minimum.serviceId));

    // A service minimum that belongs exclusively to a manual service is part
    // of that displayed extra charge. Shared/automatic adjustments stay in
    // the single Installation amount below.
    if (current && !automaticServiceIds.has(current.serviceId)) {
      current.amount = roundMoney(
        current.amount + numberValue(minimum.adjustment),
      );
    }
  }

  return Array.from(grouped.values());
}

function statusForInstallation(
  job: InstallationJob | null,
  quote: InstallationQuote | null,
) {
  if (!job || job.status === "CANCELED") {
    return {
      label: "Not included",
      className: "border-amber-300 bg-amber-50 text-amber-800",
    };
  }

  if (job.status === "DEPOSIT_PAYMENT_PENDING") {
    return {
      label: "Proposed",
      className: "border-blue-300 bg-blue-50 text-blue-800",
    };
  }

  if (quote?.status === "APPROVED") {
    return {
      label: "Included",
      className: "border-emerald-300 bg-emerald-50 text-emerald-800",
    };
  }

  return {
    label: "Preliminary",
    className: "border-slate-300 bg-slate-50 text-slate-700",
  };
}

function SummaryRow({
  label,
  value,
  strong = false,
  children,
}: {
  label: string;
  value?: string;
  strong?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>
        {label}
      </span>
      <span
        className={`${strong ? "font-semibold" : "font-medium"} text-right`}
      >
        {children ?? value}
      </span>
    </div>
  );
}

function TaxAmount({ total }: { total: MaterialTotals }) {
  return (
    <span className="text-right">
      <span className="block">{formatMoney(total.taxAmount)}</span>
      <span className="block text-[11px] font-normal text-muted-foreground">
        {(total.taxRate * 100).toFixed(2)}%
      </span>
    </span>
  );
}

function ExternalDealerServiceSummary({
  summary,
}: {
  summary: EstimateCustomerChargeSummary | null;
}) {
  const lines = summary?.lines ?? [];

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
        <span>Installation &amp; services</span>
        <span className="text-right">Your Cost</span>
        <span className="text-right">Customer Price</span>
      </div>

      {lines.length > 0 ? (
        lines.map((line) => (
          <div
            key={line.sourceKey ?? `dealer-${line.id}`}
            className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] items-center gap-3 border-t px-4 py-2.5 text-sm"
          >
            <span className="text-slate-700">
              {line.description}
              {line.origin === "DEALER" && (
                <span className="ml-2 text-[11px] text-slate-500">
                  Dealer-created
                </span>
              )}
            </span>
            <span className="text-right font-medium">
              {line.origin === "DEALER"
                ? "—"
                : line.systemAmount == null
                  ? "Pending"
                  : formatMoney(numberValue(line.systemAmount))}
            </span>
            <span className="text-right font-medium">
              {!line.usedInCustomerQuote
                ? "Not used"
                : line.customerAmount == null
                  ? "Pending"
                  : formatMoney(numberValue(line.customerAmount))}
            </span>
          </div>
        ))
      ) : (
        <div className="border-t px-4 py-3 text-sm text-muted-foreground">
          No installation or service charges included.
        </div>
      )}

      {summary && lines.length > 0 && (
        <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] items-center gap-3 border-t bg-slate-50/60 px-4 py-3 text-sm font-semibold">
          <span>Services total</span>
          <span className="text-right">
            {formatMoney(numberValue(summary.systemTotal))}
          </span>
          <span className="text-right">
            {formatMoney(numberValue(summary.customerTotal))}
          </span>
        </div>
      )}
    </div>
  );
}

export function EstimateFinancialSummary({
  ownerRole,
  dealerMode,
  ownerIsTaxExempt,
  taxRate,
  customerTaxRatePercent,
  materialSummary,
  installationJob,
  customerChargesSummary,
}: {
  ownerRole: string;
  dealerMode: DealerMode | null;
  ownerIsTaxExempt: boolean;
  taxRate: number;
  customerTaxRatePercent: number;
  materialSummary: EstimateFinancialMaterialSummary;
  installationJob: InstallationJob | null;
  customerChargesSummary: EstimateCustomerChargeSummary | null;
}) {
  const isDealerEstimate = canSetCustomerOnEstimate(ownerRole);
  const isExternalDealer = isDealerEstimate && dealerMode === "EXTERNAL";
  const activeJob =
    installationJob && installationJob.status !== "CANCELED"
      ? installationJob
      : null;
  const quote =
    activeJob?.quotes.find((candidate) => candidate.status !== "REJECTED") ??
    null;
  const revisionTotals = pendingRevisionTotals(activeJob, quote);

  const internalMaterial: MaterialTotals = revisionTotals
    ? {
        subtotal: numberValue(revisionTotals.priceT),
        taxRate: numberValue(revisionTotals.taxRate),
        taxAmount: numberValue(revisionTotals.taxAmount),
        total: numberValue(revisionTotals.totalPayable),
      }
    : installationJob
      ? {
          subtotal: numberValue(installationJob.estimate.priceT),
          taxRate: numberValue(installationJob.estimate.taxRate),
          taxAmount: numberValue(installationJob.estimate.taxAmount),
          total: numberValue(installationJob.estimate.totalPayable),
        }
      : {
          subtotal: materialSummary.subtotal,
          taxRate: ownerIsTaxExempt ? 0 : numberValue(taxRate),
          taxAmount: materialSummary.taxAmount,
          total: materialSummary.totalPayable,
        };

  const customerMaterial: MaterialTotals = revisionTotals
    ? {
        subtotal: numberValue(revisionTotals.customerPriceT),
        taxRate: numberValue(revisionTotals.customerTaxRate),
        taxAmount: numberValue(revisionTotals.customerTaxAmount),
        total: numberValue(revisionTotals.customerTotalPayable),
      }
    : installationJob
      ? {
          subtotal: numberValue(installationJob.estimate.customerPriceT),
          taxRate: numberValue(installationJob.estimate.customerTaxRate),
          taxAmount: numberValue(installationJob.estimate.customerTaxAmount),
          total: numberValue(installationJob.estimate.customerTotalPayable),
        }
      : {
          subtotal: materialSummary.dealerTotal,
          taxRate: numberValue(customerTaxRatePercent) / 100,
          taxAmount: materialSummary.dealerTaxAmount,
          total: materialSummary.dealerGrandTotal,
        };

  const extras = additionalServiceTotals(quote);
  const additionalServicesTotal = roundMoney(
    extras.reduce((total, service) => total + service.amount, 0),
  );
  const quoteTotal = numberValue(quote?.total);
  // The residual is the single Installation amount: every automatic line plus
  // service/profile minimum adjustments that must remain internal.
  const baseInstallationTotal = roundMoney(
    quoteTotal - additionalServicesTotal,
  );
  const permitFee = numberValue(activeJob?.permit?.permitFeeSnapshot);
  const cityFee =
    activeJob?.permit?.cityFee == null
      ? null
      : numberValue(activeJob.permit.cityFee);
  const retainedDeposit =
    installationJob?.status === "CANCELED"
      ? paidBaseFor(installationJob, "INSTALLATION_DEPOSIT")
      : 0;
  const depositPaid = activeJob
    ? paidBaseFor(activeJob, "INSTALLATION_DEPOSIT")
    : 0;
  const installationBalance = activeJob
    ? roundMoney(Math.max(0, quoteTotal - paidInstallationCredit(activeJob)))
    : 0;
  const sharedChargesTotal = roundMoney(
    quoteTotal + permitFee + (cityFee ?? 0) + retainedDeposit,
  );
  const customerChargesTotal =
    isExternalDealer && customerChargesSummary
      ? numberValue(customerChargesSummary.customerTotal)
      : sharedChargesTotal;
  const internalProjectTotal = roundMoney(
    internalMaterial.total + sharedChargesTotal,
  );
  const customerProjectTotal = roundMoney(
    customerMaterial.total + customerChargesTotal,
  );
  const dealerProfit = roundMoney(
    customerMaterial.subtotal - internalMaterial.subtotal,
  );
  const installationStatus = statusForInstallation(installationJob, quote);
  const cityFeePending = Boolean(activeJob?.permit && cityFee == null);
  const proposedRevision = Boolean(revisionTotals);
  const awaitingDeposit = activeJob?.status === "DEPOSIT_PAYMENT_PENDING";
  const projected = Boolean(activeJob && quote?.status !== "APPROVED");
  const paymentMessage = !activeJob
    ? null
    : activeJob.status === "PERMIT_PAYMENT_PENDING"
      ? "Permit Fee is due now."
      : activeJob.status === "MATERIAL_PAYMENT_PENDING"
        ? activeJob.permit
          ? "Material total and City Fee are due now."
          : "Material total is due now."
        : activeJob.status === "INSTALLATION_PAYMENT_PENDING"
          ? "The remaining installation balance is due now."
          : "No payment is due at this stage.";

  const totalPrefix = proposedRevision
    ? "Proposed Revised"
    : cityFeePending
      ? "Current"
      : projected
        ? "Projected"
        : "";
  const clientTotalLabel = `${totalPrefix ? `${totalPrefix} ` : ""}Project Total`;
  const internalTotalLabel = totalPrefix
    ? `${totalPrefix} Project Cost (Your Cost)`
    : "Your Project Cost";
  const customerTotalLabel = totalPrefix
    ? `${totalPrefix} Customer Project Total`
    : "Customer Project Total";

  return (
    <Card className="min-w-0 border-slate-300">
      <CardHeader className="min-w-0 px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2">
          <ReceiptText className="h-5 w-5" /> Estimate Summary
        </CardTitle>
        <CardDescription>
          Materials, services, fees, and project totals in one place.
        </CardDescription>
      </CardHeader>

      <CardContent className="min-w-0 space-y-5 px-4 sm:px-6">
        <PiecesBreakdownBar
          totalUnits={materialSummary.totalUnits}
          pieceBreakdown={materialSummary.pieceBreakdown}
        />

        {isDealerEstimate ? (
          <div className="overflow-x-auto rounded-lg border">
            <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <span>Material pricing</span>
              <span className="text-right">Your Cost</span>
              <span className="text-right">Customer Price</span>
            </div>
            <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] items-center gap-3 border-t px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Material subtotal</span>
              <span className="text-right font-medium">
                {formatMoney(internalMaterial.subtotal)}
              </span>
              <span className="text-right font-medium">
                {formatMoney(customerMaterial.subtotal)}
              </span>
            </div>
            <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] items-center gap-3 border-t px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Sales Tax</span>
              <TaxAmount total={internalMaterial} />
              <TaxAmount total={customerMaterial} />
            </div>
            <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] items-center gap-3 border-t bg-slate-50/60 px-4 py-3 text-sm font-semibold">
              <span>Material total</span>
              <span className="text-right">
                {formatMoney(internalMaterial.total)}
              </span>
              <span className="text-right">
                {formatMoney(customerMaterial.total)}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-slate-50/60 px-4 py-3">
            <h4 className="mb-1 text-sm font-semibold">Materials</h4>
            <SummaryRow
              label="Material subtotal"
              value={formatMoney(internalMaterial.subtotal)}
            />
            <SummaryRow
              label={`Sales Tax (${(internalMaterial.taxRate * 100).toFixed(2)}%)${ownerIsTaxExempt ? " · Exempt" : ""}`}
              value={formatMoney(internalMaterial.taxAmount)}
            />
            <div className="mt-1 border-t pt-1">
              <SummaryRow
                label="Material total"
                value={formatMoney(internalMaterial.total)}
                strong
              />
            </div>
          </div>
        )}

        {isExternalDealer ? (
          <ExternalDealerServiceSummary summary={customerChargesSummary} />
        ) : (
          <div className="rounded-lg border px-4 py-3">
            <h4 className="mb-1 text-sm font-semibold">
              Installation &amp; services
            </h4>

            <SummaryRow label="Installation">
              <span className="flex flex-wrap items-center justify-end gap-2">
                <Badge
                  variant="outline"
                  className={installationStatus.className}
                >
                  {installationStatus.label}
                </Badge>
                {activeJob && quote ? formatMoney(baseInstallationTotal) : null}
                {activeJob && !quote ? "Pending" : null}
              </span>
            </SummaryRow>

            {activeJob && (
              <>
                {extras.length > 0 ? (
                  extras.map((service) => (
                    <SummaryRow
                      key={service.serviceId}
                      label={service.name}
                      value={formatMoney(service.amount)}
                    />
                  ))
                ) : (
                  <SummaryRow
                    label="Additional services"
                    value="None included"
                  />
                )}

                {activeJob.permit ? (
                  <>
                    <SummaryRow
                      label="Permit Fee"
                      value={formatMoney(permitFee)}
                    />
                    <SummaryRow
                      label="City Fee"
                      value={cityFee == null ? "Pending" : formatMoney(cityFee)}
                    />
                  </>
                ) : (
                  <>
                    <SummaryRow label="Permit service" value="Not included" />
                    <SummaryRow label="City Fee" value="Not applicable" />
                  </>
                )}

                {isDealerEstimate && (
                  <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                    The system installation price is the final customer price
                    for this account.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {retainedDeposit > 0 && (
          <div className="rounded-lg border px-4 py-3">
            <h4 className="mb-1 text-sm font-semibold">Other charges</h4>
            <SummaryRow
              label="Non-refundable deposit retained"
              value={formatMoney(retainedDeposit)}
            />
          </div>
        )}

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          {isDealerEstimate ? (
            <>
              <SummaryRow
                label={internalTotalLabel}
                value={formatMoney(internalProjectTotal)}
                strong
              />
              <SummaryRow
                label={customerTotalLabel}
                value={formatMoney(customerProjectTotal)}
                strong
              />
              <SummaryRow
                label="Dealer Profit (materials only, pre-tax)"
                value={formatMoney(dealerProfit)}
              />
            </>
          ) : (
            <SummaryRow
              label={clientTotalLabel}
              value={formatMoney(internalProjectTotal)}
              strong
            />
          )}

          {cityFeePending && (
            <p className="mt-1 text-xs font-medium text-amber-800">
              Final total pending City Fee.
            </p>
          )}
          {awaitingDeposit && (
            <p className="mt-1 text-xs text-blue-800">
              Installation is proposed and is not confirmed until the deposit is
              paid.
            </p>
          )}
          {projected && !awaitingDeposit && !proposedRevision && (
            <p className="mt-1 text-xs text-blue-800">
              Installation amounts remain preliminary until the current quote is
              approved.
            </p>
          )}
          {proposedRevision && (
            <p className="mt-1 text-xs text-blue-800">
              These revised amounts are pending approval.
            </p>
          )}
        </div>

        {activeJob && (
          <div className="rounded-lg border px-4 py-3">
            <h4 className="mb-1 text-sm font-semibold">Payment status</h4>

            {activeJob.status === "DEPOSIT_PAYMENT_PENDING" ? (
              <SummaryRow
                label="Installation deposit due now"
                value={formatMoney(
                  numberValue(activeJob.depositAmountSnapshot),
                )}
                strong
              />
            ) : (
              <p className="py-1.5 text-sm text-muted-foreground">
                {paymentMessage}
              </p>
            )}

            {depositPaid > 0 && (
              <SummaryRow
                label="Installation deposit paid · credited"
                value={formatMoney(depositPaid)}
              />
            )}

            {activeJob.status === "INSTALLATION_PAYMENT_PENDING" && (
              <SummaryRow
                label="Remaining installation balance"
                value={formatMoney(installationBalance)}
                strong
              />
            )}

            <p className="mt-1 border-t pt-2 text-xs text-muted-foreground">
              The installation deposit is credited toward installation and is
              not an additional project charge.
            </p>
          </div>
        )}

        <p className="text-xs font-medium text-slate-600">
          This is the complete list of services and charges for this estimate;
          the installation status is shown above.
        </p>
      </CardContent>
    </Card>
  );
}
