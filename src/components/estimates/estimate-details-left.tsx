"use client";

import React from "react";
import { Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { FrameColor, Tint, Coating } from "@/lib/types";
import type { UseFormRegisterReturn } from "react-hook-form";
import { cn } from "@/lib/utils";

interface EstimateDetailsLeftProps {
  isEditMode: boolean;
  estimateNumber?: string;

  canUseCustomerPricing: boolean;

  // Name
  nameError?: string;
  nameRegister: UseFormRegisterReturn;
  // Default color
  defaultFrameColorId: number;
  frameColors: FrameColor[];
  onDefaultColorChange: (colorIdStr: string) => void;

  defaultTintId: number;
  defaultCoatingId: number;
  tints: Tint[];
  coatings: Coating[];
  onDefaultTintChange: (value: string) => void;
  onDefaultCoatingChange: (value: string) => void;

  // General markup
  generalDealerMarkupRegister: UseFormRegisterReturn;
  onApplyGeneralMarkup: () => void;

  // Customer tax
  customerTaxRateRegister: UseFormRegisterReturn;
  onCustomerTaxBlur: (value: string) => void;
}

export function EstimateDetailsLeft({
  isEditMode,
  estimateNumber,
  canUseCustomerPricing,

  nameError,
  nameRegister,

  defaultFrameColorId,
  frameColors,
  onDefaultColorChange,
  defaultTintId,
  defaultCoatingId,
  tints,
  coatings,
  onDefaultTintChange,
  onDefaultCoatingChange,

  generalDealerMarkupRegister,
  onApplyGeneralMarkup,

  customerTaxRateRegister,
  onCustomerTaxBlur,
}: EstimateDetailsLeftProps) {
  return (
    <div className="space-y-4">
      {isEditMode && estimateNumber && (
        <div>
          <Label>Estimate Number</Label>
          <Input
            value={estimateNumber}
            readOnly
            className="bg-gray-100 cursor-not-allowed border-dashed"
          />
        </div>
      )}

      <div>
        <Label htmlFor="name">Estimate Name</Label>
        <Input id="name" {...nameRegister} />
        {nameError && <p className="text-red-500 text-xs mt-1">{nameError}</p>}
      </div>

      <div>
        <Label className="mb-2 block">Piece Defaults</Label>

        <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-3">
          {/* Frame Color */}
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 transition hover:bg-slate-100">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Frame Color
            </div>

            <Select
              onValueChange={(value) => onDefaultColorChange(value)}
              value={String(defaultFrameColorId || "0")}
            >
              <SelectTrigger
                className={cn(
                  "h-8 w-full rounded-md !border-0 bg-white px-2 shadow-sm !ring-0 focus:!ring-0 focus:!ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none data-[state=open]:!ring-0",
                  defaultFrameColorId ? "text-slate-900" : "text-slate-400",
                )}
              >
                <SelectValue placeholder="No default" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="0">No default</SelectItem>
                {frameColors.map((fc) => (
                  <SelectItem key={fc.id} value={String(fc.id)}>
                    {fc.color}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tint */}
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 transition hover:bg-slate-100">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Tint
            </div>

            <Select
              onValueChange={(value) => onDefaultTintChange(value)}
              value={String(defaultTintId || "0")}
            >
              <SelectTrigger
                className={cn(
                  "h-8 w-full rounded-md !border-0 bg-white px-2 shadow-sm !ring-0 focus:!ring-0 focus:!ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none data-[state=open]:!ring-0",
                  defaultTintId ? "text-slate-900" : "text-slate-400",
                )}
              >
                <SelectValue placeholder="No default" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="0">No default</SelectItem>
                {tints.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.color}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Coating */}
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 transition hover:bg-slate-100">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Coating
            </div>

            <Select
              onValueChange={(value) => onDefaultCoatingChange(value)}
              value={String(defaultCoatingId || "0")}
            >
              <SelectTrigger
                className={cn(
                  "h-8 w-full rounded-md !border-0 bg-white px-2 shadow-sm !ring-0 focus:!ring-0 focus:!ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none data-[state=open]:!ring-0",
                  defaultCoatingId ? "text-slate-900" : "text-slate-400",
                )}
              >
                <SelectValue placeholder="No default" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="0">No default</SelectItem>
                {coatings.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Optional defaults. Apply them to new pieces or update all existing
          ones.
        </p>
      </div>

      {canUseCustomerPricing && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="generalDealerMarkup">
              General Dealer Markup (%)
            </Label>
            <Input
              id="generalDealerMarkup"
              type="number"
              step="1"
              {...generalDealerMarkupRegister}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="mb-0.5"
            onClick={onApplyGeneralMarkup}
          >
            <Calculator className="h-4 w-4 mr-1" />
            Apply to pieces
          </Button>
        </div>
      )}

      {canUseCustomerPricing && (
        <div>
          <Label htmlFor="customerTaxRate">Customer Sales Tax (%)</Label>
          <Input
            id="customerTaxRate"
            type="number"
            step="0.01"
            min={0}
            {...customerTaxRateRegister}
            onBlur={(e) => onCustomerTaxBlur(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            This percentage is applied immediately to the dealer totals. Set 0
            if you don&apos;t want to charge tax to your customer.
          </p>
        </div>
      )}
    </div>
  );
}
