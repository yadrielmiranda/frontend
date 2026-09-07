import { Badge } from "@/components/ui/badge";
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
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Materials</h2>
          <p className="text-sm text-muted-foreground">
            {finalCustomerPays
              ? "Final-customer material sale for this internal dealer order."
              : "Material sale recorded when the order was created."}
          </p>
        </div>
        <Badge>Material paid</Badge>
      </div>

      <div className="ml-auto mt-4 grid max-w-md grid-cols-2 gap-2 text-sm">
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

      <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
        Installation, permit and City Fee, extra charges, and card-processing
        fees are excluded from this material total.
      </p>
    </section>
  );
}
