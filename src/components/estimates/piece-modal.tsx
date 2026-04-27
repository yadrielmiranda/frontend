"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
import { PieceForm } from "./piece-form";

interface PieceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title: string;

  pieceKey: string | number;
  initialData: PieceFormValues;
  index: number;

  onSave: (data: PieceFormValues) => void;
  onCancel: () => void;

  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];
  muntinPatterns: MuntinPattern[];
  muntinTypes: MuntinType[];
  canUseCustomerPricing: boolean;
}

export function PieceModal({
  open,
  onOpenChange,
  title,
  pieceKey,
  initialData,
  index,
  onSave,
  onCancel,
  productsWithBrands,
  systemsWithConfigs,
  frameColors,
  crystals,
  tints,
  coatings,
  muntinPatterns,
  muntinTypes,
  canUseCustomerPricing,
}: PieceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] max-w-[95vw] xl:max-w-[1400px] max-h-[92vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <PieceForm
          key={pieceKey}
          initialData={initialData}
          onSubmit={onSave}
          onCancel={onCancel}
          index={index}
          productsWithBrands={productsWithBrands}
          systemsWithConfigs={systemsWithConfigs}
          frameColors={frameColors}
          crystals={crystals}
          tints={tints}
          coatings={coatings}
          muntinPatterns={muntinPatterns}
          muntinTypes={muntinTypes}
          canUseCustomerPricing={canUseCustomerPricing}
        />
      </DialogContent>
    </Dialog>
  );
}