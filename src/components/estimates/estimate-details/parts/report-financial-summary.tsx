"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { formatMoney, roundMoney } from "@/lib/formatters";
import { isDealerRole } from "@/lib/rbac";
import type {
  EstimateCustomerChargeSummary,
  EstimateInstallationReportSummary,
  EstimateWithRelations,
} from "@/lib/types";

export type EstimateReportKind =
  | "client"
  | "dealer-customer"
  | "dealer-customer-total"
  | "dealer"
  | "admin";

type MaterialTotals = {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function MoneyRow({
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
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span
        className={strong ? "font-semibold text-slate-950" : "text-slate-600"}
      >
        {label}
      </span>
      <span
        className={
          strong
            ? "text-right font-semibold text-slate-950"
            : "text-right font-medium text-slate-900"
        }
      >
        {children ?? value}
      </span>
    </div>
  );
}

function installationStatus(summary: EstimateInstallationReportSummary) {
  if (summary.status === "DEPOSIT_PAYMENT_PENDING") {
    return {
      label: "Proposed",
      className: "border-blue-300 bg-blue-50 text-blue-800",
    };
  }

  if (summary.quoteStatus === "APPROVED") {
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

function SingleMaterialSummary({ totals }: { totals: MaterialTotals }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
        Materials
      </div>
      <div className="px-4 py-1">
        <MoneyRow
          label="Material subtotal"
          value={formatMoney(totals.subtotal)}
        />
        <MoneyRow
          label={`Sales Tax (${(totals.taxRate * 100).toFixed(2)}%)`}
          value={formatMoney(totals.taxAmount)}
        />
        <div className="border-t border-slate-200">
          <MoneyRow
            label="Material total"
            value={formatMoney(totals.total)}
            strong
          />
        </div>
      </div>
    </div>
  );
}

function ComparativeMaterialSummary({
  internal,
  customer,
  adminView,
}: {
  internal: MaterialTotals;
  customer: MaterialTotals;
  adminView: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-4 py-3 text-left">Material pricing</th>
            <th className="px-4 py-3 text-right">
              {adminView ? "Dealer Price" : "Your Cost"}
            </th>
            <th className="px-4 py-3 text-right">Customer Price</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-slate-200">
            <td className="px-4 py-3 text-slate-600">Material subtotal</td>
            <td className="px-4 py-3 text-right font-medium">
              {formatMoney(internal.subtotal)}
            </td>
            <td className="px-4 py-3 text-right font-medium">
              {formatMoney(customer.subtotal)}
            </td>
          </tr>
          <tr className="border-t border-slate-200">
            <td className="px-4 py-3 text-slate-600">Sales Tax</td>
            <td className="px-4 py-3 text-right">
              <span className="block font-medium">
                {formatMoney(internal.taxAmount)}
              </span>
              <span className="text-[11px] text-slate-500">
                {(internal.taxRate * 100).toFixed(2)}%
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              <span className="block font-medium">
                {formatMoney(customer.taxAmount)}
              </span>
              <span className="text-[11px] text-slate-500">
                {(customer.taxRate * 100).toFixed(2)}%
              </span>
            </td>
          </tr>
          <tr className="border-t border-slate-200 bg-slate-50/60 font-semibold">
            <td className="px-4 py-3">Material total</td>
            <td className="px-4 py-3 text-right">
              {formatMoney(internal.total)}
            </td>
            <td className="px-4 py-3 text-right">
              {formatMoney(customer.total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ExternalDealerChargesSummary({
  summary,
  comparison,
}: {
  summary: EstimateCustomerChargeSummary;
  comparison: boolean;
}) {
  const customerLines = summary.lines.filter(
    (line) => line.usedInCustomerQuote,
  );
  const displayedLines = comparison ? summary.lines : customerLines;

  if (displayedLines.length === 0) {
    return (
      <div className="break-inside-avoid overflow-hidden rounded-lg border border-slate-200">
        <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
          Installation &amp; services
        </div>
        <div className="px-4 py-1">
          <MoneyRow label="Installation">
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-800"
            >
              Not included
            </Badge>
          </MoneyRow>
        </div>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="break-inside-avoid overflow-hidden rounded-lg border border-slate-200">
        <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
          Installation &amp; services
        </div>
        <div className="px-4 py-1">
          {displayedLines.map((line) => (
            <MoneyRow
              key={line.sourceKey ?? `dealer-${line.id}-${line.sortOrder}`}
              label={line.description}
              value={
                line.customerAmount == null
                  ? "Pending"
                  : formatMoney(numberValue(line.customerAmount))
              }
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="break-inside-avoid overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-4 py-3 text-left">Installation &amp; services</th>
            <th className="px-4 py-3 text-right">Dealer Cost</th>
            <th className="px-4 py-3 text-right">Customer Price</th>
          </tr>
        </thead>
        <tbody>
          {displayedLines.map((line) => (
            <tr
              key={line.sourceKey ?? `dealer-${line.id}-${line.sortOrder}`}
              className="border-t border-slate-200"
            >
              <td className="px-4 py-3 text-slate-600">
                {line.description}
                {line.origin === "DEALER" && (
                  <span className="ml-2 text-[11px] text-slate-400">
                    Dealer-created
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {line.origin === "DEALER"
                  ? "—"
                  : line.systemAmount == null
                    ? "Pending"
                    : formatMoney(numberValue(line.systemAmount))}
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {!line.usedInCustomerQuote
                  ? "Not used"
                  : line.customerAmount == null
                    ? "Pending"
                    : formatMoney(numberValue(line.customerAmount))}
              </td>
            </tr>
          ))}
          <tr className="border-t border-slate-200 bg-slate-50/60 font-semibold">
            <td className="px-4 py-3">Services total</td>
            <td className="px-4 py-3 text-right">
              {formatMoney(numberValue(summary.systemTotal))}
            </td>
            <td className="px-4 py-3 text-right">
              {formatMoney(numberValue(summary.customerTotal))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ExternalDealerProjectScope({
  summary,
}: {
  summary: EstimateCustomerChargeSummary;
}) {
  const customerLines = summary.lines.filter(
    (line) => line.usedInCustomerQuote,
  );

  return (
    <div className="break-inside-avoid overflow-hidden rounded-lg border border-slate-200">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
        Project scope
      </div>
      <div className="px-4 py-1">
        {customerLines.length > 0 ? (
          customerLines.map((line) => (
            <MoneyRow
              key={line.sourceKey ?? `dealer-${line.id}-${line.sortOrder}`}
              label={line.description}
              value={line.customerAmount == null ? "Pending" : "Included"}
            />
          ))
        ) : (
          <MoneyRow label="Installation" value="Not included" />
        )}
      </div>
    </div>
  );
}

function InstallationSummary({
  summary,
}: {
  summary: EstimateInstallationReportSummary | null;
}) {
  if (!summary) {
    return (
      <div className="break-inside-avoid overflow-hidden rounded-lg border border-slate-200">
        <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
          Installation &amp; services
        </div>
        <div className="px-4 py-1">
          <MoneyRow label="Installation">
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-800"
            >
              Not included
            </Badge>
          </MoneyRow>
        </div>
      </div>
    );
  }

  const status = installationStatus(summary);

  return (
    <div className="break-inside-avoid overflow-hidden rounded-lg border border-slate-200">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
        Installation &amp; services
      </div>
      <div className="px-4 py-1">
        <MoneyRow label="Installation">
          <span className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
            {summary.installationAmount == null
              ? "Pending"
              : formatMoney(numberValue(summary.installationAmount))}
          </span>
        </MoneyRow>

        {summary.quoteStatus !== null && (
          <>
            {summary.additionalServices.length > 0 ? (
              summary.additionalServices.map((service) => (
                <MoneyRow
                  key={service.serviceId}
                  label={service.name}
                  value={formatMoney(numberValue(service.amount))}
                />
              ))
            ) : (
              <MoneyRow label="Additional services" value="None included" />
            )}

            {summary.permitIncluded ? (
              <>
                <MoneyRow
                  label="Permit Fee"
                  value={formatMoney(numberValue(summary.permitFee))}
                />
                <MoneyRow
                  label="City Fee"
                  value={
                    summary.cityFee == null
                      ? "Pending"
                      : formatMoney(numberValue(summary.cityFee))
                  }
                />
              </>
            ) : (
              <>
                <MoneyRow label="Permit service" value="Not included" />
                <MoneyRow label="City Fee" value="Not applicable" />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProjectScopeSummary({
  summary,
}: {
  summary: EstimateInstallationReportSummary | null;
}) {
  if (!summary) {
    return (
      <div className="break-inside-avoid overflow-hidden rounded-lg border border-slate-200">
        <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
          Project scope
        </div>
        <div className="px-4 py-1">
          <MoneyRow label="Installation">
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-800"
            >
              Not included
            </Badge>
          </MoneyRow>
        </div>
      </div>
    );
  }

  const status = installationStatus(summary);

  return (
    <div className="break-inside-avoid overflow-hidden rounded-lg border border-slate-200">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
        Project scope
      </div>
      <div className="px-4 py-1">
        <MoneyRow label="Installation">
          <Badge variant="outline" className={status.className}>
            {status.label}
          </Badge>
        </MoneyRow>

        {summary.quoteStatus !== null ? (
          <>
            {summary.additionalServices.length > 0 ? (
              summary.additionalServices.map((service) => (
                <MoneyRow
                  key={service.serviceId}
                  label={service.name}
                  value="Included"
                />
              ))
            ) : (
              <MoneyRow label="Additional services" value="None included" />
            )}

            <MoneyRow
              label="Permit service"
              value={summary.permitIncluded ? "Included" : "Not included"}
            />

            {summary.permitIncluded ? (
              <MoneyRow
                label="City Fee"
                value={summary.cityFee == null ? "Pending" : "Included"}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function AdminProfitability({
  estimate,
  ownerIsDealer,
}: {
  estimate: EstimateWithRelations;
  ownerIsDealer: boolean;
}) {
  const internalDealer =
    ownerIsDealer && estimate.dealerModeSnapshot === "INTERNAL";
  const belongsToImpact =
    ownerIsDealer && estimate.dealerAffiliationSnapshot === "IMPACT";
  const expectedCompanyProfit = roundMoney(
    internalDealer
      ? numberValue(estimate.customerPriceT) - numberValue(estimate.priceT)
      : numberValue(estimate.priceT) - numberValue(estimate.rateT),
  );
  const estimatedImpactProfit = belongsToImpact ? expectedCompanyProfit : 0;
  const estimatedAuthenticProfit = belongsToImpact ? 0 : expectedCompanyProfit;
  const saleChannel = ownerIsDealer
    ? `${estimate.dealerModeSnapshot ?? "EXTERNAL"} · ${
        estimate.dealerAffiliationSnapshot ?? "AUTHENTIC"
      }`
    : "DIRECT CLIENT · AUTHENTIC";
  const calculationNote = internalDealer
    ? "Expected profit uses customer material subtotal minus internal material subtotal. The dealer's intermediate pricing markup is excluded."
    : ownerIsDealer
      ? "Expected profit uses dealer material subtotal minus estimated factory rate. The dealer's customer resale markup is excluded."
      : "Expected profit uses material sale subtotal minus estimated factory rate.";

  return (
    <div className="break-inside-avoid overflow-hidden rounded-lg border border-slate-200">
      <div className="bg-slate-50 px-4 py-3">
        <h4 className="text-sm font-semibold text-slate-900">
          Estimated material profitability
        </h4>
        <p className="mt-0.5 text-xs text-slate-500">
          Admin only · materials only · before taxes · installation excluded
        </p>
      </div>
      <div className="grid gap-x-8 px-4 py-1 sm:grid-cols-2">
        <MoneyRow label="Sale channel" value={saleChannel} />
        <MoneyRow
          label="Estimated factory rate"
          value={formatMoney(numberValue(estimate.rateT))}
        />
        <MoneyRow
          label="Estimated Impact profit"
          value={formatMoney(estimatedImpactProfit)}
          strong
        />
        <MoneyRow
          label="Estimated Authentic profit"
          value={formatMoney(estimatedAuthenticProfit)}
          strong
        />
        <MoneyRow
          label="Estimated total company profit"
          value={formatMoney(expectedCompanyProfit)}
          strong
        />
      </div>
      <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
        {calculationNote}
      </p>
    </div>
  );
}

export function ReportFinancialSummary({
  estimate,
  reportKind,
  installationSummary = estimate.installationSummary ?? null,
}: {
  estimate: EstimateWithRelations;
  reportKind: EstimateReportKind;
  installationSummary?: EstimateInstallationReportSummary | null;
}) {
  const internalMaterial: MaterialTotals = {
    subtotal: numberValue(estimate.priceT),
    taxRate: numberValue(estimate.taxRate),
    taxAmount: numberValue(estimate.taxAmount),
    total: numberValue(estimate.totalPayable),
  };
  const customerMaterial: MaterialTotals = {
    subtotal: numberValue(estimate.customerPriceT),
    taxRate: numberValue(estimate.customerTaxRate),
    taxAmount: numberValue(estimate.customerTaxAmount),
    total: numberValue(estimate.customerTotalPayable),
  };
  const ownerIsDealer =
    reportKind === "dealer" ||
    reportKind === "dealer-customer" ||
    reportKind === "dealer-customer-total" ||
    isDealerRole(estimate.user?.role?.name);
  const projectTotalOnly = reportKind === "dealer-customer-total";
  const customerFacing = reportKind === "dealer-customer" || projectTotalOnly;
  const selectedMaterial = customerFacing ? customerMaterial : internalMaterial;
  const comparisonView =
    reportKind === "dealer" || (reportKind === "admin" && ownerIsDealer);
  const externalDealerCharges = ownerIsDealer
    ? (estimate.customerChargesSummary ?? null)
    : null;

  const installationTotal = numberValue(installationSummary?.installationTotal);
  const permitFee = installationSummary?.permitIncluded
    ? numberValue(installationSummary.permitFee)
    : 0;
  const cityFee = numberValue(installationSummary?.cityFee);
  const sharedCharges = roundMoney(installationTotal + permitFee + cityFee);
  const customerServiceCharges = externalDealerCharges
    ? numberValue(externalDealerCharges.customerTotal)
    : sharedCharges;
  const internalProjectTotal = roundMoney(
    internalMaterial.total + sharedCharges,
  );
  const customerProjectTotal = roundMoney(
    customerMaterial.total + customerServiceCharges,
  );
  const calculatedSelectedProjectTotal = roundMoney(
    selectedMaterial.total +
      (customerFacing ? customerServiceCharges : sharedCharges),
  );
  const selectedProjectTotal =
    projectTotalOnly && estimate.publicProjectTotal != null
      ? numberValue(estimate.publicProjectTotal)
      : calculatedSelectedProjectTotal;
  const cityFeePending = Boolean(
    installationSummary?.permitIncluded && installationSummary.cityFee == null,
  );
  const installationAmountPending = Boolean(
    installationSummary && installationSummary.installationTotal == null,
  );
  const preliminaryInstallation = Boolean(
    installationSummary &&
      (installationSummary.quoteStatus !== "APPROVED" ||
        installationSummary.status === "DEPOSIT_PAYMENT_PENDING"),
  );
  const externalChargesIncomplete = externalDealerCharges
    ? customerFacing
      ? externalDealerCharges.customerTotalIncomplete
      : externalDealerCharges.systemTotalIncomplete ||
        externalDealerCharges.customerTotalIncomplete
    : false;
  const calculatedIncompleteTotal = externalDealerCharges
    ? externalChargesIncomplete
    : cityFeePending || installationAmountPending;
  const incompleteTotal =
    projectTotalOnly &&
    typeof estimate.publicProjectTotalIncomplete === "boolean"
      ? estimate.publicProjectTotalIncomplete
      : calculatedIncompleteTotal;
  const projectLabel = incompleteTotal
    ? "Current Project Total"
    : "Project Total";

  return (
    <section className="mt-10 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          Project Summary
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {projectTotalOnly
            ? "Products and project scope with one complete customer price."
            : "Materials, services, fees, and project totals."}
        </p>
      </div>

      {projectTotalOnly ? (
        externalDealerCharges ? (
          <ExternalDealerProjectScope summary={externalDealerCharges} />
        ) : (
          <ProjectScopeSummary summary={installationSummary} />
        )
      ) : (
        <>
          <div className="break-inside-avoid">
            {comparisonView ? (
              <ComparativeMaterialSummary
                internal={internalMaterial}
                customer={customerMaterial}
                adminView={reportKind === "admin"}
              />
            ) : (
              <SingleMaterialSummary totals={selectedMaterial} />
            )}
          </div>

          {externalDealerCharges ? (
            <ExternalDealerChargesSummary
              summary={externalDealerCharges}
              comparison={comparisonView}
            />
          ) : (
            <InstallationSummary summary={installationSummary} />
          )}
        </>
      )}

      <div className="break-inside-avoid rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
        {comparisonView ? (
          <>
            <MoneyRow
              label={
                reportKind === "dealer"
                  ? incompleteTotal
                    ? "Your Current Project Cost"
                    : "Your Project Cost"
                  : incompleteTotal
                    ? "Current Dealer Project Total"
                    : "Dealer Project Total"
              }
              value={formatMoney(internalProjectTotal)}
              strong
            />
            <MoneyRow
              label={
                incompleteTotal
                  ? "Current Customer Project Total"
                  : "Customer Project Total"
              }
              value={formatMoney(customerProjectTotal)}
              strong
            />
            {reportKind === "dealer" && (
              <MoneyRow
                label="Dealer Profit · materials only, pre-tax"
                value={formatMoney(
                  roundMoney(
                    customerMaterial.subtotal - internalMaterial.subtotal,
                  ),
                )}
              />
            )}
          </>
        ) : (
          <MoneyRow
            label={projectLabel}
            value={formatMoney(selectedProjectTotal)}
            strong
          />
        )}

        {!externalDealerCharges && installationAmountPending && (
          <p className="pb-1 text-xs font-medium text-amber-800">
            Installation amount is pending.
          </p>
        )}
        {!externalDealerCharges && cityFeePending && (
          <p className="pb-1 text-xs font-medium text-amber-800">
            Final total is pending the City Fee.
          </p>
        )}
        {!externalDealerCharges &&
          preliminaryInstallation &&
          !installationAmountPending && (
            <p className="pb-1 text-xs text-blue-800">
              Installation is proposed and is not yet confirmed.
            </p>
          )}
        {externalDealerCharges?.customerTotalIncomplete && customerFacing && (
          <p className="pb-1 text-xs font-medium text-amber-800">
            Customer service pricing is incomplete.
          </p>
        )}
      </div>

      {reportKind === "admin" && (
        <AdminProfitability estimate={estimate} ownerIsDealer={ownerIsDealer} />
      )}
    </section>
  );
}
