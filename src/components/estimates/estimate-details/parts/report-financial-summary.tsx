"use client";

import { ManualDiscountSummary } from "../../manual-discount-summary";
import type { ReactNode } from "react";
import { DealerProfitSummary } from "../../dealer-profit-summary";
import { OriginalPrice } from "@/components/promotions/promotion-price";
import { formatMoney, roundMoney } from "@/lib/formatters";
import { isDealerRole } from "@/lib/rbac";
import { customerCanSeePromotions } from "@/lib/estimate-customer-promotions";
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
  manualNetDiscount?: number;
  discount?: number;
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

function SingleMaterialSummary({ totals }: { totals: MaterialTotals }) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border border-slate-200 print:overflow-visible">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
        Materials
      </div>
      <div className="px-4 py-1">
        {Number(totals.discount) > 0 && (
          <>
            <MoneyRow label="Before promotion">
              <OriginalPrice amount={totals.subtotal + totals.discount!} />
            </MoneyRow>
            <MoneyRow label="Promotion discount">
              <span className="text-red-600">
                −{formatMoney(totals.discount!)}
              </span>
            </MoneyRow>
          </>
        )}
        <MoneyRow
          label="Material subtotal"
          value={formatMoney(totals.subtotal)}
          accentValue={Number(totals.discount) > 0}
        >
          {Number(totals.manualNetDiscount) > 0 ? (
            <OriginalPrice amount={totals.subtotal} label="Before discount" />
          ) : null}
        </MoneyRow>
        {Number(totals.manualNetDiscount) > 0 && <>
          <MoneyRow label="Additional discount" value={`−${formatMoney(totals.manualNetDiscount!)}`} />
          <MoneyRow label="Subtotal after discount" value={formatMoney(totals.subtotal - totals.manualNetDiscount!)} accentValue />
        </>}
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
    <div className="min-w-0 overflow-x-auto rounded-lg border border-slate-200 print:overflow-visible">
      <table className="w-full table-fixed text-sm print:text-[10px] print:[&_td]:px-2 print:[&_th]:px-2">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-black">
          <tr>
            <th className="w-[44%] px-4 py-3 text-left">Material pricing</th>
            <th className="px-4 py-3 text-right">
              {adminView ? "Dealer Price" : "Your Cost"}
            </th>
            <th className="px-4 py-3 text-right">Customer Price</th>
          </tr>
        </thead>
        <tbody>
          {(Number(internal.discount) > 0 || Number(customer.discount) > 0) && (
            <>
              <tr className="border-t">
                <td className="px-4 py-3">Before promotion</td>
                <td className="px-4 py-3 text-right">
                  {Number(internal.discount) > 0 ? (
                    <OriginalPrice
                      amount={internal.subtotal + internal.discount!}
                    />
                  ) : (
                    formatMoney(internal.subtotal)
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {Number(customer.discount) > 0 ? (
                    <OriginalPrice
                      amount={customer.subtotal + customer.discount!}
                    />
                  ) : (
                    formatMoney(customer.subtotal)
                  )}
                </td>
              </tr>
              <tr className="text-red-700">
                <td className="px-4 py-3">Promotion discount</td>
                <td className="px-4 py-3 text-right">
                  −{formatMoney(internal.discount ?? 0)}
                </td>
                <td className="px-4 py-3 text-right">
                  −{formatMoney(customer.discount ?? 0)}
                </td>
              </tr>
            </>
          )}

          <tr className="border-t border-slate-200">
            <td className="px-4 py-3 text-black">Material subtotal</td>
            <td className="px-4 py-3 text-right font-medium">
              {Number(internal.manualNetDiscount) > 0 ? (
                <OriginalPrice
                  amount={internal.subtotal}
                  label="Before discount"
                />
              ) : (
                <span
                  className={
                    Number(internal.discount) > 0 ? "text-emerald-700" : undefined
                  }
                >
                  {formatMoney(internal.subtotal)}
                </span>
              )}
            </td>
            <td className="px-4 py-3 text-right font-medium">
              {Number(customer.manualNetDiscount) > 0 ? (
                <OriginalPrice
                  amount={customer.subtotal}
                  label="Before discount"
                />
              ) : (
                <span
                  className={
                    Number(customer.discount) > 0 ? "text-emerald-700" : undefined
                  }
                >
                  {formatMoney(customer.subtotal)}
                </span>
              )}
            </td>
          </tr>
          {(Number(internal.manualNetDiscount) > 0 || Number(customer.manualNetDiscount) > 0) && <>
          <tr className="border-t text-emerald-700">
            <td className="px-4 py-3">Additional discount</td>
            <td className="px-4 py-3 text-right">−{formatMoney(internal.manualNetDiscount ?? 0)}</td>
            <td className="px-4 py-3 text-right">−{formatMoney(customer.manualNetDiscount ?? 0)}</td>
          </tr>
          <tr className="border-t font-semibold text-emerald-700">
            <td className="px-4 py-3">Subtotal after discount</td>
            <td className="px-4 py-3 text-right">{formatMoney(internal.subtotal - (internal.manualNetDiscount ?? 0))}</td>
            <td className="px-4 py-3 text-right">{formatMoney(customer.subtotal - (customer.manualNetDiscount ?? 0))}</td>
          </tr>
          </>}
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
  discount = 0,
  installationDiscount = 0,
}: {
  summary: EstimateCustomerChargeSummary;
  comparison: boolean;
  discount?: number;
  installationDiscount?: number;
}) {
  const customerLines = summary.lines.filter(
    (line) => line.usedInCustomerQuote,
  );
  const displayedLines = comparison ? summary.lines : customerLines;

  const hasCharges = displayedLines.length > 0;

  if (!comparison) {
    return (
      <div className="break-inside-avoid min-w-0 overflow-x-auto rounded-lg border border-slate-200 print:overflow-visible">
        <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
          Installation &amp; services
        </div>
        <div className="px-4 py-1">
          {!hasCharges && (
            <MoneyRow label="Installation" value="Not included" />
          )}
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
    <div className="break-inside-avoid min-w-0 overflow-x-auto rounded-lg border border-slate-200 print:overflow-visible">
      <table className="w-full table-fixed text-sm print:text-[10px] print:[&_td]:px-2 print:[&_th]:px-2">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-black">
          <tr>
            <th className="w-[44%] px-4 py-3 text-left">Installation &amp; services</th>
            <th className="px-4 py-3 text-right">Your Cost</th>
            <th className="px-4 py-3 text-right">Customer Price</th>
          </tr>
        </thead>
        <tbody>
          {!hasCharges && (
            <tr className="border-t border-slate-200">
              <td className="px-4 py-3 text-black">Installation</td>
              <td className="px-4 py-3 text-right font-medium">Not included</td>
              <td className="px-4 py-3 text-right font-medium">Not included</td>
            </tr>
          )}
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
                    : line.sourceKey === "INSTALLATION" && installationDiscount > 0
                      ? <OriginalPrice amount={numberValue(line.systemAmount)} label="Before discount" />
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
          {discount > 0 && (
            <tr className="border-t text-emerald-700">
              <td className="px-4 py-3">Additional discount</td>
              <td className="px-4 py-3 text-right">−{formatMoney(discount)}</td>
              <td className="px-4 py-3 text-right">—</td>
            </tr>
          )}
          {hasCharges && (
            <tr className="border-t border-slate-200 bg-slate-50/60 font-semibold">
              <td className="px-4 py-3">Services total</td>
              <td className="px-4 py-3 text-right">
                {formatMoney(numberValue(summary.systemTotal) - discount)}
              </td>
              <td className="px-4 py-3 text-right">
                {formatMoney(numberValue(summary.customerTotal))}
              </td>
            </tr>
          )}
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
    <div className="break-inside-avoid min-w-0 overflow-x-auto rounded-lg border border-slate-200 print:overflow-visible">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
        Project scope
      </div>
      <div className="px-4 py-1">
        {customerLines.length === 0 && (
          <MoneyRow label="Installation" value="Not included" />
        )}
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
  discount = 0,
}: {
  summary: EstimateInstallationReportSummary | null;
  discount?: number;
}) {
  if (!summary) {
    return <NotIncludedInstallation />;
  }

  return (
    <div className="break-inside-avoid min-w-0 overflow-x-auto rounded-lg border border-slate-200 print:overflow-visible">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
        Installation &amp; services
      </div>
      <div className="px-4 py-1">
        <MoneyRow label="Installation">
          <span className="flex flex-wrap items-center justify-end gap-2">
            {summary.installationAmount == null
              ? "Pending"
              : discount > 0
                ? <OriginalPrice amount={numberValue(summary.installationAmount)} label="Before discount" />
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

            {discount > 0 && (
              <>
                <MoneyRow label="Additional discount · Installation" value={`−${formatMoney(discount)}`} />
                <MoneyRow
                  label="Installation total"
                  value={formatMoney(numberValue(summary.installationTotal) - discount)}
                  strong
                />
              </>
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

function NotIncludedInstallation({
  title = "Installation & services",
}: {
  title?: string;
}) {
  return (
    <div className="break-inside-avoid min-w-0 rounded-lg border border-slate-200">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
        {title}
      </div>
      <div className="px-4 py-1">
        <MoneyRow label="Installation" value="Not included" />
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
    return <NotIncludedInstallation title="Project scope" />;
  }

  return (
    <div className="break-inside-avoid min-w-0 overflow-x-auto rounded-lg border border-slate-200 print:overflow-visible">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
        Project scope
      </div>
      <div className="px-4 py-1">
        <MoneyRow label="Installation" />

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
  const factoryRate = numberValue(estimate.rateT);
  const manual = estimate.manualDiscountSummary;
  const internalMaterialSubtotal = manual?.payer === "ACCOUNT_OWNER" ? Number(manual.material.subtotal) : numberValue(estimate.priceT);
  const materialSaleSubtotal = internalDealer
    ? manual?.payer === "CUSTOMER" ? Number(manual.material.subtotal) : numberValue(estimate.customerPriceT)
    : internalMaterialSubtotal;
  const estimatedCompanyProfit = roundMoney(materialSaleSubtotal - factoryRate);
  const saleChannel = ownerIsDealer
    ? `${estimate.dealerModeSnapshot ?? "EXTERNAL"} DEALER`
    : "DIRECT CLIENT";

  return (
    <div className="break-inside-avoid rounded-xl border bg-white p-5 shadow-sm">
      <div>
        <h4 className="text-lg font-semibold text-black">
          Material financial summary
        </h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Installation profit is not included in these figures.
        </p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
        <div>
          <div className="text-muted-foreground">Sale channel</div>
          <div className="font-medium">{saleChannel}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Material sale subtotal</div>
          <div className="font-medium">{formatMoney(materialSaleSubtotal)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Estimated factory cost</div>
          <div className="font-medium">{formatMoney(factoryRate)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Estimated material profit</div>
          <div className="font-medium">
            {formatMoney(estimatedCompanyProfit)}
          </div>
        </div>
      </div>
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
  const hideDealerPromotions =
    (reportKind === "dealer-customer" ||
      reportKind === "dealer-customer-total") &&
    !customerCanSeePromotions(estimate);
  const internalMaterial: MaterialTotals = {
    discount: numberValue(estimate.discountAmount),
    subtotal: numberValue(estimate.priceT),
    taxRate: numberValue(estimate.taxRate),
    taxAmount: numberValue(estimate.taxAmount),
    total: numberValue(estimate.totalPayable),
  };
  const customerMaterial: MaterialTotals = {
    discount: hideDealerPromotions
      ? 0
      : numberValue(estimate.customerDiscountAmount),
    subtotal: numberValue(estimate.customerPriceT),
    taxRate: numberValue(estimate.customerTaxRate),
    taxAmount: numberValue(estimate.customerTaxAmount),
    total: numberValue(estimate.customerTotalPayable),
  };
  const manualDiscount = hideDealerPromotions ? null : estimate.manualDiscountSummary;
  const manualMaterial = manualDiscount?.payer === 'CUSTOMER' ? customerMaterial : internalMaterial;
  if (manualDiscount) {
    manualMaterial.taxAmount = Number(manualDiscount.material.tax);
    manualMaterial.total = Number(manualDiscount.material.total);
    manualMaterial.manualNetDiscount = Number(manualDiscount.material.netDiscount);
  }
  const serviceDiscount = Number(manualDiscount?.installation.discount ?? 0) + Number(manualDiscount?.permit.discount ?? 0) + Number(manualDiscount?.city.discount ?? 0);
  const otherServiceDiscount = roundMoney(serviceDiscount - numberValue(manualDiscount?.installation.discount));
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
    : sharedCharges - (manualDiscount?.payer === "CUSTOMER" ? serviceDiscount : 0);
  const internalCharges = sharedCharges - (manualDiscount?.payer === "ACCOUNT_OWNER" ? serviceDiscount : 0);
  const dealerMaterialProfit = roundMoney(
    customerMaterial.subtotal - (customerMaterial.manualNetDiscount ?? 0) -
      (internalMaterial.subtotal - (internalMaterial.manualNetDiscount ?? 0)),
  );
  const dealerServiceProfit = roundMoney(customerServiceCharges - internalCharges);
  const internalProjectTotal = roundMoney(
    internalMaterial.total + internalCharges,
  );
  const customerProjectTotal = roundMoney(
    customerMaterial.total + customerServiceCharges,
  );
  const calculatedSelectedProjectTotal = roundMoney(
    selectedMaterial.total +
      (customerFacing ? customerServiceCharges : internalCharges),
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
        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2 print:grid-cols-2">
          <div className="min-w-0 break-inside-avoid">
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
              discount={manualDiscount?.payer === "ACCOUNT_OWNER" ? serviceDiscount : 0}
              installationDiscount={numberValue(manualDiscount?.installation.discount)}
            />
          ) : (
            <InstallationSummary summary={installationSummary} discount={numberValue(manualDiscount?.installation.discount)} />
          )}
        </div>
      )}

      {!projectTotalOnly && !(comparisonView && externalDealerCharges) && otherServiceDiscount > 0 && <MoneyRow label="Additional discount · Installation & services" value={`−${formatMoney(otherServiceDiscount)}`} />}
      {!projectTotalOnly && <ManualDiscountSummary summary={manualDiscount} />}
      <div
        className={`break-inside-avoid rounded-xl border px-5 py-3 ${
          comparisonView
            ? "border-blue-200 bg-blue-50"
            : "border-emerald-300 bg-emerald-50 px-6 py-5 [&>div>span:first-child]:text-lg [&>div>span:first-child]:uppercase [&>div>span:first-child]:tracking-wide [&>div>span:last-child]:text-2xl sm:[&>div>span:last-child]:text-3xl"
        }`}
      >
        {comparisonView ? (
          <>
            <MoneyRow
              label="Customer Project Total"
              value={formatMoney(customerProjectTotal)}
              strong
            />
            <MoneyRow
              label="Your Project Cost"
              value={formatMoney(internalProjectTotal)}
              strong
            />
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
        {(!externalDealerCharges || comparisonView) && cityFeePending && (
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

      {comparisonView && (
        <DealerProfitSummary
          materialProfit={dealerMaterialProfit}
          serviceProfit={dealerServiceProfit}
        />
      )}

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
