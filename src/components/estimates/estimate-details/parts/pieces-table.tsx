"use client";

import { EstimateWithRelations } from "@/lib/types";
import { formatMoney } from "@/lib/formatters";
import { PieceDescriptionCell } from "./piece-decription";


type PieceWithRelations = EstimateWithRelations["pieces"][number];

type PiecesTableProps = {
  pieces: PieceWithRelations[];
} & (
  | {
      showPrices: false;
      getUnitPrice?: never;
      getSubtotal?: never;
    }
  | {
      showPrices?: true;
      getUnitPrice: (p: PieceWithRelations) => number;
      getSubtotal: (p: PieceWithRelations) => number;
    }
);

export function PiecesTable(props: PiecesTableProps) {
  const { pieces } = props;
  const showPrices = props.showPrices !== false;

  return (
    <section className="mt-10">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Products</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
            <tr>
              <th className="px-4 py-3">Mark</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-center">Qty</th>
              {showPrices ? (
                <>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {pieces.map((piece) => {
              const prices =
                props.showPrices === false
                  ? null
                  : {
                      unitPrice: props.getUnitPrice(piece),
                      subtotal: props.getSubtotal(piece),
                    };

              return (
                <tr key={piece.id} className="border-b last:border-b-0">
                  <td className="px-4 py-4 font-medium">{piece.mark}</td>
                  <td className="px-4 py-4">
                    <PieceDescriptionCell piece={piece} />
                  </td>
                  <td className="px-4 py-4 text-center">{piece.qty}</td>
                  {prices ? (
                    <>
                      <td className="px-4 py-4 text-right">
                        {formatMoney(prices.unitPrice)}
                      </td>
                      <td className="px-4 py-4 text-right font-medium">
                        {formatMoney(prices.subtotal)}
                      </td>
                    </>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
