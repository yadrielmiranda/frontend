"use client";

import { EstimateWithRelations } from "@/lib/types";
import { formatMoney } from "@/lib/formatters";
import { PieceDescriptionCell } from "./piece-decription";


type PieceWithRelations = EstimateWithRelations["pieces"][number];

export function PiecesTable({
  pieces,
  getUnitPrice,
  getSubtotal,
}: {
  pieces: PieceWithRelations[];
  getUnitPrice: (p: PieceWithRelations) => number;
  getSubtotal: (p: PieceWithRelations) => number;
}) {
  return (
    <section className="mt-10">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Pieces Detail</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
            <tr>
              <th className="px-4 py-3">Mark</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-center">Qty</th>
              <th className="px-4 py-3 text-right">Unit Price</th>
              <th className="px-4 py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {pieces.map((piece) => {
              const unitPrice = getUnitPrice(piece);
              const subtotal = getSubtotal(piece);

              return (
                <tr key={piece.id} className="border-b last:border-b-0">
                  <td className="px-4 py-4 font-medium">{piece.mark}</td>
                  <td className="px-4 py-4">
                    <PieceDescriptionCell piece={piece} />
                  </td>
                  <td className="px-4 py-4 text-center">{piece.qty}</td>
                  <td className="px-4 py-4 text-right">{formatMoney(unitPrice)}</td>
                  <td className="px-4 py-4 text-right font-medium">
                    {formatMoney(subtotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
