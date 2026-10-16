export type ProfitAmount = {
  amount: string | null;
  status: "CALCULATED" | "PENDING_REAL_COST" | "PENDING_COST" | "PENDING_REVIEW";
};

// Amounts and participant order come from the server's saved pricing hierarchy.
export type NetworkProfitBreakdown = {
  version: 1;
  members: Array<{
    userId: number;
    username: string;
    level: "DEALER" | "SUBDEALER" | "DISTRIBUTOR";
    mode: "INTERNAL" | "EXTERNAL";
    material: ProfitAmount;
    services: ProfitAmount;
    total: ProfitAmount;
  }>;
  company: {
    materialExpected: ProfitAmount;
    materialReal: ProfitAmount;
    installation: ProfitAmount;
    expectedTotal: ProfitAmount;
  };
};
