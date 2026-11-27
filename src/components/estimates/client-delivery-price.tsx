import type { ClientDeliveryCoverage } from "@/app/api/client-delivery.api";
import { formatMoney } from "@/lib/formatters";
import { deliveryCopy } from "./client-delivery-copy";

const mileOptions: Intl.NumberFormatOptions = {
  style: "unit", unit: "mile", unitDisplay: "long", maximumFractionDigits: 4,
};
const mileFormat = { en: new Intl.NumberFormat("en-US", mileOptions), es: new Intl.NumberFormat("es-US", mileOptions) };

export function ClientDeliveryPrice({ available, estimatedPrice, locale = "en" }: Pick<ClientDeliveryCoverage, "available" | "estimatedPrice"> & { locale?: keyof typeof deliveryCopy }) {
  if (available !== true) return null;
  const copy = deliveryCopy[locale];
  const miles = mileFormat[locale];

  return (
    <section aria-label={copy.priceLabel} className="space-y-3 rounded-md border bg-background p-3 text-sm text-foreground">
      {estimatedPrice ? (
        <dl className="space-y-1.5">
          <div className="mb-2 flex items-baseline justify-between gap-3 border-b pb-2 font-semibold">
            <dt>{copy.optionalPrice}</dt>
            <dd className="text-lg tabular-nums">{formatMoney(estimatedPrice.total)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>{copy.basePrice(miles.format(Number(estimatedPrice.includedMiles)))}</dt>
            <dd className="tabular-nums">{formatMoney(estimatedPrice.basePrice)}</dd>
          </div>
          {Number(estimatedPrice.additionalMiles) > 0 && (
            <div className="flex justify-between gap-3">
              <dt>{copy.extraMiles} ({miles.format(Number(estimatedPrice.additionalMiles))})</dt>
              <dd className="tabular-nums">{formatMoney(estimatedPrice.additionalMileageCharge)}</dd>
            </div>
          )}
        </dl>
      ) : <p className="font-medium">{copy.priceUnavailable}</p>}
      <p className="text-muted-foreground">
        {copy.optionalPayment}
      </p>
    </section>
  );
}
