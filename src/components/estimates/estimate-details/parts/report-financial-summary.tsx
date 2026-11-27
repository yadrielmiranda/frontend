"use client";
import type { CompanyLocale } from "@/components/company/company-content";
import { financialChargeDescription, summaryText } from "@/lib/estimate-financial-language";
import { PaymentScheduleView } from "@/components/payments/payment-schedule";
import { ManualDiscountSummary } from "../../manual-discount-summary";
import type { ReactNode } from "react";
import { DealerProfitSummary } from "../../dealer-profit-summary";
import { DealerEarningsSummaryCard } from "../../dealer-earnings-summary";
import { NetworkProfitBreakdownCard } from "../../network-profit-breakdown-card";
import { internalDealerServiceEarnings } from "@/lib/dealer-service-earnings";
import { MaterialProfitAdjustments } from "../../material-profit-adjustments";
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

function SingleMaterialSummary({ totals, locale }: { totals: MaterialTotals; locale: CompanyLocale }) {
  const t = summaryText(locale);
  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border border-slate-200 print:overflow-visible">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
        {t("Materials")}
      </div>
      <div className="px-4 py-1">
        {Number(totals.discount) > 0 && (
          <>
            <MoneyRow label={t("Before promotion")}>
              <OriginalPrice amount={totals.subtotal + totals.discount!} label={t("Before promotion")} />
            </MoneyRow>
            <MoneyRow label={t("Promotion discount")}>
              <span className="text-red-600">
                −{formatMoney(totals.discount!)}
              </span>
            </MoneyRow>
          </>
        )}
        <MoneyRow
          label={t("Material subtotal")}
          value={formatMoney(totals.subtotal)}
          accentValue={Number(totals.discount) > 0}
        >
          {Number(totals.manualNetDiscount) > 0 ? (
            <OriginalPrice amount={totals.subtotal} label={t("Before discount")} />
          ) : null}
        </MoneyRow>
        {Number(totals.manualNetDiscount) > 0 && <>
          <MoneyRow label={t("Additional discount")} value={`−${formatMoney(totals.manualNetDiscount!)}`} />
          <MoneyRow label={t("Subtotal after discount")} value={formatMoney(totals.subtotal - totals.manualNetDiscount!)} accentValue />
        </>}
        <MoneyRow
          label={`${t("Sales Tax")} (${(totals.taxRate * 100).toFixed(2)}%)`}
          value={formatMoney(totals.taxAmount)}
        />
        <div className="border-t border-slate-200">
          <MoneyRow
            label={t("Material total")}
            value={formatMoney(totals.total)}
            strong
          />
        </div>
      </div>
    </div>
  );
}

function ComparativeMaterialSummary({
  locale,
  internal,
  customer,
  adminView,
}: {
  locale: CompanyLocale;
  internal: MaterialTotals;
  customer: MaterialTotals;
  adminView: boolean;
}) {
  const t = summaryText(locale);
  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border border-slate-200 print:overflow-visible">
      <table className="w-full table-fixed text-sm print:text-[10px] print:[&_td]:px-2 print:[&_th]:px-2">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-black">
          <tr>
            <th className="w-[44%] px-4 py-3 text-left">{t("Material pricing")}</th>
            <th className="px-4 py-3 text-right">
              {adminView ? t("Dealer Price") : t("Your Cost")}
            </th>
            <th className="px-4 py-3 text-right">{t("Customer Price")}</th>
          </tr>
        </thead>
        <tbody>
          {(Number(internal.discount) > 0 || Number(customer.discount) > 0) && (
            <>
              <tr className="border-t">
                <td className="px-4 py-3">{t("Before promotion")}</td>
                <td className="px-4 py-3 text-right">
                  {Number(internal.discount) > 0 ? (
                    <OriginalPrice
                      amount={internal.subtotal + internal.discount!}
                      label={t("Before promotion")}
                    />
                  ) : (
                    formatMoney(internal.subtotal)
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {Number(customer.discount) > 0 ? (
                    <OriginalPrice
                      amount={customer.subtotal + customer.discount!}
                      label={t("Before promotion")}
                    />
                  ) : (
                    formatMoney(customer.subtotal)
                  )}
                </td>
              </tr>
              <tr className="text-red-700">
                <td className="px-4 py-3">{t("Promotion discount")}</td>
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
            <td className="px-4 py-3 text-black">{t("Material subtotal")}</td>
            <td className="px-4 py-3 text-right font-medium">
              {Number(internal.manualNetDiscount) > 0 ? (
                <OriginalPrice
                  amount={internal.subtotal}
                  label={t("Before discount")}
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
                  label={t("Before discount")}
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
            <td className="px-4 py-3">{t("Additional discount")}</td>
            <td className="px-4 py-3 text-right">−{formatMoney(internal.manualNetDiscount ?? 0)}</td>
            <td className="px-4 py-3 text-right">−{formatMoney(customer.manualNetDiscount ?? 0)}</td>
          </tr>
          <tr className="border-t font-semibold text-emerald-700">
            <td className="px-4 py-3">{t("Subtotal after discount")}</td>
            <td className="px-4 py-3 text-right">{formatMoney(internal.subtotal - (internal.manualNetDiscount ?? 0))}</td>
            <td className="px-4 py-3 text-right">{formatMoney(customer.subtotal - (customer.manualNetDiscount ?? 0))}</td>
          </tr>
          </>}
          <tr className="border-t border-slate-200">
            <td className="px-4 py-3 text-black">{t("Sales Tax")}</td>
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
            <td className="px-4 py-3">{t("Material total")}</td>
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
  locale,
  summary,
  comparison,
  discount = 0,
  installationDiscount = 0,
  customerDiscount = 0,
}: {
  locale: CompanyLocale;
  summary: EstimateCustomerChargeSummary;
  comparison: boolean;
  discount?: number;
  installationDiscount?: number;
  customerDiscount?: number;
}) {
  const t = summaryText(locale);
  const customerLines = summary.lines.filter(
    (line) => line.usedInCustomerQuote,
  );
  const displayedLines = comparison ? summary.lines : customerLines;

  const hasCharges = displayedLines.length > 0;

  if (!comparison) {
    return (
      <div className="break-inside-avoid min-w-0 overflow-x-auto rounded-lg border border-slate-200 print:overflow-visible">
        <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
          {t("Installation & services")}
        </div>
        <div className="px-4 py-1">
          {!hasCharges && (
            <MoneyRow label={t("Installation")} value={t("Not included")} />
          )}
          {displayedLines.map((line) => (
            <MoneyRow
              key={line.sourceKey ?? `dealer-${line.id}-${line.sortOrder}`}
              label={financialChargeDescription(locale, line)}
              value={
                line.customerAmount == null
                  ? t("Pending")
                  : formatMoney(numberValue(line.customerAmount))
              }
            />
          ))}
          {customerDiscount > 0 && <MoneyRow label={t("Additional discount · Installation & services")} value={`−${formatMoney(customerDiscount)}`} />}
        </div>
      </div>
    );
  }

  return (
    <div className="break-inside-avoid min-w-0 overflow-x-auto rounded-lg border border-slate-200 print:overflow-visible">
      <table className="w-full table-fixed text-sm print:text-[10px] print:[&_td]:px-2 print:[&_th]:px-2">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-black">
          <tr>
            <th className="w-[44%] px-4 py-3 text-left">{t("Installation & services")}</th>
            <th className="px-4 py-3 text-right">{t("Your Cost")}</th>
            <th className="px-4 py-3 text-right">{t("Customer Price")}</th>
          </tr>
        </thead>
        <tbody>
          {!hasCharges && (
            <tr className="border-t border-slate-200">
              <td className="px-4 py-3 text-black">{t("Installation")}</td>
              <td className="px-4 py-3 text-right font-medium">{t("Not included")}</td>
              <td className="px-4 py-3 text-right font-medium">{t("Not included")}</td>
            </tr>
          )}
          {displayedLines.map((line) => (
            <tr
              key={line.sourceKey ?? `dealer-${line.id}-${line.sortOrder}`}
              className="border-t border-slate-200"
            >
              <td className="px-4 py-3 text-black">
                {financialChargeDescription(locale, line)}
                {line.origin === "DEALER" && (
                  <span className="ml-2 text-[11px] text-black">
                    {t("Dealer-created")}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {line.origin === "DEALER"
                  ? "—"
                  : line.systemAmount == null
                    ? t("Pending")
                    : line.sourceKey === "INSTALLATION" && installationDiscount > 0
                      ? <OriginalPrice amount={numberValue(line.systemAmount)} label={t("Before discount")} />
                      : formatMoney(numberValue(line.systemAmount))}
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {!line.usedInCustomerQuote
                  ? t("Not used")
                  : line.customerAmount == null
                    ? t("Pending")
                    : formatMoney(numberValue(line.customerAmount))}
              </td>
            </tr>
          ))}
          {(discount > 0 || customerDiscount > 0) && (
            <tr className="border-t text-emerald-700">
              <td className="px-4 py-3">{t("Additional discount")}</td>
              <td className="px-4 py-3 text-right">{discount > 0 ? `−${formatMoney(discount)}` : "—"}</td>
              <td className="px-4 py-3 text-right">{customerDiscount > 0 ? `−${formatMoney(customerDiscount)}` : "—"}</td>
            </tr>
          )}
          {hasCharges && (
            <tr className="border-t border-slate-200 bg-slate-50/60 font-semibold">
              <td className="px-4 py-3">{t("Services total")}</td>
              <td className="px-4 py-3 text-right">
                {formatMoney(numberValue(summary.systemTotal) - discount)}
              </td>
              <td className="px-4 py-3 text-right">
                {formatMoney(numberValue(summary.customerTotal) - customerDiscount)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ExternalDealerProjectScope({
  locale,
  summary,
}: {
  locale: CompanyLocale;
  summary: EstimateCustomerChargeSummary;
}) {
  const t = summaryText(locale);
  const customerLines = summary.lines.filter(
    (line) => line.usedInCustomerQuote,
  );

  return (
    <div className="break-inside-avoid min-w-0 overflow-x-auto rounded-lg border border-slate-200 print:overflow-visible">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
        {t("Project scope")}
      </div>
      <div className="px-4 py-1">
        {customerLines.length === 0 && (
          <MoneyRow label={t("Installation")} value={t("Not included")} />
        )}
        {customerLines.map((line) => (
          <MoneyRow
            key={line.sourceKey ?? `dealer-${line.id}-${line.sortOrder}`}
            label={financialChargeDescription(locale, line)}
            value={line.customerAmount == null ? t("Pending") : t("Included")}
          />
        ))}
      </div>
    </div>
  );
}

function InstallationSummary({
  locale,
  summary,
  discount = 0,
}: {
  locale: CompanyLocale;
  summary: EstimateInstallationReportSummary | null;
  discount?: number;
}) {
  const t = summaryText(locale);
  if (!summary) {
    return <NotIncludedInstallation locale={locale} />;
  }

  return (
    <div className="break-inside-avoid min-w-0 overflow-x-auto rounded-lg border border-slate-200 print:overflow-visible">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
        {t("Installation & services")}
      </div>
      <div className="px-4 py-1">
        <MoneyRow label={t("Installation")}>
          <span className="flex flex-wrap items-center justify-end gap-2">
            {summary.installationAmount == null
              ? t("Pending")
              : discount > 0
                ? <OriginalPrice amount={(numberValue(summary.installationAmount) - numberValue(summary.installationSurcharge))} label={t("Before discount")} />
                : formatMoney((numberValue(summary.installationAmount) - numberValue(summary.installationSurcharge)))}
          </span>
        </MoneyRow>

        {numberValue(summary.installationSurcharge) > 0 && <MoneyRow label={t("Installation surcharge")} value={formatMoney(numberValue(summary.installationSurcharge))} />}
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
              <MoneyRow label={t("Additional services")} value={t("None included")} />
            )}

            {discount > 0 && (
              <>
                <MoneyRow label={t("Additional discount · Installation")} value={`−${formatMoney(discount)}`} />
                <MoneyRow
                  label={t("Installation total")}
                  value={formatMoney(numberValue(summary.installationTotal) - discount)}
                  strong
                />
              </>
            )}

            {summary.permitIncluded ? (
              <div className="mt-1 border-t border-slate-200 pt-1">
                <p className="py-2 text-sm font-semibold text-black">
                  {t("Permit management")}
                </p>
                <div className="border-l-2 border-slate-200 pl-3">
                  <MoneyRow
                    label={t("Permit Fee")}
                    value={formatMoney(numberValue(summary.permitFee))}
                  />
                  <MoneyRow
                    label={t("City Fee")}
                    value={
                      summary.cityFee == null
                        ? t("Pending")
                        : formatMoney(numberValue(summary.cityFee))
                    }
                  />
                </div>
              </div>
            ) : (
              <MoneyRow label={t("Permit management")} value={t("Not included")} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function NotIncludedInstallation({
  locale,
  title,
}: {
  locale: CompanyLocale;
  title?: string;
}) {
  const t = summaryText(locale);
  return (
    <div className="break-inside-avoid min-w-0 rounded-lg border border-slate-200">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
        {title ?? t("Installation & services")}
      </div>
      <div className="px-4 py-1">
        <MoneyRow label={t("Installation")} value={t("Not included")} />
      </div>
    </div>
  );
}

function ProjectScopeSummary({
  locale,
  summary,
}: {
  locale: CompanyLocale;
  summary: EstimateInstallationReportSummary | null;
}) {
  const t = summaryText(locale);
  if (!summary) {
    return <NotIncludedInstallation locale={locale} title={t("Project scope")} />;
  }

  return (
    <div className="break-inside-avoid min-w-0 overflow-x-auto rounded-lg border border-slate-200 print:overflow-visible">
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-black">
        {t("Project scope")}
      </div>
      <div className="px-4 py-1">
        <MoneyRow label={t("Installation")} />

        {summary.quoteStatus !== null ? (
          <>
            {summary.additionalServices.length > 0 ? (
              summary.additionalServices.map((service) => (
                <MoneyRow
                  key={service.serviceId}
                  label={service.name}
                  value={t("Included")}
                />
              ))
            ) : (
              <MoneyRow label={t("Additional services")} value={t("None included")} />
            )}

            {summary.permitIncluded ? (
              <div className="mt-1 border-t border-slate-200 pt-1">
                <p className="py-2 text-sm font-semibold text-black">
                  {t("Permit management")}
                </p>
                <div className="border-l-2 border-slate-200 pl-3">
                  <MoneyRow label={t("Permit Fee")} value={t("Included")} />
                  <MoneyRow
                    label={t("City Fee")}
                    value={summary.cityFee == null ? t("Pending") : t("Included")}
                  />
                </div>
              </div>
            ) : (
              <MoneyRow label={t("Permit management")} value={t("Not included")} />
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function AdminProfitability({
  locale,
  estimate,
  ownerIsDealer,
}: {
  locale: CompanyLocale;
  estimate: EstimateWithRelations;
  ownerIsDealer: boolean;
}) {
  const t = summaryText(locale);
  const internalDealer =
    ownerIsDealer && estimate.dealerModeSnapshot === "INTERNAL";
  const factoryRate = numberValue(internalDealer ? estimate.order?.rate ?? estimate.rateT : estimate.rateT);
  const manual = estimate.manualDiscountSummary;
  const internalMaterialSubtotal = manual?.payer === "ACCOUNT_OWNER" ? Number(manual.material.subtotal) : numberValue(estimate.priceT);
  const materialSaleSubtotal = estimate.dealerNetwork ? Number(estimate.order?.saleSubtotal ?? manual?.material.subtotal ?? estimate.networkBillingPriceT ?? 0) : internalDealer
    ? estimate.order?.saleSubtotal ?? (manual?.payer === "CUSTOMER" ? Number(manual.material.subtotal) : numberValue(estimate.customerPriceT))
    : internalMaterialSubtotal;
  const estimatedCompanyProfit = roundMoney(materialSaleSubtotal - factoryRate);
  const saleChannel = ownerIsDealer
    ? (estimate.dealerModeSnapshot === "INTERNAL" ? t("INTERNAL DEALER") : t("EXTERNAL DEALER"))
    : t("DIRECT CLIENT");

  return (
    <div className="break-inside-avoid rounded-xl border bg-white p-5 shadow-sm">
      <div>
        <h4 className="text-lg font-semibold text-black">
          {t("Material financial summary")}
        </h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("Installation profit is not included in these figures.")}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
        <div>
          <div className="text-muted-foreground">{t("Sale channel")}</div>
          <div className="font-medium">{saleChannel}</div>
        </div>
        <div>
          <div className="text-muted-foreground">{t("Material sale subtotal")}</div>
          <div className="font-medium">{formatMoney(materialSaleSubtotal)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">{internalDealer ? t("App base price (before markups)") : t("Estimated factory cost")}</div>
          <div className="font-medium">{formatMoney(factoryRate)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">{internalDealer ? t("Expected material profit") : t("Estimated material profit")}</div>
          <div className="font-medium">
            {formatMoney((internalDealer || estimate.dealerNetwork) && estimate.materialProfits ? Number(estimate.materialProfits.expectedProfit) : estimatedCompanyProfit)}
          </div>
        </div>
        {estimate.materialProfits && (
          <>
            <div>
              <div className="text-muted-foreground">{estimate.materialProfits.processingCostStatus ? t("Gross real material profit") : t("Real material profit")}</div>
              <div className="font-medium">{estimate.materialProfits.realProfit == null ? t("Pending real factory cost") : formatMoney(Number(estimate.materialProfits.realProfit))}</div>
            </div>
            <MaterialProfitAdjustments
              locale={locale}
              profits={estimate.materialProfits}
              referralCosts={estimate.referralCosts}
              showDealerEarnings={internalDealer || Boolean(estimate.dealerEarnings || estimate.subdealerEarnings)}
            />
          </>
        )}
      </div>
    </div>
  );
}

export function ReportFinancialSummary({
  locale = "en",
  isAdmin = false,
  estimate,
  reportKind,
  installationSummary = estimate.installationSummary ?? null,
  showPaymentSchedule = true,
}: {
  locale?: CompanyLocale;
  estimate: EstimateWithRelations;
  reportKind: EstimateReportKind;
  isAdmin?: boolean;
  installationSummary?: EstimateInstallationReportSummary | null;
  showPaymentSchedule?: boolean;
}) {
  const t = summaryText(locale);
  const showNetworkProfit = isAdmin && reportKind === "admin" && Boolean(estimate.networkProfitBreakdown);
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
    ? numberValue(externalDealerCharges.customerTotal) - (manualDiscount?.payer === "CUSTOMER" ? serviceDiscount : 0)
    : sharedCharges - (manualDiscount?.payer === "CUSTOMER" ? serviceDiscount : 0);
  const internalCharges = sharedCharges - (manualDiscount?.payer === "ACCOUNT_OWNER" ? serviceDiscount : 0);
  const dealerMaterialProfit = roundMoney(
    customerMaterial.subtotal - (customerMaterial.manualNetDiscount ?? 0) -
      (internalMaterial.subtotal - (internalMaterial.manualNetDiscount ?? 0)),
  );
  const dealerServiceProfit = roundMoney(customerServiceCharges - internalCharges);
  const serviceEarnings = internalDealerServiceEarnings({
    dealerMode: estimate.dealerModeSnapshot, network: estimate.dealerNetwork, summary: estimate.customerChargesSummary,
  });
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
    ? t("Current Project Total")
    : t("Project Total");

  return (
    <section className="mt-10 space-y-4">
      <div>
        <h3 className="text-lg font-bold uppercase tracking-wide text-black">
          {t("Project Summary")}
        </h3>
      </div>

      {installationSummary?.installationAddress && <p className="text-sm"><strong>{t("Installation address")}: </strong>{[installationSummary.installationAddress.street, installationSummary.installationAddress.addressLine2, installationSummary.installationAddress.city, installationSummary.installationAddress.state, installationSummary.installationAddress.postalCode].filter(Boolean).join(", ")}</p>}
      {projectTotalOnly ? (
        externalDealerCharges ? (
          <ExternalDealerProjectScope locale={locale} summary={externalDealerCharges} />
        ) : (
          <ProjectScopeSummary locale={locale} summary={installationSummary} />
        )
      ) : (
        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2 print:grid-cols-2">
          <div className="min-w-0 break-inside-avoid">
            {comparisonView ? (
              <ComparativeMaterialSummary
                locale={locale}
                internal={internalMaterial}
                customer={customerMaterial}
                adminView={reportKind === "admin"}
              />
            ) : (
              <SingleMaterialSummary locale={locale} totals={selectedMaterial} />
            )}
          </div>

          {externalDealerCharges ? (
            <ExternalDealerChargesSummary
              locale={locale}
              summary={externalDealerCharges}
              comparison={comparisonView}
              discount={manualDiscount?.payer === "ACCOUNT_OWNER" ? serviceDiscount : 0}
              installationDiscount={manualDiscount?.payer === "ACCOUNT_OWNER" ? numberValue(manualDiscount.installation.discount) : 0}
              customerDiscount={manualDiscount?.payer === "CUSTOMER" ? serviceDiscount : 0}
            />
          ) : (
            <InstallationSummary locale={locale} summary={installationSummary} discount={numberValue(manualDiscount?.installation.discount)} />
          )}
        </div>
      )}

      {!projectTotalOnly && !externalDealerCharges && otherServiceDiscount > 0 && <MoneyRow label={t("Additional discount · Installation & services")} value={`−${formatMoney(otherServiceDiscount)}`} />}
      {!projectTotalOnly && <ManualDiscountSummary locale={locale} summary={manualDiscount} />}
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
              label={t("Customer Project Total")}
              value={formatMoney(customerProjectTotal)}
              strong
            />
            <MoneyRow
              label={t("Your Project Cost")}
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
            {t("Installation amount is pending.")}
          </p>
        )}
        {(!externalDealerCharges || comparisonView) && cityFeePending && (
          <p className="pb-1 text-xs font-medium text-amber-800">
            {t("Final total is pending the City Fee.")}
          </p>
        )}
        {!externalDealerCharges &&
          preliminaryInstallation &&
          !installationAmountPending && (
            <p className="pb-1 text-xs text-blue-800">
              {t("Installation is proposed and is not yet confirmed.")}
            </p>
          )}
        {externalDealerCharges?.customerTotalIncomplete && customerFacing && (
          <p className="pb-1 text-xs font-medium text-amber-800">
            {t("Customer service pricing is incomplete.")}
          </p>
        )}
      </div>

      {showNetworkProfit ? (
        <NetworkProfitBreakdownCard locale={locale} breakdown={estimate.networkProfitBreakdown} isAdmin={isAdmin} />
      ) : comparisonView && (estimate.dealerModeSnapshot === "INTERNAL" || estimate.dealerEarnings) ? (
        <DealerEarningsSummaryCard locale={locale} earnings={estimate.dealerEarnings} serviceProfit={serviceEarnings.dealer} />
      ) : comparisonView && (
        <DealerProfitSummary
          locale={locale}
          materialProfit={estimate.dealerNetwork?.materialProfit != null ? Number(estimate.dealerNetwork.materialProfit) : dealerMaterialProfit}
          serviceProfit={estimate.dealerNetwork && !estimate.dealerNetwork.viewerIsOwner ? 0 : dealerServiceProfit}
        />
      )}

      {!showNetworkProfit && reportKind === "admin" && estimate.subdealerEarnings && <DealerEarningsSummaryCard locale={locale} label={serviceEarnings.subdealer === undefined ? t("Subdealer material earnings") : t("Subdealer Profit")} earnings={estimate.subdealerEarnings} serviceProfit={serviceEarnings.subdealer} />}

      {reportKind === "admin" && (
        <AdminProfitability locale={locale} estimate={estimate} ownerIsDealer={ownerIsDealer} />
      )}

      {!(customerFacing && estimate.dealerModeSnapshot === "EXTERNAL") && (
        <div className={showPaymentSchedule ? undefined : "hidden print:block"}>
          <PaymentScheduleView locale={locale} schedule={estimate.paymentSchedule} termsOnly />
        </div>
      )}

      <p className="pt-1 text-[11px] text-black">
        {t("Product illustrations are visual references and are not to scale; written specifications govern.")}
      </p>
    </section>
  );
}
