import { roundMoney } from "./formatters";
import type { EstimateCustomerChargeSummary } from "./types";

// Additions are applied after the existing base-price discounts.
export function customerChargeAdditions(
  summary: EstimateCustomerChargeSummary | null | undefined,
  internalDealer: boolean,
  hasInstallation = true,
) {
  const additions = { installation: 0, permit: 0, city: 0, custom: 0 };
  if (!internalDealer) return additions;

  for (const line of summary?.lines ?? []) {
    if (!line.usedInCustomerQuote || line.customerAmount == null) continue;
    if (line.origin === "DEALER") {
      additions.custom += Number(line.customerAmount);
    } else if (hasInstallation && line.systemAmount != null) {
      const bucket = line.source === "PERMIT" ? "permit"
        : line.source === "CITY_FEE" ? "city" : "installation";
      additions[bucket] += Math.max(0, Number(line.customerAmount) - Number(line.systemAmount));
    }
  }

  return {
    installation: roundMoney(additions.installation),
    permit: roundMoney(additions.permit),
    city: roundMoney(additions.city),
    custom: roundMoney(additions.custom),
  };
}
