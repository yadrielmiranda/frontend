"use client";

import { EstimateWithRelations } from "@/lib/types";
import { PiecesTable } from "../parts/pieces-table";
import { TotalsInternal } from "../parts/totals-internal";

type Piece = EstimateWithRelations["pieces"][number];

export function EstimateViewClient({ estimate }: { estimate: EstimateWithRelations }) {
  return (
    <>
      <PiecesTable
        pieces={estimate.pieces}
        getUnitPrice={(p: Piece) => Number(p.price) || 0}
        getSubtotal={(p: Piece) => Number(p.subtotal) || 0}
      />

      <TotalsInternal estimate={estimate} />
    </>
  );
}
