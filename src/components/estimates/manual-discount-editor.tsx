"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateEstimateDiscount } from "@/app/api/estimates.api";
import { formatMoney } from "@/lib/formatters";
import {
  estimateDiscountRules,
  type EstimateDiscountConfig,
  type EstimateDiscountRule,
  type EstimateDiscountSummary,
  type EstimateDiscountUpdate,
} from "@/lib/estimate-discount";
import type { EstimateWithRelations } from "@/lib/types";

type DiscountFields = Record<"material" | "installation", EstimateDiscountRule>;
const emptyRule = (): EstimateDiscountRule => ({ type: "PERCENTAGE", value: "" });
const formValues = (config: EstimateDiscountConfig | null): DiscountFields => {
  const rules = estimateDiscountRules(config);
  return { material: rules.material ?? emptyRule(), installation: rules.installation ?? emptyRule() };
};
const sameRule = (left: EstimateDiscountRule, right: EstimateDiscountRule) =>
  Number(left.value || 0) === Number(right.value || 0) &&
  (Number(left.value || 0) === 0 || left.type === right.type);
const validRule = ({ type, value }: EstimateDiscountRule) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) && amount >= 0 && amount <= 9999999999.99 &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001 &&
    (type !== "PERCENTAGE" || amount <= 100);
};

export function ManualDiscountEditor({
  estimateId, config, summary, hasInstallation, disabled, busy = false, onSaved, onDirtyChange,
}: {
  estimateId: number;
  config: EstimateDiscountConfig | null;
  summary: EstimateDiscountSummary | null;
  hasInstallation: boolean;
  disabled: boolean;
  busy?: boolean;
  onSaved: (estimate: EstimateWithRelations) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const saved = formValues(config);
  const savedKey = JSON.stringify(saved);
  const [fields, setFields] = useState<DiscountFields>(saved);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setFields(JSON.parse(savedKey) as DiscountFields); }, [savedKey]);
  const dirty = !sameRule(fields.material, saved.material) || !sameRule(fields.installation, saved.installation);
  useEffect(() => { onDirtyChange(dirty || saving); }, [dirty, saving, onDirtyChange]);
  const unavailable = disabled || Boolean(config?.lockedAt) || busy || saving;
  const valid = validRule(fields.material) && validRule(fields.installation) &&
    (hasInstallation || Number(fields.installation.value || 0) === 0);
  const change = (key: keyof DiscountFields, rule: Partial<EstimateDiscountRule>) => {
    setFields(current => ({ ...current, [key]: { ...current[key], ...rule } }));
  };

  async function save(removeAll = false) {
    if (unavailable || (!removeAll && (!dirty || !valid))) return;
    const rule = (key: keyof DiscountFields) => removeAll || Number(fields[key].value || 0) === 0
      ? null : { type: fields[key].type, value: Number(fields[key].value) };
    const payload: EstimateDiscountUpdate = { material: rule("material"), installation: rule("installation") };
    setSaving(true);
    try {
      const updated = await updateEstimateDiscount(estimateId, payload);
      onSaved(updated);
      toast.success(payload.material || payload.installation ? "Additional discounts saved." : "Additional discounts removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the discounts.");
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="font-semibold text-slate-900">Additional discounts</div>
      <p className="mt-1 text-sm text-slate-600">Set a separate discount for material and installation. Leave an amount empty or at zero to apply no discount.</p>
      <fieldset disabled={unavailable} className="mt-4 grid gap-4 disabled:opacity-60 lg:grid-cols-2">
        {(["material", "installation"] as const).map(key => {
          const title = key === "material" ? "Material" : "Installation";
          const rule = fields[key];
          const missingInstallation = key === "installation" && !hasInstallation;
          return (
            <div key={key} className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-semibold text-slate-900">{title}</h4>
                {Number(rule.value || 0) !== 0 && <Button type="button" variant="ghost" size="sm"
                  aria-label={`Remove ${key} discount`} onClick={() => change(key, { value: "" })}>Remove</Button>}
              </div>
              <p className="mt-1 text-xs text-slate-600">{missingInstallation
                ? "Calculate installation first to add an installation discount."
                : key === "material" ? "Applied to the material subtotal before tax." : "Applied to the calculated installation total."}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="min-w-0 text-sm font-medium" htmlFor={`${key}-discount-type`}>
                  Discount type
                  <select id={`${key}-discount-type`} disabled={missingInstallation}
                    className="mt-1 w-full rounded-md border border-slate-400 bg-white p-2 disabled:bg-slate-100"
                    value={rule.type} onChange={event => change(key, { type: event.target.value as EstimateDiscountRule["type"] })}>
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="AMOUNT">Fixed amount ($)</option>
                  </select>
                </label>
                <label className="min-w-0 text-sm font-medium" htmlFor={`${key}-discount-value`}>
                  {rule.type === "PERCENTAGE" ? "Discount (%)" : "Discount ($)"}
                  <input id={`${key}-discount-value`} disabled={missingInstallation}
                    className="mt-1 w-full rounded-md border border-slate-400 bg-white p-2 disabled:bg-slate-100"
                    type="number" min="0" max={rule.type === "PERCENTAGE" ? 100 : undefined} step="0.01"
                    placeholder="0" value={rule.value} onChange={event => change(key, { value: event.target.value })} />
                </label>
              </div>
            </div>
          );
        })}
      </fieldset>
      {config?.scope === "PROJECT" && !unavailable && <p className="mt-3 text-sm text-amber-700">
        This estimate has a previous project discount. Saving material or installation discounts will replace it.
      </p>}
      {summary && <p className="mt-3 text-sm text-emerald-700">Saved total discount: {formatMoney(Number(summary.discount))}</p>}
      {(disabled || config?.lockedAt) && <p className="mt-3 text-sm text-slate-500">
        Discount changes are available only while the estimate is editable and has no payment or pending checkout.
      </p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {config && <Button type="button" variant="outline" disabled={unavailable} onClick={() => void save(true)}>Remove all discounts</Button>}
        {dirty && <Button type="button" variant="outline" disabled={saving} onClick={() => setFields(saved)}>Discard</Button>}
        <Button type="button" disabled={unavailable || !dirty || !valid} onClick={() => void save()}>
          {saving ? "Saving…" : "Save discounts"}
        </Button>
      </div>
    </div>
  );
}
