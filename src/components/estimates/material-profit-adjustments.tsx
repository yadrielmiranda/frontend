import type { MaterialProfitsSummary, ReferralCostsSummary } from "@/lib/dealer-earnings";
import { formatMoney } from "@/lib/formatters";

// Render only inside the existing staff financial summaries.
export function MaterialProfitAdjustments({
  profits,
  showDealerEarnings,
  referralCosts,
}: {
  profits: MaterialProfitsSummary;
  showDealerEarnings: boolean;
  referralCosts?: ReferralCostsSummary | null;
}) {
  const hasProcessingCost = profits.processingCostStatus != null;
  const processingPending = profits.processingCostStatus === "PENDING";
  const pendingNetProfit = processingPending
    ? "Pending processing cost confirmation"
    : "Pending real factory cost";
  const pendingReferral = referralCosts?.amount == null && referralCosts != null;
  const earningsLabel = [showDealerEarnings ? "dealer earnings" : "", referralCosts ? "referral rewards" : ""].filter(Boolean).join(" and ");
  const pendingRealProfit = pendingReferral ? "Pending referral reward" : processingPending
    ? "Pending processing cost confirmation"
    : profits.realProfit == null
      ? "Pending real factory cost"
      : "Pending dealer earnings";

  return (
    <>
      {Number(profits.materialRefundCredit ?? 0) > 0 && <div>
        <div className="text-muted-foreground">Approved material refund credit</div>
        <div className="font-medium">{formatMoney(profits.materialRefundCredit!)}</div>
      </div>}
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
      {referralCosts && <div>
        <div className="text-muted-foreground">Referral reward cost</div>
        <div className="font-medium">{referralCosts.amount == null ? "Pending final reward calculation" : formatMoney(referralCosts.amount)}</div>
      </div>}
      {(showDealerEarnings || referralCosts) && (
        <>
          <div>
            <div className="text-muted-foreground">Company expected profit after {earningsLabel}</div>
            <div className="font-medium">{profits.authenticExpectedProfit == null ? pendingReferral ? "Pending referral reward" : "Pending dealer earnings" : formatMoney(profits.authenticExpectedProfit)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Company real profit after {hasProcessingCost ? "processing costs and " : ""}{earningsLabel}</div>
            <div className="font-medium">{profits.authenticRealProfit == null ? pendingRealProfit : formatMoney(profits.authenticRealProfit)}</div>
          </div>
        </>
      )}
    </>
  );
}
