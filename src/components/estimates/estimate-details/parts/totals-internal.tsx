"use client";

import { EstimateWithRelations } from "@/lib/types";
import { formatMoney } from "@/lib/formatters";

export function TotalsInternal({ estimate }: { estimate: EstimateWithRelations }) {
  return (
    <section className="flex justify-end mt-10">
      <div className="w-full max-w-sm space-y-2">
        <div className="flex justify-between py-2">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-medium text-gray-800">
            {formatMoney(estimate.priceT)}
          </span>
        </div>

        <div className="flex justify-between py-2">
          <span className="text-gray-600">
            Sales Tax ({(Number(estimate.taxRate) * 100).toFixed(2)}%):
          </span>
          <span className="font-medium text-gray-800">
            {formatMoney(estimate.taxAmount)}
          </span>
        </div>

        <div className="flex justify-between py-3 border-t-2 mt-2">
          <span className="text-lg font-bold text-gray-900">Total:</span>
          <span className="text-lg font-bold text-gray-900">
            {formatMoney(estimate.totalPayable)}
          </span>
        </div>
      </div>
    </section>
  );
}
