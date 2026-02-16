"use client";

import { EstimateWithRelations } from "@/lib/types";
import { formatMoney } from "@/lib/formatters";

export function DealerSummary({ estimate }: { estimate: EstimateWithRelations }) {
  return (
    <section className="mt-10 p-6 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="text-lg font-semibold text-green-800 mb-4">
        Dealer Summary
      </h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Total Due to Impact Plus:</span>
          <span className="font-medium">{formatMoney(estimate.totalPayable)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Final Price for Your Customer:</span>
          <span className="font-medium">{formatMoney(estimate.customerPriceT)}</span>
        </div>

        <div className="flex justify-between text-base font-bold text-green-700 pt-2 border-t">
          <span>Your Profit (Net Profit):</span>
          <span>{formatMoney(estimate.netProfitD)}</span>
        </div>
      </div>
    </section>
  );
}
