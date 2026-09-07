"use client";

import { EstimateWithRelations } from "@/lib/types";
import { PiecesTable } from "../parts/pieces-table";
import { ReportFinancialSummary } from "../parts/report-financial-summary";

type Piece = EstimateWithRelations["pieces"][number];

export function EstimateViewAdmin({
  estimate,
}: {
  estimate: EstimateWithRelations;
}) {
  return (
    <>
      <PiecesTable
        pieces={estimate.pieces}
        getUnitPrice={(piece: Piece) => Number(piece.price) || 0}
        getOriginalUnitPrice={(piece: Piece) =>
          piece.promotionSnapshot && piece.regularPrice != null
            ? Number(piece.regularPrice)
            : undefined
        }
        getSubtotal={(piece: Piece) => Number(piece.subtotal) || 0}
      />

      <ReportFinancialSummary estimate={estimate} reportKind="admin" />
    </>
  );
}
