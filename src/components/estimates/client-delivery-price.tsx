import type { ClientDeliveryCoverage } from "@/app/api/client-delivery.api";
import { formatMoney } from "@/lib/formatters";

const miles = new Intl.NumberFormat("en-US", {
  style: "unit", unit: "mile", unitDisplay: "long", maximumFractionDigits: 4,
});

export function ClientDeliveryPrice({ available, estimatedPrice }: Pick<ClientDeliveryCoverage, "available" | "estimatedPrice">) {
  if (available !== true) return null;

  return (
    <section aria-label="Estimated delivery price" className="space-y-3 rounded-md border bg-background p-3 text-sm text-foreground">
      {estimatedPrice ? (
        <dl className="space-y-1.5">
          <div className="mb-2 flex items-baseline justify-between gap-3 border-b pb-2 font-semibold">
            <dt>Optional delivery estimate</dt>
            <dd className="text-lg tabular-nums">{formatMoney(estimatedPrice.total)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Base price ({miles.format(Number(estimatedPrice.includedMiles))} included)</dt>
            <dd className="tabular-nums">{formatMoney(estimatedPrice.basePrice)}</dd>
          </div>
          {Number(estimatedPrice.additionalMiles) > 0 && (
            <div className="flex justify-between gap-3">
              <dt>Extra mileage ({miles.format(Number(estimatedPrice.additionalMiles))})</dt>
              <dd className="tabular-nums">{formatMoney(estimatedPrice.additionalMileageCharge)}</dd>
            </div>
          )}
        </dl>
      ) : <p className="font-medium">Optional delivery is available. A price estimate is currently unavailable.</p>}
      <p className="text-muted-foreground">
        You pay for delivery separately only if you request it.
      </p>
    </section>
  );
}
