"use client";

import { EstimateWithRelations } from "@/lib/types";
import { PiecesTable } from "../parts/pieces-table";
import { TotalsPublic } from "../parts/totals-public";

type Piece = EstimateWithRelations["pieces"][number];

export function EstimateViewDealerPublic({
  estimate,
}: {
  estimate: EstimateWithRelations;
}) {
  return (
    <>
      <PiecesTable
        pieces={estimate.pieces}
        getUnitPrice={(p: Piece) => Number(p.customerPrice ?? p.price) || 0}
        getSubtotal={(p: Piece) => {
          const unit = Number(p.customerPrice ?? p.price) || 0;
          return unit * (p.qty || 0);
        }}
      />

      <TotalsPublic estimate={estimate} />
    </>
  );
}
