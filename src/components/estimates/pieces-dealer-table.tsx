"use client";

import React from "react";
import { Trash2, Pencil, Copy } from "lucide-react";

import type { ProductWithBrands, FrameColor } from "@/lib/types";
import type { PieceFormValues } from "./types";

import { Button } from "@/components/ui/button";
import { formatInchesFromEighthStep, formatPsf } from "@/lib/dimensions";

interface PiecesDealerTableProps {
  fields: { id: string }[];
  watchedPieces: PieceFormValues[] | undefined;
  productsWithBrands: ProductWithBrands[];
  frameColors: FrameColor[];
  formatCurrency: (amount: number) => string;

  onDuplicate: (index: number) => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

export function PiecesDealerTable({
  fields,
  watchedPieces,
  productsWithBrands,
  frameColors,
  formatCurrency,
  onDuplicate,
  onEdit,
  onRemove,
}: PiecesDealerTableProps) {
  if (fields.length === 0) {
    return (
      <div className="border rounded-lg overflow-x-auto">
        <p className="text-center text-gray-500 py-6">No pieces have been added yet.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 border-b">
          <tr>
            <th className="px-4 py-2 text-left font-semibold">Mark</th>
            <th className="px-4 py-2 text-left font-semibold">Description</th>
            <th className="px-4 py-2 text-right font-semibold">Qty</th>
            <th className="px-4 py-2 text-right font-semibold">Your Rate (unit)</th>
            <th className="px-4 py-2 text-right font-semibold">Customer Price (unit)</th>
            <th className="px-4 py-2 text-right font-semibold">Markup %</th>
            <th className="px-4 py-2 text-center font-semibold">DP+ / DP-</th>
            <th className="px-4 py-2 text-right font-semibold">Customer Subtotal</th>
            <th className="px-4 py-2 text-right font-semibold">Actions</th>
          </tr>
        </thead>

        <tbody>
          {fields.map((field, index) => {
            const currentPieceData = watchedPieces?.[index];
            if (!currentPieceData) return null;

            const product = productsWithBrands.find(
              (p) => p.id === Number(currentPieceData.idProd)
            );
            const frameColor = frameColors.find(
              (fc) => fc.id === Number(currentPieceData.idFC)
            );

            const qty = Number(currentPieceData.qty) || 0;
            const unitRate = Number(currentPieceData.price) || 0;

            const customerLineTotal = Number(currentPieceData.total) || 0;
            const customerUnitPrice = qty > 0 ? customerLineTotal / qty : 0;

            const markupPercent = Number(currentPieceData.dealerMarkup) || 0;

            const wTxt = currentPieceData.width
              ? formatInchesFromEighthStep(currentPieceData.width)
              : "?";
            const hTxt = currentPieceData.height
              ? formatInchesFromEighthStep(currentPieceData.height)
              : "?";

            const descriptionParts: string[] = [];
            if (product?.name) descriptionParts.push(product.name);
            if (currentPieceData.width || currentPieceData.height) {
              descriptionParts.push(`${wTxt} W x ${hTxt} H`);
            }
            if (frameColor?.color) descriptionParts.push(frameColor.color);

            const description = descriptionParts.join(" - ") || "Piece description";

            const dpPlus =
              currentPieceData.dpPosPsf == null ? "—" : formatPsf(currentPieceData.dpPosPsf, 1);
            const dpMinus =
              currentPieceData.dpNegPsf == null ? "—" : formatPsf(currentPieceData.dpNegPsf, 1);

            return (
              <tr
                key={field.id}
                className="border-b last:border-b-0 hover:bg-slate-50"
              >
                <td className="px-4 py-2 align-middle font-medium">
                  {currentPieceData.mark || `#${index + 1}`}
                </td>

                <td className="px-4 py-2 align-middle text-gray-700">
                  {description}{" "}
                  {qty > 1 && (
                    <span className="text-xs text-gray-500">(Qty: {qty})</span>
                  )}
                </td>

                <td className="px-4 py-2 align-middle text-right">{qty}</td>

                <td className="px-4 py-2 align-middle text-right font-mono">
                  {formatCurrency(unitRate)}
                </td>

                <td className="px-4 py-2 align-middle text-right font-mono">
                  {formatCurrency(customerUnitPrice)}
                </td>

                <td className="px-4 py-2 align-middle text-right">
                  {markupPercent.toFixed(2)}%
                </td>

                <td className="px-4 py-2 align-middle text-center font-mono">
                  {dpPlus} / {dpMinus}
                </td>

                <td className="px-4 py-2 align-middle text-right font-mono">
                  {formatCurrency(customerLineTotal)}
                </td>

                <td className="px-4 py-2 align-middle text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => onDuplicate(index)}
                      title="Duplicate Piece"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => onEdit(index)}
                      title="Edit Piece"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => onRemove(index)}
                      title="Delete Piece"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
