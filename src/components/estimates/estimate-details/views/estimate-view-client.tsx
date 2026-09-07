"use client";

import { EstimateWithRelations } from "@/lib/types";
import { PiecesTable } from "../parts/pieces-table";
import { ReportFinancialSummary } from "../parts/report-financial-summary";

type Piece = EstimateWithRelations["pieces"][number];

export function EstimateViewClient({
  estimate,
}: {
  estimate: EstimateWithRelations;
}) {
  return (
    <>
      <PiecesTable
        pieces={estimate.pieces}
        getUnitPrice={(p: Piece) => Number(p.price) || 0}
        getOriginalUnitPrice={(p: Piece) =>
          p.promotionSnapshot && p.regularPrice != null
            ? Number(p.regularPrice)
            : undefined
        }
        getSubtotal={(p: Piece) => Number(p.subtotal) || 0}
      />

      <ReportFinancialSummary estimate={estimate} reportKind="client" />
    </>
  );
}
