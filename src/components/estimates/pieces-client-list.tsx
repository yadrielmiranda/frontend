"use client";

import React, { useState } from "react";
import { Trash2, Pencil, Copy, ChevronDown, ChevronUp } from "lucide-react";

import type {
  ProductWithBrands,
  SystemWithConfigs,
  FrameColor,
  Crystal,
  Tint,
  Coating,
  MuntinPattern,
  MuntinType,
} from "@/lib/types";

import type { PieceFormValues } from "./types";

import { Button } from "@/components/ui/button";
import { formatInchesFromEighthStep } from "@/lib/dimensions";
import { PieceFormDetailsPanel } from "./piece-form-details-panel";

interface PiecesClientListProps {
  fields: { id: string }[];
  watchedPieces: PieceFormValues[] | undefined;

  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];
  muntinPatterns: MuntinPattern[];
  muntinTypes: MuntinType[];

  formatCurrency: (amount: number) => string;

  onDuplicate: (index: number) => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

export function PiecesClientList({
  fields,
  watchedPieces,
  productsWithBrands,
  systemsWithConfigs,
  frameColors,
  crystals,
  tints,
  coatings,
  muntinPatterns,
  muntinTypes,
  formatCurrency,
  onDuplicate,
  onEdit,
  onRemove,
}: PiecesClientListProps) {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const toggleRow = (index: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {fields.map((field, index) => {
        const currentPieceData = watchedPieces?.[index];
        if (!currentPieceData) return null;

        const isExpanded = !!expandedRows[index];

        const product = productsWithBrands.find(
          (p) => p.id === Number(currentPieceData.idProd),
        );

        const frameColor = frameColors.find(
          (fc) => fc.id === Number(currentPieceData.idFC),
        );

        const wTxt = currentPieceData.width
          ? formatInchesFromEighthStep(currentPieceData.width)
          : "?";

        const hTxt = currentPieceData.height
          ? formatInchesFromEighthStep(currentPieceData.height)
          : "?";

        return (
          <div key={field.id} className="border-b last:border-b-0">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3 flex-1">
                <button
                  type="button"
                  onClick={() => toggleRow(index)}
                  className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100"
                  title={isExpanded ? "Hide details" : "Show details"}
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isExpanded ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                </button>

                <div className="flex-1">
                  <p className="font-medium">
                    {currentPieceData.mark || `Piece #${index + 1}`}
                  </p>

                  <p className="text-sm text-gray-500">
                    {product?.name} - {wTxt} W x {hTxt} H{" "}
                    {currentPieceData.heightLeft &&
                      ` / ${formatInchesFromEighthStep(
                        currentPieceData.heightLeft,
                      )} HL`}
                    {currentPieceData.heightRight &&
                      ` / ${formatInchesFromEighthStep(
                        currentPieceData.heightRight,
                      )} HR`}
                    {currentPieceData.legHeight &&
                      ` / ${formatInchesFromEighthStep(
                        currentPieceData.legHeight,
                      )} LegH`}
                    {" - "}
                    {frameColor?.color} (Qty: {currentPieceData.qty})
                  </p>
                </div>
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

            {isExpanded && (
              <PieceFormDetailsPanel
                piece={currentPieceData}
                productsWithBrands={productsWithBrands}
                systemsWithConfigs={systemsWithConfigs}
                frameColors={frameColors}
                crystals={crystals}
                tints={tints}
                coatings={coatings}
                muntinPatterns={muntinPatterns}
                muntinTypes={muntinTypes}
              />
            )}
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
