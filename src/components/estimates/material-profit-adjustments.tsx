import type { MaterialProfitsSummary } from "@/lib/dealer-earnings";
import { formatMoney } from "@/lib/formatters";

// Render only inside the existing staff financial summaries.
export function MaterialProfitAdjustments({
  profits,
  showDealerEarnings,
}: {
  profits: MaterialProfitsSummary;
  showDealerEarnings: boolean;
}) {
  const hasProcessingCost = profits.processingCostStatus != null;
  const processingPending = profits.processingCostStatus === "PENDING";
  const pendingNetProfit = processingPending
    ? "Pending processing cost confirmation"
    : "Pending real factory cost";
  const pendingRealProfit = processingPending
    ? "Pending processing cost confirmation"
    : profits.realProfit == null
      ? "Pending real factory cost"
      : "Pending dealer earnings";

  return (
    <>
      {hasProcessingCost && (
        <>
          <div>
            <div className="text-muted-foreground">Material processing cost</div>
            <div className="font-medium">{processingPending || profits.processingCost == null ? "Pending processing cost confirmation" : formatMoney(profits.processingCost)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Net real material profit</div>
            <div className="font-medium">{processingPending || profits.netRealProfit == null ? pendingNetProfit : formatMoney(profits.netRealProfit)}</div>
          </div>
        </>
      )}
      {showDealerEarnings && (
        <>
          <div>
            <div className="text-muted-foreground">Company expected profit after dealer earnings</div>
            <div className="font-medium">{profits.authenticExpectedProfit == null ? "Pending dealer earnings" : formatMoney(profits.authenticExpectedProfit)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{hasProcessingCost ? "Company real profit after processing costs and dealer earnings" : "Company real profit after dealer earnings"}</div>
            <div className="font-medium">{profits.authenticRealProfit == null ? pendingRealProfit : formatMoney(profits.authenticRealProfit)}</div>
          </div>
        </>
      )}
    </>
  );
}
