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

import type { FrameColor } from "@/lib/types";
import type { UseFormRegisterReturn } from "react-hook-form";

interface EstimateDetailsLeftProps {
  isEditMode: boolean;
  estimateNumber?: string;

  isDealer: boolean;

  // Name
  nameError?: string;
  nameRegister: UseFormRegisterReturn;
  // Default color
  defaultFrameColorId: number;
  frameColors: FrameColor[];
  onDefaultColorChange: (colorIdStr: string) => void;

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
  isDealer,

  nameError,
  nameRegister,

  defaultFrameColorId,
  frameColors,
  onDefaultColorChange,

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
        <Label>Default Frame Color</Label>
        <Select
          onValueChange={(value) => onDefaultColorChange(value)}
          value={String(defaultFrameColorId || "0")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a default color..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">None</SelectItem>
            {frameColors.map((fc) => (
              <SelectItem key={fc.id} value={String(fc.id)}>
                {fc.color}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isDealer && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="generalDealerMarkup">General Dealer Markup (%)</Label>
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

      {isDealer && (
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
            This percentage is applied immediately to the dealer totals. Set 0 if
            you don&apos;t want to charge tax to your customer.
          </p>
        </div>
      )}
    </div>
  );
}
