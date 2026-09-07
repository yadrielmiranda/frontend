"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateEstimateDiscount } from "@/app/api/estimates.api";
import { formatMoney } from "@/lib/formatters";
import {
  discountScopeLabel,
  type EstimateDiscountConfig,
  type EstimateDiscountScope,
  type EstimateDiscountSummary,
} from "@/lib/estimate-discount";
import type { EstimateWithRelations } from "@/lib/types";

export function ManualDiscountEditor({
  estimateId,
  config,
  summary,
  hasInstallation,
  disabled,
  busy = false,
  onSaved,
  onDirtyChange,
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
  // Un destino anterior no se convierte a materiales de forma silenciosa.
  const savedScope: EstimateDiscountScope | "" =
    !config || config.scope === "MATERIAL"
      ? "MATERIAL"
      : config.scope === "INSTALLATION" && hasInstallation
        ? "INSTALLATION"
        : "";
  const [scope, setScope] = useState<EstimateDiscountScope | "">(savedScope);
  const [type, setType] = useState(config?.type ?? "PERCENTAGE");
  const [value, setValue] = useState(config?.value ?? "");
  const [saving, setSaving] = useState(false);
  const reset = () => {
    setScope(savedScope);
    setType(config?.type ?? "PERCENTAGE");
    setValue(config?.value ?? "");
  };
  useEffect(() => {
    reset();
  }, [savedScope, config?.type, config?.value]);
  const dirty =
    scope !== savedScope ||
    type !== (config?.type ?? "PERCENTAGE") ||
    Number(value || 0) !== Number(config?.value ?? 0);
  useEffect(() => {
    onDirtyChange(dirty || saving);
  }, [dirty, saving, onDirtyChange]);
  const valid =
    (scope === "MATERIAL" || (scope === "INSTALLATION" && hasInstallation)) &&
    value !== "" &&
    Number.isFinite(Number(value)) &&
    Number(value) > 0 &&
    (type !== "PERCENTAGE" || Number(value) <= 100);
  async function save(remove = false) {
    if (disabled || busy || saving || (!remove && (!valid || !scope))) return;
    setSaving(true);
    try {
      const updated = await updateEstimateDiscount(
        estimateId,
        remove
          ? { value: 0 }
          : {
              scope: scope as EstimateDiscountScope,
              type,
              value: Number(value),
            },
      );
      onSaved(updated);
      toast.success(
        remove ? "Additional discount removed." : "Additional discount saved.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the discount.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="font-semibold text-slate-900">Additional discount</div>
      <fieldset
        disabled={disabled || busy || saving}
        className="mt-4 grid gap-3 sm:grid-cols-3 disabled:opacity-60"
      >
        <label className="text-sm font-medium">
          Apply to
          <select
            className="mt-1 w-full rounded-md border border-slate-400 bg-white p-2"
            value={scope === "INSTALLATION" && !hasInstallation ? "" : scope}
            onChange={(e) => setScope(e.target.value as typeof scope)}
          >
            <option value="" disabled>
              Select
            </option>
            <option value="MATERIAL">{discountScopeLabel.MATERIAL}</option>
            {hasInstallation && (
              <option value="INSTALLATION">
                {discountScopeLabel.INSTALLATION}
              </option>
            )}
          </select>
        </label>
        <label className="text-sm font-medium">
          Discount type
          <select
            className="mt-1 w-full rounded-md border border-slate-400 bg-white p-2"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          >
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="AMOUNT">Fixed amount ($)</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          {type === "PERCENTAGE" ? "Discount (%)" : "Discount ($)"}
          <input
            className="mt-1 w-full rounded-md border border-slate-400 bg-white p-2"
            type="number"
            min="0"
            max={type === "PERCENTAGE" ? 100 : undefined}
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
      </fieldset>
      {config?.scope === "PROJECT" && !disabled && (
        <p className="mt-3 text-sm text-amber-700">
          This estimate has a previous project discount. Select Material or Installation and save
          to replace it, or remove the discount.
        </p>
      )}
      {summary && (
        <p className="mt-3 text-sm text-emerald-700">
          {discountScopeLabel[summary.scope]} ·{" "}
          {formatMoney(Number(summary.discount))} discount
        </p>
      )}
      {disabled && (
        <p className="mt-3 text-sm text-slate-500">
          Discount changes are available only while the estimate is editable and
          has no payment or pending checkout.
        </p>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {config && (
          <Button
            type="button"
            variant="outline"
            disabled={disabled || busy || saving}
            onClick={() => save(true)}
          >
            Remove discount
          </Button>
        )}
        {dirty && (
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={reset}
          >
            Discard
          </Button>
        )}
        <Button
          type="button"
          disabled={disabled || busy || saving || !dirty || !valid}
          onClick={() => save()}
        >
          {saving ? "Saving…" : "Save discount"}
        </Button>
      </div>
    </div>
  );
}
