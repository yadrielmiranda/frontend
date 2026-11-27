"use client";

import { EstimateWithRelations } from "@/lib/types";
import type { CompanyLocale } from "@/components/company/company-content";
import { customerCanSeePromotions } from "@/lib/estimate-customer-promotions";
import { PiecesTable } from "../parts/pieces-table";
import { ReportFinancialSummary } from "../parts/report-financial-summary";

type Piece = EstimateWithRelations["pieces"][number];

export function EstimateViewDealerPublic({
  estimate,
  locale = "en",
  pricingMode = "detailed",
  showPaymentSchedule = true,
}: {
  estimate: EstimateWithRelations;
  locale?: CompanyLocale;
  pricingMode?: "detailed" | "total";
  showPaymentSchedule?: boolean;
}) {
  const detailedPrices = pricingMode === "detailed";
  const showPromotions = customerCanSeePromotions(estimate);

  return (
    <>
      {detailedPrices ? (
        <PiecesTable
          locale={locale}
          pieces={estimate.pieces}
          getUnitPrice={(p: Piece) => Number(p.customerPrice) || 0}
          getOriginalUnitPrice={(p: Piece) =>
            !showPromotions || p.regularCustomerPrice == null
              ? undefined
              : Number(p.regularCustomerPrice)
          }
          getSubtotal={(p: Piece) => {
            const customerSubtotal = Number(p.customerSubtotal);
            if (Number.isFinite(customerSubtotal)) return customerSubtotal;

            return (Number(p.customerPrice) || 0) * (p.qty || 0);
          }}
        />
      ) : (
        <PiecesTable pieces={estimate.pieces} locale={locale} showPrices={false} />
      )}

      <ReportFinancialSummary
        locale={locale}
        estimate={estimate}
        showPaymentSchedule={showPaymentSchedule}
        reportKind={
          detailedPrices ? "dealer-customer" : "dealer-customer-total"
        }
      />
    </>
  );
}
