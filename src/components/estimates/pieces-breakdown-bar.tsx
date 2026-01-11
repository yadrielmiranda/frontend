"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PiecesBreakdownBarProps {
  totalUnits: number;
  pieceBreakdown: Record<string, number>;
}

export function PiecesBreakdownBar({
  totalUnits,
  pieceBreakdown,
}: PiecesBreakdownBarProps) {
  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <Label>Pieces Breakdown</Label>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Qty</Label>
          <Input
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
          <span className="text-gray-500 italic">No calculated pieces yet.</span>
        )}
      </div>
    </div>
  );
}
