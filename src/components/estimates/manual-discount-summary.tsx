import type { CompanyLocale } from "@/components/company/company-content";
import { summaryText } from "@/lib/estimate-financial-language";
import { formatMoney } from "@/lib/formatters";
import { discountScopeLabel, type EstimateDiscountSummary } from "@/lib/estimate-discount";

export function ManualDiscountSummary({
  locale = "en",
  summary,
}: {
  locale?: CompanyLocale;
  summary: EstimateDiscountSummary | null | undefined;
}) {
  const t = summaryText(locale);
  if (!summary) return null;
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
      <div className="flex items-center justify-between gap-4 font-semibold text-emerald-800">
        <span>{summary.scope === "MULTIPLE" ? t("Additional discounts") : `${t("Additional discount")} · ${t(discountScopeLabel[summary.scope])}`}</span>
        <span>−{formatMoney(Number(summary.discount))}</span>
      </div>
      {summary.scope === "MULTIPLE" && <dl className="mt-2 space-y-1 text-emerald-800">
        {Number(summary.material.netDiscount) > 0 && <div className="flex justify-between gap-4"><dt>{t("Material")}</dt><dd>−{formatMoney(Number(summary.material.netDiscount))}</dd></div>}
        {Number(summary.installation.discount) > 0 && <div className="flex justify-between gap-4"><dt>{t("Installation")}</dt><dd>−{formatMoney(Number(summary.installation.discount))}</dd></div>}
      </dl>}
      {summary.lockedAt && (
        <p className="mt-1 text-xs text-slate-600">
          {t("The agreed discount is preserved after payment.")}
        </p>
      )}
    </div>
  );
}
