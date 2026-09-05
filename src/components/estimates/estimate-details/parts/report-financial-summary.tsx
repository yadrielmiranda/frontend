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
  accentValue = false,
  children,
}: {
  label: string;
  value?: string;
  strong?: boolean;
  accentValue?: boolean;
  children?: ReactNode;
}) {
  const valueClassName = accentValue
    ? "text-right font-bold text-emerald-700"
    : strong
      ? "text-right font-semibold text-black"
      : "text-right font-medium text-black";

  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className={strong ? "font-semibold text-black" : "text-black"}>
        {label}
      </span>
      <span className={valueClassName}>{children ?? value}</span>
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
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
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
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-black">
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
            <td className="px-4 py-3 text-black">Material subtotal</td>
            <td className="px-4 py-3 text-right font-medium">
              {formatMoney(internal.subtotal)}
            </td>
            <td className="px-4 py-3 text-right font-medium">
              {formatMoney(customer.subtotal)}
            </td>
          </tr>
          <tr className="border-t border-slate-200">
            <td className="px-4 py-3 text-black">Sales Tax</td>
            <td className="px-4 py-3 text-right">
              <span className="block font-medium">
                {formatMoney(internal.taxAmount)}
              </span>
              <span className="text-[11px] text-black">
                {(internal.taxRate * 100).toFixed(2)}%
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              <span className="block font-medium">
                {formatMoney(customer.taxAmount)}
              </span>
              <span className="text-[11px] text-black">
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
    return null;
  }

  if (!comparison) {
    return (
      <div className="break-inside-avoid overflow-hidden rounded-lg border border-slate-200">
        <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
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
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-black">
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
              <td className="px-4 py-3 text-black">
                {line.description}
                {line.origin === "DEALER" && (
                  <span className="ml-2 text-[11px] text-black">
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

  if (customerLines.length === 0) return null;

  return (
    <div className="break-inside-avoid overflow-hidden rounded-lg border border-slate-200">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
        Project scope
      </div>
      <div className="px-4 py-1">
        {customerLines.map((line) => (
          <MoneyRow
            key={line.sourceKey ?? `dealer-${line.id}-${line.sortOrder}`}
            label={line.description}
            value={line.customerAmount == null ? "Pending" : "Included"}
          />
        ))}
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
    return null;
  }

  const status = installationStatus(summary);

  return (
    <div className="break-inside-avoid overflow-hidden rounded-lg border border-slate-200">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
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
              <div className="mt-1 border-t border-slate-200 pt-1">
                <p className="py-2 text-sm font-semibold text-black">
                  Permit management
                </p>
                <div className="border-l-2 border-slate-200 pl-3">
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
                </div>
              </div>
            ) : (
              <MoneyRow label="Permit management" value="Not included" />
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
    return null;
  }

  const status = installationStatus(summary);

  return (
    <div className="break-inside-avoid overflow-hidden rounded-lg border border-slate-200">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
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

            {summary.permitIncluded ? (
              <div className="mt-1 border-t border-slate-200 pt-1">
                <p className="py-2 text-sm font-semibold text-black">
                  Permit management
                </p>
                <div className="border-l-2 border-slate-200 pl-3">
                  <MoneyRow label="Permit Fee" value="Included" />
                  <MoneyRow
                    label="City Fee"
                    value={summary.cityFee == null ? "Pending" : "Included"}
                  />
                </div>
              </div>
            ) : (
              <MoneyRow label="Permit management" value="Not included" />
            )}
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
  const companyName = estimate.companyBranding?.name?.trim() || "Company";
  const factoryRate = numberValue(estimate.rateT);
  const internalMaterialSubtotal = numberValue(estimate.priceT);
  const materialSaleSubtotal = internalDealer
    ? numberValue(estimate.customerPriceT)
    : internalMaterialSubtotal;
  const estimatedCompanyProfit = roundMoney(materialSaleSubtotal - factoryRate);
  const saleChannel = ownerIsDealer
    ? `${estimate.dealerModeSnapshot ?? "EXTERNAL"} DEALER`
    : "DIRECT CLIENT";
  const calculationNote = internalDealer
    ? `Estimated ${companyName} profit uses customer material subtotal minus estimated factory rate.`
    : ownerIsDealer
      ? `Estimated ${companyName} profit uses dealer material subtotal minus estimated factory rate. The dealer's customer resale markup is excluded.`
      : `Estimated ${companyName} profit uses material sale subtotal minus estimated factory rate.`;

  return (
    <div className="break-inside-avoid overflow-hidden rounded-lg border border-slate-200">
      <div className="bg-slate-50 px-4 py-3">
        <h4 className="text-sm font-semibold text-black">
          Estimated material profitability
        </h4>
        <p className="mt-0.5 text-xs text-black">
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
          label={`Estimated ${companyName} profit`}
          value={formatMoney(estimatedCompanyProfit)}
          strong
        />
      </div>
      <p className="border-t border-slate-200 px-4 py-3 text-xs text-black">
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
  const hasServiceSummary = externalDealerCharges
    ? comparisonView
      ? externalDealerCharges.lines.length > 0
      : externalDealerCharges.lines.some((line) => line.usedInCustomerQuote)
    : Boolean(installationSummary);

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
        <h3 className="text-lg font-bold uppercase tracking-wide text-black">
          Project Summary
        </h3>
      </div>

      {projectTotalOnly ? (
        externalDealerCharges ? (
          <ExternalDealerProjectScope summary={externalDealerCharges} />
        ) : (
          <ProjectScopeSummary summary={installationSummary} />
        )
      ) : (
        <div
          className={
            comparisonView
              ? "space-y-4"
              : hasServiceSummary
                ? "grid items-start gap-4 lg:grid-cols-2"
                : "grid items-start gap-4"
          }
        >
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
        </div>
      )}

      <div
        className={`break-inside-avoid rounded-xl border px-5 py-3 ${
          comparisonView
            ? "border-slate-300 bg-slate-100/80"
            : "border-emerald-300 bg-emerald-50 px-6 py-5 [&>div>span:first-child]:text-lg [&>div>span:first-child]:uppercase [&>div>span:first-child]:tracking-wide [&>div>span:last-child]:text-2xl sm:[&>div>span:last-child]:text-3xl"
        }`}
      >
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
            accentValue
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

      <p className="pt-1 text-[11px] text-black">
        Product illustrations are visual references and are not to scale;
        written specifications govern.
      </p>
    </section>
  );
}
