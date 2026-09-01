"use client";

import React, { useRef } from "react";

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
  onGeneralDealerMarkupBlur: (value: string) => void | Promise<void>;

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
  onGeneralDealerMarkupBlur,

  customerTaxRateRegister,
  onCustomerTaxBlur,
}: EstimateDetailsLeftProps) {
  const generalMarkupChangedRef = useRef(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {isEditMode && estimateNumber && (
          <div className="w-full sm:w-40">
            <Label>Number</Label>
            <Input
              value={estimateNumber}
              readOnly
              className="bg-gray-100 cursor-not-allowed border-dashed"
            />
          </div>
        )}

        <div className="w-full sm:w-80">
          <Label htmlFor="name">Estimate Name</Label>
          <Input
            id="name"
            className="bg-white border-slate-300 text-slate-900 shadow-sm"
            {...nameRegister}
          />
          {nameError && (
            <p className="text-red-500 text-xs mt-1">{nameError}</p>
          )}
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4",
          canUseCustomerPricing &&
            "xl:grid-cols-[31rem_minmax(0,1fr)_minmax(0,1fr)] xl:items-start",
        )}
      >
        <div
          className={cn(
            "w-full",
            isEditMode && estimateNumber && "sm:w-[31rem]",
          )}
        >
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
                  "h-9 w-full px-2",
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
                  "h-9 w-full px-2",
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
                  "h-9 w-full px-2",
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
          <div className="min-w-0">
            <Label className="mb-2 block" htmlFor="generalDealerMarkup">
              General Dealer Markup (%)
            </Label>
            <Input
              id="generalDealerMarkup"
              type="number"
              step="1"
              {...generalDealerMarkupRegister}
              onChange={(event) => {
                generalMarkupChangedRef.current = true;
                void generalDealerMarkupRegister.onChange(event);
              }}
              onBlur={(event) => {
                void generalDealerMarkupRegister.onBlur(event);

                if (!generalMarkupChangedRef.current) return;

                generalMarkupChangedRef.current = false;
                void onGeneralDealerMarkupBlur(event.target.value);
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Applied automatically to existing pieces when you leave the
              field and used as the default for new pieces.
            </p>
          </div>
        )}

        {canUseCustomerPricing && (
          <div className="min-w-0">
            <Label className="mb-2 block" htmlFor="customerTaxRate">
              Customer Sales Tax (%)
            </Label>
            <Input
              id="customerTaxRate"
              type="number"
              step="0.01"
              min={0}
              {...customerTaxRateRegister}
              onBlur={(e) => onCustomerTaxBlur(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              This percentage is applied immediately to the dealer totals. Set
              0 if you don&apos;t want to charge tax to your customer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
