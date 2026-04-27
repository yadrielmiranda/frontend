"use client";

import React from "react";
import { Label } from "@/components/ui/label";

type Summary = {
  subtotal: number;
  taxAmount: number;
  totalPayable: number;

  dealerTotal: number;
  dealerTaxAmount: number;
  dealerGrandTotal: number;
  dealerProfit: number;
};

interface EstimateTotalsCardProps {
  canUseCustomerPricing: boolean;
  taxRate: number;
  isTaxExempt: boolean;
  customerTaxRatePercent: number;
  summary: Summary;
  formatCurrency: (amount: number) => string;
}

export function EstimateTotalsCard({
  canUseCustomerPricing,
  taxRate,
  isTaxExempt,
  customerTaxRatePercent,
  summary,
  formatCurrency,
}: EstimateTotalsCardProps) {
  return (
    <div className="border p-3 rounded-md bg-slate-100 space-y-2">
      <div className="flex justify-between items-center text-sm">
        <Label>Subtotal (Your Price)</Label>
        <span className="font-semibold">
          {formatCurrency(summary.subtotal)}
        </span>
      </div>

      <div className="flex justify-between items-center text-sm">
        <Label>
          Sales Tax{" "}
          {isTaxExempt ? (
            <>
              <span className="line-through text-slate-400">
                ({(Number(taxRate) * 100).toFixed(2)}%)
              </span>{" "}
              <span className="text-green-700 font-semibold">(Exempt)</span>
            </>
          ) : (
            <>({(Number(taxRate) * 100).toFixed(2)}%)</>
          )}
        </Label>

        <span
          className={
            isTaxExempt ? "font-semibold text-green-700" : "font-semibold"
          }
        >
          {formatCurrency(summary.taxAmount)}
        </span>
      </div>

      <div className="flex justify-between items-center border-t pt-2 mt-2">
        <Label className="font-bold">Total Payable (To You)</Label>
        <span className="font-bold text-lg text-blue-600">
          {formatCurrency(summary.totalPayable)}
        </span>
      </div>

      {canUseCustomerPricing && (
        <>
          <div className="flex justify-between items-center border-t pt-2 mt-2">
            <Label className="font-bold text-green-700">
              Dealer Subtotal (Customer Price)
            </Label>
            <span className="font-bold text-lg text-green-700">
              {formatCurrency(summary.dealerTotal)}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <Label className="text-green-700">
              Dealer Sales Tax (
              {(Number(customerTaxRatePercent) || 0).toFixed(2)}%)
            </Label>
            <span className="font-semibold text-green-700">
              {formatCurrency(summary.dealerTaxAmount)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <Label className="font-bold text-green-700">
              Dealer Final Total (Customer Pays)
            </Label>
            <span className="font-bold text-lg text-green-700">
              {formatCurrency(summary.dealerGrandTotal)}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <Label className="text-green-700">
              Dealer Net Profit (pre-tax)
            </Label>
            <span className="font-semibold text-green-700">
              {formatCurrency(summary.dealerProfit)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
