import type { CompanyLocale } from "@/components/company/company-content";
import { summaryText } from "@/lib/estimate-financial-language";
import type { MaterialProfitsSummary, ReferralCostsSummary } from "@/lib/dealer-earnings";
import { formatMoney } from "@/lib/formatters";

// Render only inside the existing staff financial summaries.
export function MaterialProfitAdjustments({
  locale = "en",
  profits,
  showDealerEarnings,
  referralCosts,
}: {
  locale?: CompanyLocale;
  profits: MaterialProfitsSummary;
  showDealerEarnings: boolean;
  referralCosts?: ReferralCostsSummary | null;
}) {
  const t = summaryText(locale);
  const hasProcessingCost = profits.processingCostStatus != null;
  const processingPending = profits.processingCostStatus === "PENDING";
  const pendingNetProfit = processingPending
    ? t("Pending processing cost confirmation")
    : t("Pending real factory cost");
  const pendingReferral = referralCosts?.amount == null && referralCosts != null;
  const spanish = locale === "es";
  const earningsLabel = [
    showDealerEarnings ? (spanish ? "las ganancias del distribuidor" : "dealer earnings") : "",
    referralCosts ? (spanish ? "las recompensas por referidos" : "referral rewards") : "",
  ].filter(Boolean).join(spanish ? " y " : " and ");
  const pendingRealProfit = pendingReferral ? t("Pending referral reward") : processingPending
    ? t("Pending processing cost confirmation")
    : profits.realProfit == null
      ? t("Pending real factory cost")
      : t("Pending dealer earnings");

  return (
    <>
      {Number(profits.materialRefundCredit ?? 0) > 0 && <div>
        <div className="text-muted-foreground">{t("Approved material refund credit")}</div>
        <div className="font-medium">{formatMoney(profits.materialRefundCredit!)}</div>
      </div>}
      {hasProcessingCost && (
        <>
          <div>
            <div className="text-muted-foreground">{t("Material processing cost")}</div>
            <div className="font-medium">{processingPending || profits.processingCost == null ? t("Pending processing cost confirmation") : formatMoney(profits.processingCost)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("Net real material profit")}</div>
            <div className="font-medium">{processingPending || profits.netRealProfit == null ? pendingNetProfit : formatMoney(profits.netRealProfit)}</div>
          </div>
        </>
      )}
      {referralCosts && <div>
        <div className="text-muted-foreground">{t("Referral reward cost")}</div>
        <div className="font-medium">{referralCosts.amount == null ? t("Pending final reward calculation") : formatMoney(referralCosts.amount)}</div>
      </div>}
      {(showDealerEarnings || referralCosts) && (
        <>
          <div>
            <div className="text-muted-foreground">{spanish ? "Ganancia prevista de la empresa tras descontar" : "Company expected profit after"} {earningsLabel}</div>
            <div className="font-medium">{profits.authenticExpectedProfit == null ? pendingReferral ? t("Pending referral reward") : t("Pending dealer earnings") : formatMoney(profits.authenticExpectedProfit)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{spanish ? "Ganancia real de la empresa tras descontar" : "Company real profit after"} {hasProcessingCost && (spanish ? "los costos de procesamiento y " : "processing costs and ")}{earningsLabel}</div>
            <div className="font-medium">{profits.authenticRealProfit == null ? pendingRealProfit : formatMoney(profits.authenticRealProfit)}</div>
          </div>
        </>
      )}
    </>
  );
}
