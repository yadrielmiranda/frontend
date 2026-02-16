"use client";

import { EstimateWithRelations } from "@/lib/types";
import { formatMoney } from "@/lib/formatters";

export function AdminSummary({ estimate }: { estimate: EstimateWithRelations }) {
  return (
    <section className="mt-10 p-6 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="text-lg font-semibold text-red-800 mb-4">Admin Summary</h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Total Production Cost (Rate):</span>
          <span className="font-medium">{formatMoney(estimate.rateT)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Sale Price (Before Taxes):</span>
          <span className="font-medium">{formatMoney(estimate.priceT)}</span>
        </div>

        <div className="flex justify-between text-base font-bold text-red-700 pt-2 border-t">
          <span>Impact Plus Profit (Net Profit):</span>
          <span>{formatMoney(estimate.netProfit)}</span>
        </div>
      </div>
    </section>
  );
}
