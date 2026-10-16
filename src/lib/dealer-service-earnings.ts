import { roundMoney } from "./formatters";
import type { DealerMode, EstimateCustomerChargeSummary, EstimateDealerNetwork } from "./types";

// Customer discounts and the company's installation-profile margin are not dealer increases.
export function dealerServiceEarnings(summary: EstimateCustomerChargeSummary | null | undefined): number | null {
  if (!summary || summary.customerTotalIncomplete || summary.systemTotalIncomplete ||
    summary.lines.some(line => line.needsReview)) return null;
  const customer = Number(summary.customerTotal);
  const base = Number(summary.systemTotal);
  return Number.isFinite(customer) && Number.isFinite(base) ? roundMoney(customer - base) : null;
}

export function internalDealerServiceEarnings({ dealerMode, network, summary, pending = false }: {
  dealerMode: DealerMode | null | undefined;
  network?: EstimateDealerNetwork | null;
  summary?: EstimateCustomerChargeSummary | null;
  pending?: boolean;
}): { dealer: number | null | undefined; subdealer: number | null | undefined } {
  if (dealerMode !== "INTERNAL") return { dealer: undefined, subdealer: undefined };
  const amount = pending ? null : dealerServiceEarnings(summary);
  return {
    dealer: !network || network.viewerIsOwner ? amount : undefined,
    // Staff receive the two material plans separately. Only the owning subdealer receives these increases.
    subdealer: network?.level === "SUBDEALER" && !network.viewerIsOwner ? amount : undefined,
  };
}
