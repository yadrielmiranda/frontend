"use client";

import { EstimateWithRelations } from "@/lib/types";
import type { CompanyLocale } from "@/components/company/company-content";
import { isDealerRole } from "@/lib/rbac";
import { PiecesTable } from "../parts/pieces-table";
import { ReportFinancialSummary } from "../parts/report-financial-summary";

type Piece = EstimateWithRelations["pieces"][number];

export function EstimateViewAdmin({
  estimate,
  locale = "en",
  isAdmin = false,
}: {
  estimate: EstimateWithRelations;
  locale?: CompanyLocale;
  isAdmin?: boolean;
}) {
  return (
    <>
      <PiecesTable
        locale={locale}
        pieces={estimate.pieces}
        showDealerMarkup={isDealerRole(estimate.user?.role?.name)}
        getUnitPrice={(piece: Piece) => Number(piece.price) || 0}
        getOriginalUnitPrice={(piece: Piece) =>
          piece.promotionSnapshot && piece.regularPrice != null
            ? Number(piece.regularPrice)
            : undefined
        }
        getSubtotal={(piece: Piece) => Number(piece.subtotal) || 0}
      />

      <ReportFinancialSummary estimate={estimate} locale={locale} reportKind="admin" isAdmin={isAdmin} />
    </>
  );
}
