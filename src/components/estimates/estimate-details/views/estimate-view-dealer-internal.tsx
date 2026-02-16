"use client";

import { EstimateWithRelations } from "@/lib/types";
import { PiecesTable } from "../parts/pieces-table";
import { TotalsInternal } from "../parts/totals-internal";
import { TotalsPublic } from "../parts/totals-public";
import { DealerSummary } from "../parts/dealer-summary";

type Piece = EstimateWithRelations["pieces"][number];

export function EstimateViewDealerInternal({
  estimate,
}: {
  estimate: EstimateWithRelations;
}) {
  return (
    <>
      {/* ✅ Internal prices (what dealer pays Impact Plus) */}
      <PiecesTable
        pieces={estimate.pieces}
        getUnitPrice={(p: Piece) => Number(p.price) || 0}
        getSubtotal={(p: Piece) => Number(p.subtotal) || 0}
      />

      {/* ✅ Totals like PDF: right aligned, no card */}
      <div className="mt-10 flex justify-end">
        <div className="w-full max-w-sm space-y-8">
          {/* Reset the internal mt-10 from Totals components */}
          <div className="[&>section]:mt-0">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              Customer View Total
            </h4>
            <TotalsPublic estimate={estimate} />
          </div>

          <div className="[&>section]:mt-0">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              Internal Totals
            </h4>
            <TotalsInternal estimate={estimate} />
          </div>
        </div>
      </div>

      {/* ✅ Dealer profit summary (keep the green box like PDF) */}
      <DealerSummary estimate={estimate} />
    </>
  );
}
