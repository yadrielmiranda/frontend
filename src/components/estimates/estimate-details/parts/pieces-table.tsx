"use client";

import { EstimateWithRelations } from "@/lib/types";
import { PiecesBreakdownBar } from "../../pieces-breakdown-bar";
import { PieceReportCard } from "./piece-report-card";

type PieceWithRelations = EstimateWithRelations["pieces"][number];

type PiecesTableProps = {
  pieces: PieceWithRelations[];
  showDealerMarkup?: boolean;
} & (
  | {
      showPrices: false;
      getUnitPrice?: never;
      getOriginalUnitPrice?: never;
      getSubtotal?: never;
    }
  | {
      showPrices?: true;
      getUnitPrice: (p: PieceWithRelations) => number;
      getOriginalUnitPrice?: (p: PieceWithRelations) => number | undefined;
      getSubtotal: (p: PieceWithRelations) => number;
    }
);

export function PiecesTable(props: PiecesTableProps) {
  const { pieces } = props;
  const totalPieces = pieces.reduce((total, piece) => total + piece.qty, 0);
  const pieceBreakdown = pieces.reduce<Record<string, number>>((breakdown, piece) => {
    const productName = piece.prod?.name?.trim() || "Product";
    breakdown[productName] = (breakdown[productName] ?? 0) + piece.qty;
    return breakdown;
  }, Object.create(null));

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="text-lg font-bold uppercase tracking-wide text-black">
          Product Details
        </h3>
        <p className="text-[11px] text-black">
          Illustrations are visual references; written specifications govern.
        </p>
      </div>

      <div className="space-y-4">
        {pieces.length > 0 ? (
          pieces.map((piece, index) => {
            const displayMark =
              String(piece.mark ?? "").trim() || `#${index + 1}`;

            return props.showPrices === false ? (
              <PieceReportCard
                key={piece.id}
                piece={piece}
                displayMark={displayMark}
                showPrices={false}
              />
            ) : (
              <PieceReportCard
                key={piece.id}
                piece={piece}
                displayMark={displayMark}
                showDealerMarkup={props.showDealerMarkup}
                unitPrice={props.getUnitPrice(piece)}
                originalUnitPrice={props.getOriginalUnitPrice?.(piece)}
                subtotal={props.getSubtotal(piece)}
              />
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-black">
            No products included.
          </div>
        )}
      </div>

      <div className="mt-6 break-inside-avoid">
        <PiecesBreakdownBar
          totalUnits={totalPieces}
          pieceBreakdown={pieceBreakdown}
        />
      </div>
    </section>
  );
}
