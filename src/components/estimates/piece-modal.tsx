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
  Privacy,
  MuntinPattern,
  MuntinType,
} from "@/lib/types";

import type { PieceFormValues } from "./types";
import { PieceForm, type PieceFormProps } from "./piece-form";

interface PieceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title: string;

  pieceKey: string | number;
  initialData: PieceFormValues;
  index: number;

  onSave: (data: PieceFormValues) => void | Promise<void>;

  onCancel: () => void;

  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];
  privacies: Privacy[];
  muntinPatterns: MuntinPattern[];
  muntinTypes: MuntinType[];
  canUseCustomerPricing: boolean;
  estimateId?: number;
  onCalculate?: PieceFormProps["onCalculate"];
  startUnlocked?: boolean;
  lockQuantity?: boolean;
  lockDealerMarkup?: boolean;
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
  privacies,
  muntinPatterns,
  muntinTypes,
  canUseCustomerPricing,
  estimateId,
  onCalculate,
  startUnlocked = false,
  lockQuantity = false,
  lockDealerMarkup = false,
}: PieceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[4vh] h-[calc(96vh-12px)] w-[calc(100%-24px)] max-w-none translate-y-0 gap-0 overflow-hidden rounded-lg p-0 shadow-none sm:max-w-none"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="flex h-full min-h-0 flex-col gap-4 p-6">
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
            privacies={privacies}
            muntinPatterns={muntinPatterns}
            muntinTypes={muntinTypes}
            canUseCustomerPricing={canUseCustomerPricing}
            estimateId={estimateId}
            onCalculate={onCalculate}
            startUnlocked={startUnlocked}
            lockQuantity={lockQuantity}
            lockDealerMarkup={lockDealerMarkup}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
