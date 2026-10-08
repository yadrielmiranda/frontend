export type DealerEarningsBasis = "DEALER_MARKUP" | "EXPECTED_PROFIT" | "REAL_PROFIT";

export interface DealerEarningsPlan {
  id: number;
  name: string;
  basis: DealerEarningsBasis;
  percent: string;
  revision: number;
  isActive: boolean;
  _count?: { users: number };
}

export type SaveEarningsPlan = Pick<DealerEarningsPlan, "name" | "basis" | "percent" | "isActive">;

export const earningsBasisLabels: Record<DealerEarningsBasis, string> = {
  DEALER_MARKUP: "Dealer markup profit",
  EXPECTED_PROFIT: "Expected material profit",
  REAL_PROFIT: "Real material profit",
};
export const earningsBasisDescriptions: Record<DealerEarningsBasis, string> = {
  DEALER_MARKUP: "The dealer's own resale markup: customer price minus Dealer Price / Your Cost. Use 100% for the full markup.",
  EXPECTED_PROFIT: "Customer price minus the app base price before any markup. Dealer Price / Your Cost already includes the company's markup.",
  REAL_PROFIT: "Customer price minus real factory cost and material processing costs. Earnings remain pending until the required costs are confirmed.",
};

// Importes calculados por el backend; la interfaz solo los presenta.
export interface DealerEarningsSummary {
  planId: number | null;
  planName: string | null;
  basis: DealerEarningsBasis | "AVAILABLE_PROFIT";
  percent: string;
  label: string;
  status: "CALCULATED" | "PENDING_REAL_COST" | "PENDING_COST";
  amount: string | null;
}

export interface MaterialProfitsSummary {
  materialRefundCredit?: string;
  expectedProfit: string;
  realProfit: string | null;
  processingCost?: string | null;
  processingCostStatus?: "PENDING" | "CONFIRMED";
  netRealProfit?: string | null;
  netProfitD: string;
  authenticExpectedProfit: string | null;
  authenticRealProfit: string | null;
}

export interface ReferralCostsSummary {
  amount: string | null;
  status: "CALCULATED" | "PENDING_REAL_COST" | "PENDING_COST" | "PENDING_REVIEW" | "REVERSED";
}
