"use client";

import React from "react";
import { Trash2, Pencil, Copy } from "lucide-react";

import type { ProductWithBrands, FrameColor } from "@/lib/types";
import type { PieceFormValues } from "./types";

import { Button } from "@/components/ui/button";
import { formatInchesFromEighthStep } from "@/lib/dimensions";

interface PiecesClientListProps {
  fields: { id: string }[];
  watchedPieces: PieceFormValues[] | undefined;
  productsWithBrands: ProductWithBrands[];
  frameColors: FrameColor[];
  formatCurrency: (amount: number) => string;

  onDuplicate: (index: number) => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

export function PiecesClientList({
  fields,
  watchedPieces,
  productsWithBrands,
  frameColors,
  formatCurrency,
  onDuplicate,
  onEdit,
  onRemove,
}: PiecesClientListProps) {
  return (
    <div className="border rounded-lg">
      {fields.map((field, index) => {
        const currentPieceData = watchedPieces?.[index];
        if (!currentPieceData) return null;

        const product = productsWithBrands.find(
          (p) => p.id === Number(currentPieceData.idProd)
        );
        const frameColor = frameColors.find(
          (fc) => fc.id === Number(currentPieceData.idFC)
        );

        const wTxt = currentPieceData.width
          ? formatInchesFromEighthStep(currentPieceData.width)
          : "?";
        const hTxt = currentPieceData.height
          ? formatInchesFromEighthStep(currentPieceData.height)
          : "?";

        return (
          <div
            key={field.id}
            className="flex items-center justify-between p-3 border-b last:border-b-0"
          >
            <div className="flex-1">
              <p className="font-medium">
                {currentPieceData.mark || `Piece #${index + 1}`}
              </p>
              <p className="text-sm text-gray-500">
                {product?.name} - {wTxt} W x {hTxt} H{" "}
                {currentPieceData.heightLeft &&
                  ` / ${formatInchesFromEighthStep(currentPieceData.heightLeft)} HL`}
                {currentPieceData.heightRight &&
                  ` / ${formatInchesFromEighthStep(currentPieceData.heightRight)} HR`}
                {currentPieceData.legHeight &&
                  ` / ${formatInchesFromEighthStep(currentPieceData.legHeight)} LegH`}
                {" - "}
                {frameColor?.color} (Qty: {currentPieceData.qty})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <p className="font-mono text-right text-sm w-28">
                {formatCurrency(currentPieceData.subtotal || 0)}
              </p>

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
          </div>
        );
      })}

      {fields.length === 0 && (
        <p className="text-center text-gray-500 py-6">
          No pieces have been added yet.
        </p>
      )}
    </div>
  );
}
