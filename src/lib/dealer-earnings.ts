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
  REAL_PROFIT: "Customer price minus the real factory cost. Earnings remain pending until that cost is recorded.",
};

// Importes calculados por el backend; la interfaz solo los presenta.
export interface DealerEarningsSummary {
  planId: number | null;
  planName: string | null;
  basis: DealerEarningsBasis;
  percent: string;
  label: string;
  status: "CALCULATED" | "PENDING_REAL_COST";
  amount: string | null;
}

export interface MaterialProfitsSummary {
  expectedProfit: string;
  realProfit: string | null;
  netProfitD: string;
  authenticExpectedProfit: string | null;
  authenticRealProfit: string | null;
}
