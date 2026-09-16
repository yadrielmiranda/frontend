import { OriginalPrice } from "@/components/promotions/promotion-price";
import { formatMoney, roundMoney } from "@/lib/formatters";
import type { OrderWithRelations } from "@/lib/types";

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function OrderMaterialPanel({ order }: { order: OrderWithRelations }) {
  const finalCustomerPays = order.dealerModeSnapshot === "INTERNAL";
  const discount = numberValue(finalCustomerPays ? order.estimate.customerDiscountAmount : order.estimate.discountAmount);
  const manual = order.estimate.manualDiscountSummary;
  const manualNetDiscount = numberValue(manual?.material.netDiscount);
  const materialSubtotal = numberValue(order.saleSubtotal);
  const taxRate = finalCustomerPays
    ? numberValue(order.estimate.customerTaxRate)
    : numberValue(order.estimate.taxRate);
  const taxAmount = manual ? numberValue(manual.material.tax) : finalCustomerPays
    ? numberValue(order.estimate.customerTaxAmount)
    : numberValue(order.estimate.taxAmount);
  const materialTotal = roundMoney(materialSubtotal + taxAmount);

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border bg-white">
      <h2 className="bg-slate-50 px-4 py-3 text-sm font-semibold">Materials</h2>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 p-4 text-sm">
        {discount > 0 && <><span>Before promotion</span><span className="text-right"><OriginalPrice amount={materialSubtotal + manualNetDiscount + discount} /></span><span>Promotion discount</span><span className="text-right text-red-700">−{formatMoney(discount)}</span></>}
        {manualNetDiscount > 0 && discount === 0 && <><span>Before additional discount</span><span className="text-right"><OriginalPrice amount={materialSubtotal + manualNetDiscount} label="Before discount" /></span></>}
        {manualNetDiscount > 0 && <><span>Additional discount</span><span className="text-right text-emerald-700">−{formatMoney(manualNetDiscount)}</span></>}
        <span className="text-muted-foreground">
          {manualNetDiscount > 0 ? "Subtotal after discount" : finalCustomerPays
            ? "Customer material subtotal"
            : "Material subtotal"}
        </span>
        <span className="text-right font-medium">
          {formatMoney(materialSubtotal)}
        </span>

        <span className="text-muted-foreground">
          Sales Tax ({(taxRate * 100).toFixed(2)}%)
        </span>
        <span className="text-right font-medium">{formatMoney(taxAmount)}</span>

        <strong className="border-t pt-2">Material total</strong>
        <strong className="border-t pt-2 text-right">
          {formatMoney(materialTotal)}
        </strong>
      </div>
    </section>
  );
}
