"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CompanyLocale } from "@/components/company/company-content";

interface PiecesBreakdownBarProps {
  locale?: CompanyLocale;
  totalUnits: number;
  pieceBreakdown: Record<string, number>;
}

export function PiecesBreakdownBar({
  locale = "en",
  totalUnits,
  pieceBreakdown,
}: PiecesBreakdownBarProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <Label>{locale === "es" ? "Desglose de piezas" : "Pieces Breakdown"}</Label>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{locale === "es" ? "Cantidad" : "Qty"}</Label>
          <Input
            aria-label={locale === "es" ? "Total de piezas" : "Total pieces"}
            value={totalUnits}
            readOnly
            className="font-bold text-center cursor-not-allowed border-dashed bg-white w-20 h-8"
          />
        </div>
      </div>

      <div className="p-3 border rounded-md bg-slate-100 min-h-[40px] text-sm font-mono flex items-center flex-wrap gap-x-4 gap-y-2">
        {Object.entries(pieceBreakdown).length > 0 ? (
          Object.entries(pieceBreakdown)
            .map(([name, count]) => `${name}: ${count}`)
            .join(" | ")
        ) : (
          <span className="text-gray-500 italic">{locale === "es" ? "Aún no hay piezas calculadas." : "No calculated pieces yet."}</span>
        )}
      </div>
    </div>
  );
}
