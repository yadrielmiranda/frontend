"use client";

import { EstimateWithRelations } from "@/lib/types";
import type { CompanyLocale } from "@/components/company/company-content";
import { PiecesTable } from "../parts/pieces-table";
import { ReportFinancialSummary } from "../parts/report-financial-summary";

type Piece = EstimateWithRelations["pieces"][number];

export function EstimateViewClient({
  estimate,
  locale = "en",
}: {
  estimate: EstimateWithRelations;
  locale?: CompanyLocale;
}) {
  return (
    <>
      <PiecesTable
        locale={locale}
        pieces={estimate.pieces}
        getUnitPrice={(p: Piece) => Number(p.price) || 0}
        getOriginalUnitPrice={(p: Piece) =>
          p.promotionSnapshot && p.regularPrice != null
            ? Number(p.regularPrice)
            : undefined
        }
        getSubtotal={(p: Piece) => Number(p.subtotal) || 0}
      />

      <ReportFinancialSummary estimate={estimate} locale={locale} reportKind="client" />
    </>
  );
}
