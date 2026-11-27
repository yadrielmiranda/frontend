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
import type { CompanyLocale } from "@/components/company/company-content";
import { pieceFormText } from "@/lib/piece-form-language";

interface EstimateDetailsLeftProps {
  locale?: CompanyLocale;
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

const estimateFieldClassName =
  "border-slate-400 shadow-none hover:border-slate-500 focus-visible:border-slate-500 focus-visible:ring-slate-500/10";
const estimateLabelClassName = "mb-1.5 block";

export function EstimateDetailsLeft({
  locale = "en",
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
  const spanish = locale === "es";
  const noDefault = spanish ? "Sin predeterminar" : "No default";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {isEditMode && estimateNumber && (
          <div className="w-full sm:w-40">
            <Label className={estimateLabelClassName} htmlFor="estimateNumber">{spanish ? "Número" : "Number"}</Label>
            <Input
              id="estimateNumber"
              value={estimateNumber}
              readOnly
              className={cn(
                estimateFieldClassName,
                "cursor-not-allowed border-dashed bg-gray-100 read-only:border-slate-400 read-only:hover:border-slate-500",
              )}
            />
          </div>
        )}

        <div className="w-full sm:w-80">
          <Label className={estimateLabelClassName} htmlFor="name">
            {spanish ? "Nombre de la cotización" : "Estimate Name"}
          </Label>
          <Input
            id="name"
            className={cn(
              estimateFieldClassName,
              "bg-white text-slate-900",
            )}
            {...nameRegister}
          />
          {nameError && (
            <p className="text-red-500 text-xs mt-1">{spanish && nameError === "The name is required" ? "Escribe un nombre para la cotización." : nameError}</p>
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
          <Label className="mb-2 block">{spanish ? "Valores predeterminados de las piezas" : "Piece Defaults"}</Label>

          <div className="grid grid-cols-1 gap-3 rounded-lg border border-blue-200 bg-blue-50/40 p-3 shadow-sm sm:grid-cols-3">
            {/* Frame Color */}
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 transition hover:bg-slate-100">
              <div id="piece-default-frame-color" className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                {spanish ? "Color del marco" : "Frame Color"}
              </div>
              <Select
                onValueChange={(value) => onDefaultColorChange(value)}
                value={String(defaultFrameColorId || "0")}
              >
                <SelectTrigger
                  aria-labelledby="piece-default-frame-color"
                  className={cn(
                    "h-9 w-full px-2",
                    defaultFrameColorId ? "text-slate-900" : "text-slate-400",
                  )}
                >
                  <SelectValue placeholder={noDefault} />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="0">{noDefault}</SelectItem>
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
              <div id="piece-default-tint" className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                {pieceFormText(locale, "Glass Color")}
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
                  aria-labelledby="piece-default-tint"
                >
                  <SelectValue placeholder={noDefault} />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="0">{noDefault}</SelectItem>
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
              <div id="piece-default-coating" className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                {spanish ? "Recubrimiento" : "Coating"}
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
                  aria-labelledby="piece-default-coating"
                >
                  <SelectValue placeholder={noDefault} />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="0">{noDefault}</SelectItem>
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
            {spanish
              ? "Puedes aplicar estos valores a las piezas nuevas o actualizar también las que ya agregaste."
              : "Optional defaults. Apply them to new pieces or update all existing ones."}
          </p>
        </div>

        {canUseCustomerPricing && (
          <div className="min-w-0">
            <Label className="mb-2 block" htmlFor="generalDealerMarkup">
              {spanish ? "Recargo general del distribuidor (%)" : "General Dealer Markup (%)"}
            </Label>
            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 shadow-sm">
              <Input
                id="generalDealerMarkup"
                type="number"
                step="1"
                className={estimateFieldClassName}
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
                {spanish
                  ? "Al salir del campo, este porcentaje se aplica a las piezas existentes y queda como valor predeterminado para las nuevas."
                  : "Applied automatically to existing pieces when you leave the field and used as the default for new pieces."}
              </p>
            </div>
          </div>
        )}

        {canUseCustomerPricing && (
          <div className="min-w-0">
            <Label className="mb-2 block" htmlFor="customerTaxRate">
              {spanish ? "Impuesto sobre las ventas al cliente (%)" : "Customer Sales Tax (%)"}
            </Label>
            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 shadow-sm">
              <Input
                id="customerTaxRate"
                type="number"
                step="0.01"
                min={0}
                className={estimateFieldClassName}
                {...customerTaxRateRegister}
                onBlur={(e) => onCustomerTaxBlur(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {spanish
                  ? "Este porcentaje se aplica de inmediato a los totales del distribuidor. Escribe 0 si no vas a cobrarle impuesto a tu cliente."
                  : "This percentage is applied immediately to the dealer totals. Set 0 if you don't want to charge tax to your customer."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
