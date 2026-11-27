"use client";

import { ManualDiscountSummary } from "./manual-discount-summary";
import type { EstimateDiscountSummary } from "@/lib/estimate-discount";
import type { ReactNode } from "react";
import type { CompanyLocale } from "@/components/company/company-content";
import { financialChargeDescription, summaryText } from "@/lib/estimate-financial-language";
import { ReceiptText } from "lucide-react";
import { OriginalPrice } from "@/components/promotions/promotion-price";

import type {
  DealerMode,
  EstimateCustomerChargeSummary,
  EstimateRevisionTotals,
  InstallationJob,
  InstallationQuote,
} from "@/lib/types";
import { formatMoney, roundMoney } from "@/lib/formatters";
import { paidBaseFor, paidInstallationCredit } from "@/lib/installation-flow";
import { additionalServiceTotals } from "@/lib/installation-service-totals";
import { customerChargeAdditions } from "@/lib/customer-charge-additions";
import { canSetCustomerOnEstimate } from "@/lib/rbac";
import { DealerProfitSummary } from "./dealer-profit-summary";
import { DealerEarningsSummaryCard } from "./dealer-earnings-summary";
import { NetworkProfitBreakdownCard } from "./network-profit-breakdown-card";
import type { NetworkProfitBreakdown } from "@/lib/network-profit-breakdown";
import type { DealerEarningsSummary } from "@/lib/dealer-earnings";
import { internalDealerServiceEarnings } from "@/lib/dealer-service-earnings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PiecesBreakdownBar } from "./pieces-breakdown-bar";

export type EstimateFinancialMaterialSummary = {
  discountAmount?: number;
  customerDiscountAmount?: number;
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

function DealerServiceSummary({
  locale,
  summary,
  discount = 0,
  installationDiscount = 0,
  customerDiscount = 0,
}: {
  locale: CompanyLocale;
  summary: EstimateCustomerChargeSummary | null;
  discount?: number;
  installationDiscount?: number;
  customerDiscount?: number;
}) {
  const t = summaryText(locale);
  const lines = summary?.lines ?? [];

  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border">
      <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
        <span>{t("Installation & services")}</span>
        <span className="text-right">{t("Your Cost")}</span>
        <span className="text-right">{t("Customer Price")}</span>
      </div>

      {lines.length === 0 && (
        <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] items-center gap-3 border-t px-4 py-2.5 text-sm">
          <span className="text-slate-700">{t("Installation")}</span>
          <span className="text-right font-medium">{t("Not included")}</span>
          <span className="text-right font-medium">{t("Not included")}</span>
        </div>
      )}
      {lines.map((line) => (
          <div
            key={line.sourceKey ?? `dealer-${line.id}`}
            className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] items-center gap-3 border-t px-4 py-2.5 text-sm"
          >
            <span className="text-slate-700">
              {financialChargeDescription(locale, line)}
              {line.origin === "DEALER" && (
                <span className="ml-2 text-[11px] text-slate-500">
                  {t("Dealer-created")}
                </span>
              )}
            </span>
            <span className="text-right font-medium">
              {line.origin === "DEALER"
                ? "—"
                : line.systemAmount == null
                  ? t("Pending")
                  : line.sourceKey === "INSTALLATION" && installationDiscount > 0
                    ? <OriginalPrice amount={numberValue(line.systemAmount)} label={t("Before discount")} />
                    : formatMoney(numberValue(line.systemAmount))}
            </span>
            <span className="text-right font-medium">
              {!line.usedInCustomerQuote
                ? t("Not used")
                : line.customerAmount == null
                  ? t("Pending")
                  : formatMoney(numberValue(line.customerAmount))}
            </span>
          </div>
        ))}

      {(discount > 0 || customerDiscount > 0) && <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] gap-3 border-t px-4 py-2.5 text-sm text-emerald-700"><span>{t("Additional discount")}</span><span className="text-right">{discount > 0 ? `−${formatMoney(discount)}` : "—"}</span><span className="text-right">{customerDiscount > 0 ? `−${formatMoney(customerDiscount)}` : "—"}</span></div>}
      {summary && lines.length > 0 && (
        <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] items-center gap-3 border-t bg-slate-50/60 px-4 py-3 text-sm font-semibold">
          <span>{t("Services total")}</span>
          <span className="text-right">
            {formatMoney(numberValue(summary.systemTotal) - discount)}
          </span>
          <span className="text-right">
            {formatMoney(numberValue(summary.customerTotal) - customerDiscount)}
          </span>
        </div>
      )}
    </div>
  );
}

export function EstimateFinancialSummary({
  locale = "en",
  isAdmin = false,
  networkProfitBreakdown,
  ownerRole,
  dealerMode,
  dealerEarnings,
  subdealerEarnings,
  dealerNetwork,
  earningsPending = false,
  serviceEarningsPending = false,
  ownerIsTaxExempt,
  taxRate,
  customerTaxRatePercent,
  materialSummary,
  installationJob,
  customerChargesSummary: savedCustomerChargesSummary,
  manualDiscount: savedManualDiscount,
  discountEditor,
}: {
  locale?: CompanyLocale;
  isAdmin?: boolean;
  networkProfitBreakdown?: NetworkProfitBreakdown | null;
  manualDiscount?: EstimateDiscountSummary | null;
  discountEditor?: ReactNode;
  ownerRole: string;
  dealerMode: DealerMode | null;
  dealerEarnings?: DealerEarningsSummary | null;
  subdealerEarnings?: DealerEarningsSummary | null;
  dealerNetwork?: import("@/lib/types").EstimateDealerNetwork | null;
  earningsPending?: boolean;
  serviceEarningsPending?: boolean;
  ownerIsTaxExempt: boolean;
  taxRate: number;
  customerTaxRatePercent: number;
  materialSummary: EstimateFinancialMaterialSummary;
  installationJob: InstallationJob | null;
  customerChargesSummary: EstimateCustomerChargeSummary | null;
}) {
  const t = summaryText(locale);
  const showNetworkProfit = isAdmin && Boolean(networkProfitBreakdown);
  const isDealerEstimate = canSetCustomerOnEstimate(ownerRole);
  const isExternalDealer = isDealerEstimate && dealerMode === "EXTERNAL";
  const activeJob =
    installationJob && installationJob.status !== "CANCELED"
      ? installationJob
      : null;
  // Al remover la instalación, ignora los importes anteriores mientras se refrescan.
  const manualDiscount =
    !activeJob && savedManualDiscount?.scope === "INSTALLATION"
      ? null
      : savedManualDiscount;
  let customerChargesSummary = savedCustomerChargesSummary;
  if (!activeJob && savedCustomerChargesSummary) {
    const lines = savedCustomerChargesSummary.lines.filter(
      (line) => line.origin === "DEALER",
    );
    const customerLines = lines.filter((line) => line.usedInCustomerQuote);
    const customerTotal = roundMoney(
      customerLines.reduce((total, line) => total + numberValue(line.customerAmount), 0),
    );
    customerChargesSummary = {
      ...savedCustomerChargesSummary,
      lines,
      systemTotal: 0,
      customerTotal,
      knownSystemMargin: 0,
      dealerCreatedTotal: customerTotal,
      systemTotalIncomplete: false,
      customerTotalIncomplete: customerLines.some((line) => line.customerAmount == null),
    };
  }
  const quote =
    activeJob?.quotes.find((candidate) => candidate.status !== "REJECTED") ??
    null;
  const revisionTotals = pendingRevisionTotals(activeJob, quote);
  const serviceEarnings = internalDealerServiceEarnings({
    dealerMode, network: dealerNetwork, summary: customerChargesSummary,
    pending: serviceEarningsPending || Boolean(revisionTotals),
  });

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

  const manualMaterial = manualDiscount?.payer === 'CUSTOMER' ? customerMaterial : internalMaterial;
  if (manualDiscount) {
    manualMaterial.taxAmount = Number(manualDiscount.material.tax);
    manualMaterial.total = Number(manualDiscount.material.total);
  }
  const materialDiscount = numberValue(
    revisionTotals?.discountAmount ??
      installationJob?.estimate.discountAmount ??
      materialSummary.discountAmount,
  );
  const customerMaterialDiscount = numberValue(
    revisionTotals?.customerDiscountAmount ??
      installationJob?.estimate.customerDiscountAmount ??
      materialSummary.customerDiscountAmount,
  );

  const extras = additionalServiceTotals(quote);
  const additionalServicesTotal = roundMoney(
    extras.reduce((total, service) => total + service.amount, 0),
  );
  const quoteTotal = activeJob
    ? numberValue(manualDiscount?.installation.total ?? quote?.total)
    : 0;
  // The residual is the single Installation amount: every automatic line plus
  // service/profile minimum adjustments that must remain internal.
  const baseInstallationTotal = roundMoney(
    numberValue(quote?.total) - additionalServicesTotal - numberValue(quote?.installationSurcharge),
  );
  const permitFee = activeJob
    ? numberValue(manualDiscount?.permit.total ?? activeJob.permit?.permitFeeSnapshot)
    : 0;
  const cityFee =
    activeJob?.permit?.cityFee == null
      ? null
      : numberValue(manualDiscount?.city.total ?? activeJob.permit.cityFee);
  const retainedDeposit =
    installationJob?.status === "CANCELED"
      ? paidBaseFor(installationJob, "INSTALLATION_DEPOSIT")
      : 0;
  const depositPaid = activeJob
    ? paidBaseFor(activeJob, "INSTALLATION_DEPOSIT")
    : 0;
  const internalAdditions = customerChargeAdditions(customerChargesSummary, isDealerEstimate && dealerMode === "INTERNAL", Boolean(activeJob));
  const installationBalance = activeJob
    ? roundMoney(Math.max(0, quoteTotal + internalAdditions.installation + internalAdditions.custom - paidInstallationCredit(activeJob)))
    : 0;
  const serviceDiscount = activeJob
    ? numberValue(manualDiscount?.installation.discount) +
      numberValue(manualDiscount?.permit.discount) +
      numberValue(manualDiscount?.city.discount)
    : 0;
  const sharedChargesTotal = roundMoney(quoteTotal + permitFee + (cityFee ?? 0) + retainedDeposit);
  const internalServiceTotal = sharedChargesTotal + (manualDiscount?.payer === 'CUSTOMER' ? serviceDiscount : 0);
  const customerChargesTotal =
    isExternalDealer && customerChargesSummary
      ? numberValue(customerChargesSummary.customerTotal)
      : roundMoney(sharedChargesTotal + (isDealerEstimate && customerChargesSummary
          ? numberValue(customerChargesSummary.customerTotal) - numberValue(customerChargesSummary.systemTotal)
          : 0));
  const internalProjectTotal = roundMoney(
    internalMaterial.total + internalServiceTotal,
  );
  const customerProjectTotal = roundMoney(
    customerMaterial.total + customerChargesTotal,
  );
  const dealerProfit = roundMoney(
    customerMaterial.subtotal - internalMaterial.subtotal + (manualDiscount?.payer === "ACCOUNT_OWNER" ? numberValue(manualDiscount.material.netDiscount) : -numberValue(manualDiscount?.material.netDiscount)), 
  );
  // La ganancia suma los márgenes de material y servicios; los impuestos no son ingreso.
  const dealerServiceProfit = roundMoney(
    customerChargesTotal - internalServiceTotal,
  );
  const cityFeePending = Boolean(activeJob?.permit && cityFee == null);
  const proposedRevision = Boolean(revisionTotals);
  const awaitingDeposit = activeJob?.status === "DEPOSIT_PAYMENT_PENDING";
  const projected = Boolean(activeJob && quote?.status !== "APPROVED");
  const paymentMessage = !activeJob
    ? null
    : activeJob.status === "PERMIT_PAYMENT_PENDING"
      ? t("Permit Fee is due now.")
      : activeJob.status === "MATERIAL_PAYMENT_PENDING"
        ? activeJob.permit
          ? t("Material total and City Fee are due now.")
          : t("Material total is due now.")
        : activeJob.status === "INSTALLATION_PAYMENT_PENDING"
          ? t("The remaining installation balance is due now.")
          : t("No payment is due at this stage.");


  return (
    <Card lang={locale} className="min-w-0 border-slate-300">
      <CardHeader className="min-w-0 px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2">
          <ReceiptText className="h-5 w-5" /> {t("Estimate Summary")}
        </CardTitle>
        <CardDescription>
          {t("Materials, services, fees, and project totals in one place.")}
        </CardDescription>
      </CardHeader>

      <CardContent className="min-w-0 space-y-5 px-4 sm:px-6">
        {discountEditor}
        <PiecesBreakdownBar
          locale={locale}
          totalUnits={materialSummary.totalUnits}
          pieceBreakdown={materialSummary.pieceBreakdown}
        />

        <div
          className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-2"
        >
          {isDealerEstimate ? (
            <div className="min-w-0 overflow-x-auto rounded-lg border">
              <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <span>{t("Material pricing")}</span>
                <span className="text-right">{t("Your Cost")}</span>
                <span className="text-right">{t("Customer Price")}</span>
              </div>
              {(materialDiscount > 0 || customerMaterialDiscount > 0) && (
                <>
                  <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] items-center gap-3 border-t px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">
                      {t("Before promotion")}
                    </span>
                    <span className="text-right">
                      {materialDiscount > 0 ? (
                        <OriginalPrice
                          label={t("Before promotion")}
                          amount={internalMaterial.subtotal + materialDiscount}
                        />
                      ) : (
                        formatMoney(internalMaterial.subtotal)
                      )}
                    </span>
                    <span className="text-right">
                      {customerMaterialDiscount > 0 ? (
                        <OriginalPrice
                          label={t("Before promotion")}
                          amount={
                            customerMaterial.subtotal + customerMaterialDiscount
                          }
                        />
                      ) : (
                        formatMoney(customerMaterial.subtotal)
                      )}
                    </span>
                  </div>
                  <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] items-center gap-3 border-t px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">
                      {t("Promotion discount")}
                    </span>
                    <span className="text-right font-medium text-red-600">
                      −{formatMoney(materialDiscount)}
                    </span>
                    <span className="text-right font-medium text-red-600">
                      −{formatMoney(customerMaterialDiscount)}
                    </span>
                  </div>
                </>
              )}
              <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] items-center gap-3 border-t px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{t("Material subtotal")}</span>
                <span className="text-right font-medium">
                  {manualDiscount?.payer === "ACCOUNT_OWNER" &&
                  numberValue(manualDiscount.material.netDiscount) > 0 ? (
                    <OriginalPrice
                      amount={internalMaterial.subtotal}
                      label={t("Before discount")}
                    />
                  ) : (
                    <span
                      className={
                        materialDiscount > 0 ? "text-emerald-700" : undefined
                      }
                    >
                      {formatMoney(internalMaterial.subtotal)}
                    </span>
                  )}
                </span>
                <span className="text-right font-medium">
                  {manualDiscount?.payer === "CUSTOMER" &&
                  numberValue(manualDiscount.material.netDiscount) > 0 ? (
                    <OriginalPrice
                      amount={customerMaterial.subtotal}
                      label={t("Before discount")}
                    />
                  ) : (
                    <span
                      className={
                        customerMaterialDiscount > 0
                          ? "text-emerald-700"
                          : undefined
                      }
                    >
                      {formatMoney(customerMaterial.subtotal)}
                    </span>
                  )}
                </span>
              </div>
              {Number(manualDiscount?.material.netDiscount) > 0 && <>
              <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] items-center gap-3 border-t px-4 py-2.5 text-sm text-emerald-700">
                <span>{t("Additional discount")}</span>
                <span className="text-right">{manualDiscount?.payer === 'ACCOUNT_OWNER' ? `−${formatMoney(Number(manualDiscount.material.netDiscount))}` : '—'}</span>
                <span className="text-right">{manualDiscount?.payer === 'CUSTOMER' ? `−${formatMoney(Number(manualDiscount.material.netDiscount))}` : '—'}</span>
              </div>
              <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] items-center gap-3 border-t px-4 py-2.5 text-sm font-semibold text-emerald-700">
                <span>{t("Subtotal after discount")}</span>
                <span className="text-right">{formatMoney(manualDiscount?.payer === 'ACCOUNT_OWNER' ? Number(manualDiscount.material.subtotal) : internalMaterial.subtotal)}</span>
                <span className="text-right">{formatMoney(manualDiscount?.payer === 'CUSTOMER' ? Number(manualDiscount.material.subtotal) : customerMaterial.subtotal)}</span>
              </div>
              </>}
              <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] items-center gap-3 border-t px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{t("Sales Tax")}</span>
                <TaxAmount total={internalMaterial} />
                <TaxAmount total={customerMaterial} />
              </div>
              <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,0.45fr)] items-center gap-3 border-t bg-slate-50/60 px-4 py-3 text-sm font-semibold">
                <span>{t("Material total")}</span>
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
              <h4 className="mb-1 text-sm font-semibold">{t("Materials")}</h4>
              {materialDiscount > 0 && (
                <>
                  <SummaryRow label={t("Before promotion")}>
                    <OriginalPrice
                      label={t("Before promotion")}
                      amount={internalMaterial.subtotal + materialDiscount}
                    />
                  </SummaryRow>
                  <SummaryRow label={t("Promotion discount")}>
                    <span className="text-red-600">
                      −{formatMoney(materialDiscount)}
                    </span>
                  </SummaryRow>
                </>
              )}
              <SummaryRow label={t("Material subtotal")}>
                {numberValue(manualDiscount?.material.netDiscount) > 0 ? (
                  <OriginalPrice
                    amount={internalMaterial.subtotal}
                    label={t("Before discount")}
                  />
                ) : (
                  <span
                    className={
                      materialDiscount > 0 ? "text-emerald-700" : undefined
                    }
                  >
                    {formatMoney(internalMaterial.subtotal)}
                  </span>
                )}
              </SummaryRow>
              {Number(manualDiscount?.material.netDiscount) > 0 && <>
                <SummaryRow label={t("Additional discount")} value={`−${formatMoney(Number(manualDiscount?.material.netDiscount))}`} />
                <SummaryRow label={t("Subtotal after discount")}>
                  <span className="font-semibold text-emerald-700">{formatMoney(Number(manualDiscount?.material.subtotal))}</span>
                </SummaryRow>
              </>}
              <SummaryRow
                label={`${t("Sales Tax")} (${(internalMaterial.taxRate * 100).toFixed(2)}%)${ownerIsTaxExempt ? (locale === "es" ? " · Exento" : " · Exempt") : ""}`}
                value={formatMoney(internalMaterial.taxAmount)}
              />
              <div className="mt-1 border-t pt-1">
                <SummaryRow
                  label={t("Material total")}
                  value={formatMoney(internalMaterial.total)}
                  strong
                />
              </div>
            </div>
          )}

          {isDealerEstimate && (isExternalDealer || customerChargesSummary) ? (
            <div>
              <DealerServiceSummary
                locale={locale}
                summary={customerChargesSummary}
                discount={manualDiscount?.payer === "ACCOUNT_OWNER" ? serviceDiscount : 0}
                customerDiscount={manualDiscount?.payer === "CUSTOMER" ? serviceDiscount : 0}
                installationDiscount={manualDiscount?.payer === "ACCOUNT_OWNER" ? numberValue(manualDiscount.installation.discount) : 0}
              />
              {numberValue(quote?.installationSurcharge) > 0 && <p className="mt-2 text-sm text-muted-foreground">{t("Your Installation cost includes an installation surcharge of")} {formatMoney(numberValue(quote?.installationSurcharge))}.</p>}
            </div>
          ) : (
            <div className="rounded-lg border px-4 py-3">
              <h4 className="mb-1 text-sm font-semibold">
                {t("Installation & services")}
              </h4>

              <SummaryRow label={t("Installation")}>
                <span className="flex flex-wrap items-center justify-end gap-2">
                  {activeJob && quote ? (
                    numberValue(manualDiscount?.installation.discount) > 0
                      ? <OriginalPrice amount={baseInstallationTotal} label={t("Before discount")} />
                      : formatMoney(baseInstallationTotal)
                  ) : null}
                  {activeJob && !quote ? t("Pending") : !activeJob ? t("Not included") : null}
                </span>
              </SummaryRow>

              {numberValue(quote?.installationSurcharge) > 0 && <SummaryRow label={t("Installation surcharge")} value={formatMoney(numberValue(quote?.installationSurcharge))} />}
              {activeJob && (
                <>
                  {extras.length > 0 ? (
                    <div className="mt-1 border-t pt-1">
                      <p className="py-1.5 text-sm font-semibold">
                        {t("Additional services")}
                      </p>
                      <div className="border-l-2 border-slate-200 pl-3">
                        {extras.map((service) => (
                          <SummaryRow
                            key={service.serviceId}
                            label={service.name}
                            value={formatMoney(service.amount)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <SummaryRow
                      label={t("Additional services")}
                      value={t("None included")}
                    />
                  )}

                  {numberValue(manualDiscount?.installation.discount) > 0 && <>
                    <SummaryRow label={t("Additional discount · Installation")} value={`−${formatMoney(numberValue(manualDiscount?.installation.discount))}`} />
                    <SummaryRow label={t("Installation total")} value={formatMoney(quoteTotal)} strong />
                  </>}
                  {activeJob.permit ? (
                    <div className="mt-1 border-t pt-1">
                      <p className="py-1.5 text-sm font-semibold">
                        {t("Permit management")}
                      </p>
                      <div className="border-l-2 border-slate-200 pl-3">
                        <SummaryRow
                          label={t("Permit Fee")}
                          value={formatMoney(permitFee)}
                        />
                        <SummaryRow
                          label={t("City Fee")}
                          value={
                            cityFee == null ? t("Pending") : formatMoney(cityFee)
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <SummaryRow label={t("Permit management")} value={t("Not included")} />
                  )}

                </>
              )}
            </div>
          )}
        </div>

        {retainedDeposit > 0 && (
          <div className="rounded-lg border px-4 py-3">
            <h4 className="mb-1 text-sm font-semibold">{t("Other charges")}</h4>
            <SummaryRow
              label={t("Non-refundable deposit retained")}
              value={formatMoney(retainedDeposit)}
            />
          </div>
        )}

        <ManualDiscountSummary locale={locale} summary={manualDiscount} />
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          {isDealerEstimate ? (
            <>
              <SummaryRow
                label={t("Customer Project Total")}
                value={formatMoney(customerProjectTotal)}
                strong
              />
              <SummaryRow
                label={t("Your Project Cost")}
                value={formatMoney(internalProjectTotal)}
                strong
              />
            </>
          ) : (
            <SummaryRow
              label={t("Project Total")}
              value={formatMoney(internalProjectTotal)}
              strong
            />
          )}

          {cityFeePending && (
            <p className="mt-1 text-xs font-medium text-amber-800">
              {t("Final total pending City Fee.")}
            </p>
          )}
          {awaitingDeposit && (
            <p className="mt-1 text-xs text-blue-800">
              {t("Installation is proposed and is not confirmed until the deposit is paid.")}
            </p>
          )}
          {projected && !awaitingDeposit && !proposedRevision && (
            <p className="mt-1 text-xs text-blue-800">
              {t("Installation amounts remain preliminary until the current quote is approved.")}
            </p>
          )}
          {proposedRevision && (
            <p className="mt-1 text-xs text-blue-800">
              {t("These revised amounts are pending approval.")}
            </p>
          )}
        </div>

        {showNetworkProfit ? (
          <NetworkProfitBreakdownCard locale={locale} breakdown={networkProfitBreakdown} isAdmin={isAdmin} pendingChanges={earningsPending || serviceEarningsPending || Boolean(revisionTotals)} />
        ) : isDealerEstimate && (dealerMode === "INTERNAL" || dealerEarnings) ? (
          <DealerEarningsSummaryCard locale={locale} earnings={dealerEarnings} pendingChanges={earningsPending || Boolean(revisionTotals)} serviceProfit={serviceEarnings.dealer} />
        ) : isDealerEstimate && (
          <DealerProfitSummary
            locale={locale}
            materialProfit={dealerNetwork?.materialProfit != null ? Number(dealerNetwork.materialProfit) : dealerProfit}
            serviceProfit={dealerNetwork && !dealerNetwork.viewerIsOwner ? 0 : dealerServiceProfit}
          />
        )}

        {!showNetworkProfit && subdealerEarnings && <DealerEarningsSummaryCard locale={locale} label={serviceEarnings.subdealer === undefined ? t("Subdealer material earnings") : t("Subdealer Profit")} earnings={subdealerEarnings} pendingChanges={earningsPending || Boolean(revisionTotals)} serviceProfit={serviceEarnings.subdealer} />}

        {activeJob && !activeJob.paymentSchedule && (
          <div className="rounded-lg border px-4 py-3">
            <h4 className="mb-1 text-sm font-semibold">{t("Payment status")}</h4>

            {activeJob.status === "DEPOSIT_PAYMENT_PENDING" ? (
              <SummaryRow
                label={t("Installation deposit due now")}
                value={formatMoney(
                  manualDiscount ? Math.min(numberValue(activeJob.depositAmountSnapshot), numberValue(manualDiscount.installation.total)) : numberValue(activeJob.depositAmountSnapshot),
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
                label={t("Installation deposit paid · credited")}
                value={formatMoney(depositPaid)}
              />
            )}

            {activeJob.status === "INSTALLATION_PAYMENT_PENDING" && (
              <SummaryRow
                label={t("Remaining installation balance")}
                value={formatMoney(installationBalance)}
                strong
              />
            )}

            <p className="mt-1 border-t pt-2 text-xs text-muted-foreground">
              {activeJob.dealerMeasurementsAcceptedAt
                ? t("Installation deposit waived. No deposit has been credited toward the installation balance.")
                : t("The installation deposit is credited toward installation and is not an additional project charge.")}
            </p>
          </div>
        )}

        <p className="text-xs font-medium text-slate-600">
          {t("This is the complete list of services and charges for this estimate.")}
        </p>
      </CardContent>
    </Card>
  );
}
