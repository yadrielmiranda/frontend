"use client";

import { EstimateWithRelations } from "@/lib/types";
import { PiecesTable } from "../parts/pieces-table";
import { ReportFinancialSummary } from "../parts/report-financial-summary";

type Piece = EstimateWithRelations["pieces"][number];

export function EstimateViewDealerPublic({
  estimate,
  pricingMode = "detailed",
}: {
  estimate: EstimateWithRelations;
  pricingMode?: "detailed" | "total";
}) {
  const detailedPrices = pricingMode === "detailed";

  return (
    <>
      {detailedPrices ? (
        <PiecesTable
          pieces={estimate.pieces}
          getUnitPrice={(p: Piece) => Number(p.customerPrice) || 0}
          getSubtotal={(p: Piece) => {
            const customerSubtotal = Number(p.customerSubtotal);
            if (Number.isFinite(customerSubtotal)) return customerSubtotal;

            return (Number(p.customerPrice) || 0) * (p.qty || 0);
          }}
        />
      ) : (
        <PiecesTable pieces={estimate.pieces} showPrices={false} />
      )}

      <ReportFinancialSummary
        estimate={estimate}
        reportKind={
          detailedPrices ? "dealer-customer" : "dealer-customer-total"
        }
      />
    </>
  );
}
