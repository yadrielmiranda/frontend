"use client";

import { EstimateWithRelations } from "@/lib/types";
import { PiecesTable } from "../parts/pieces-table";
import { ReportFinancialSummary } from "../parts/report-financial-summary";

type Piece = EstimateWithRelations["pieces"][number];

export function EstimateViewDealerInternal({
  estimate,
}: {
  estimate: EstimateWithRelations;
}) {
  return (
    <>
      <PiecesTable
        pieces={estimate.pieces}
        getUnitPrice={(p: Piece) => Number(p.price) || 0}
        getSubtotal={(p: Piece) => Number(p.subtotal) || 0}
      />

      <ReportFinancialSummary estimate={estimate} reportKind="dealer" />
    </>
  );
}
