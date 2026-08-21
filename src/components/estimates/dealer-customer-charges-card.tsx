"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createDealerCustomerCharge,
  deleteEstimateCustomerCharge,
  getEstimateCustomerCharges,
  saveSystemCustomerCharge,
  updateDealerCustomerCharge,
} from "@/app/api/estimates.api";
import { formatMoney, roundMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type {
  EstimateCustomerChargePricingMode,
  EstimateCustomerChargeSummary,
  EstimateCustomerChargeSummaryLine,
} from "@/lib/types";
import { CircleDollarSign, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

type UiPricingMode = "SAME" | EstimateCustomerChargePricingMode;

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function customerPricePreview(
  line: EstimateCustomerChargeSummaryLine,
  mode: UiPricingMode,
  rawValue: string,
) {
  const systemAmount =
    line.systemAmount == null ? null : numberValue(line.systemAmount);
  const value = Number(rawValue);

  if (mode === "SAME") return systemAmount;
  if (!Number.isFinite(value) || value < 0) return null;
  if (mode === "FINAL") return roundMoney(value);
  if (systemAmount === null) return null;
  if (mode === "PERCENTAGE") {
    return roundMoney(systemAmount * (1 + value / 100));
  }
  return roundMoney(systemAmount + value);
}

function SystemChargeRow({
  estimateId,
  line,
  editable,
  onChange,
}: {
  estimateId: number;
  line: EstimateCustomerChargeSummaryLine;
  editable: boolean;
  onChange: (summary: EstimateCustomerChargeSummary) => void;
}) {
  const initialMode: UiPricingMode = line.pricingMode ?? "SAME";
  const [mode, setMode] = useState<UiPricingMode>(initialMode);
  const [value, setValue] = useState(
    line.pricingValue == null ? "" : String(numberValue(line.pricingValue)),
  );
  const [usedInCustomerQuote, setUsedInCustomerQuote] = useState(
    line.usedInCustomerQuote,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMode(line.pricingMode ?? "SAME");
    setValue(
      line.pricingValue == null ? "" : String(numberValue(line.pricingValue)),
    );
    setUsedInCustomerQuote(line.usedInCustomerQuote);
  }, [
    line.id,
    line.pricingMode,
    line.pricingValue,
    line.systemAmount,
    line.usedInCustomerQuote,
  ]);

  const preview = customerPricePreview(line, mode, value);
  const numericValue = Number(value);
  const needsValue = mode !== "SAME";
  const invalidValue =
    needsValue && (!Number.isFinite(numericValue) || numericValue < 0);
  const costPending = line.systemAmount == null;
  const derivedModeBlocked =
    costPending && (mode === "PERCENTAGE" || mode === "AMOUNT");

  const save = async () => {
    setBusy(true);
    try {
      const next = await saveSystemCustomerCharge(estimateId, {
        source: line.source as Exclude<typeof line.source, "CUSTOM">,
        sourceRefId: line.sourceRefId,
        pricingMode: mode,
        value: mode === "SAME" ? 0 : numericValue,
        usedInCustomerQuote,
      });

      onChange(next);
      toast.success("Customer price saved.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const changeUsage = async (nextUsedInCustomerQuote: boolean) => {
    const savedMode = line.pricingMode ?? "SAME";
    const savedValue =
      line.pricingValue == null ? 0 : numberValue(line.pricingValue);

    setUsedInCustomerQuote(nextUsedInCustomerQuote);
    setBusy(true);
    try {
      onChange(
        await saveSystemCustomerCharge(estimateId, {
          source: line.source as Exclude<typeof line.source, "CUSTOM">,
          sourceRefId: line.sourceRefId,
          pricingMode: savedMode,
          value: savedMode === "SAME" ? 0 : savedValue,
          usedInCustomerQuote: nextUsedInCustomerQuote,
        }),
      );
      toast.success(
        nextUsedInCustomerQuote
          ? "Charge added to the customer quote."
          : "Charge removed from the customer quote.",
      );
    } catch (error) {
      setUsedInCustomerQuote(line.usedInCustomerQuote);
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border border-slate-200 p-4 transition-colors",
        usedInCustomerQuote ? "bg-white" : "bg-slate-100/80",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-950">{line.description}</p>
          <p className="text-xs text-slate-500">
            Our price:{" "}
            {costPending
              ? "Pending"
              : formatMoney(numberValue(line.systemAmount))}
          </p>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-6">
          <div className="flex items-center gap-2 pt-1">
            <Switch
              id={`use-customer-charge-${line.sourceKey}`}
              checked={usedInCustomerQuote}
              disabled={!editable || busy}
              onCheckedChange={changeUsage}
              aria-label={`Use ${line.description} in customer quote`}
            />
            <Label htmlFor={`use-customer-charge-${line.sourceKey}`}>
              Use in customer quote
            </Label>
          </div>
          <div className="min-w-28 text-right">
            <p className="text-xs text-slate-500">Customer price</p>
            <p
              className={cn(
                "font-semibold",
                usedInCustomerQuote ? "text-slate-950" : "text-slate-500",
              )}
            >
              {!usedInCustomerQuote
                ? "Not used"
                : preview == null
                  ? "Pending"
                  : formatMoney(preview)}
            </p>
          </div>
        </div>
      </div>

      {usedInCustomerQuote && line.needsReview && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Our price changed after this customer price was saved. Review and save
          it again.
        </div>
      )}

      {editable && (
        <div
          className={cn(
            "grid gap-3 transition-opacity md:grid-cols-[minmax(190px,1fr)_minmax(150px,0.7fr)_auto] md:items-end",
            !usedInCustomerQuote && "opacity-40",
          )}
        >
          <div className="space-y-1.5">
            <Label>Pricing method</Label>
            <Select
              value={mode}
              disabled={!usedInCustomerQuote || busy}
              onValueChange={(next) => {
                const nextMode = next as UiPricingMode;
                setMode(nextMode);
                if (nextMode === "SAME") setValue("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SAME">Same as our price</SelectItem>
                <SelectItem value="PERCENTAGE" disabled={costPending}>
                  Percentage above cost
                </SelectItem>
                <SelectItem value="AMOUNT" disabled={costPending}>
                  Amount above cost
                </SelectItem>
                <SelectItem value="FINAL">Final customer price</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`customer-charge-${line.sourceKey}`}>
              {mode === "PERCENTAGE"
                ? "Percentage (%)"
                : mode === "AMOUNT"
                  ? "Amount above cost ($)"
                  : "Final price ($)"}
            </Label>
            <Input
              id={`customer-charge-${line.sourceKey}`}
              type="number"
              min="0"
              step={mode === "PERCENTAGE" ? "0.01" : "0.01"}
              value={value}
              disabled={!usedInCustomerQuote || busy || mode === "SAME"}
              onChange={(event) => setValue(event.target.value)}
              placeholder={mode === "SAME" ? "Uses our price" : "0.00"}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={
              !usedInCustomerQuote || busy || invalidValue || derivedModeBlocked
            }
            onClick={save}
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      )}

      {usedInCustomerQuote &&
        preview !== null &&
        line.systemAmount !== null &&
        preview < numberValue(line.systemAmount) && (
          <p className="text-xs font-medium text-amber-800">
            Customer price is below your cost.
          </p>
        )}
    </div>
  );
}

function DealerChargeRow({
  estimateId,
  line,
  editable,
  onChange,
}: {
  estimateId: number;
  line: EstimateCustomerChargeSummaryLine;
  editable: boolean;
  onChange: (summary: EstimateCustomerChargeSummary) => void;
}) {
  const [description, setDescription] = useState(line.description);
  const [amount, setAmount] = useState(
    String(numberValue(line.customerAmount)),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDescription(line.description);
    setAmount(String(numberValue(line.customerAmount)));
  }, [line.description, line.customerAmount]);

  if (!editable) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <p className="font-medium text-slate-950">{line.description}</p>
          <p className="text-xs text-slate-500">Dealer-created charge</p>
        </div>
        <p className="font-semibold">
          {formatMoney(numberValue(line.customerAmount))}
        </p>
      </div>
    );
  }

  const save = async () => {
    if (!line.id || !description.trim()) return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) return;

    setBusy(true);
    try {
      onChange(
        await updateDealerCustomerCharge(estimateId, line.id, {
          description: description.trim(),
          amount: numericAmount,
        }),
      );
      toast.success("Customer charge updated.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!line.id) return;
    setBusy(true);
    try {
      onChange(await deleteEstimateCustomerCharge(estimateId, line.id));
      toast.success("Customer charge removed.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(180px,1fr)_minmax(140px,0.4fr)_auto] md:items-end">
      <div className="space-y-1.5">
        <Label htmlFor={`dealer-charge-description-${line.id}`}>
          Charge description
        </Label>
        <Input
          id={`dealer-charge-description-${line.id}`}
          maxLength={150}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`dealer-charge-amount-${line.id}`}>
          Customer price ($)
        </Label>
        <Input
          id={`dealer-charge-amount-${line.id}`}
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={save}>
          <Save className="h-4 w-4" />
          <span className="sr-only">Save charge</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={remove}
        >
          <Trash2 className="h-4 w-4 text-red-600" />
          <span className="sr-only">Delete charge</span>
        </Button>
      </div>
    </div>
  );
}

export function DealerCustomerChargesCard({
  estimateId,
  initialSummary,
  refreshKey,
  editable,
  onSummaryChange,
}: {
  estimateId: number;
  initialSummary: EstimateCustomerChargeSummary | null;
  refreshKey: string;
  editable: boolean;
  onSummaryChange: (summary: EstimateCustomerChargeSummary | null) => void;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(!initialSummary);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const commit = (next: EstimateCustomerChargeSummary | null) => {
    setSummary(next);
    onSummaryChange(next);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    getEstimateCustomerCharges(estimateId)
      .then((next) => {
        if (active) commit(next);
      })
      .catch((error) => {
        if (active) toast.error((error as Error).message);
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
    // commit intentionally stays local so a parent render cannot restart this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimateId, refreshKey]);

  const systemLines = useMemo(
    () => summary?.lines.filter((line) => line.origin === "SYSTEM") ?? [],
    [summary],
  );
  const dealerLines = useMemo(
    () => summary?.lines.filter((line) => line.origin === "DEALER") ?? [],
    [summary],
  );

  const addCharge = async () => {
    const numericAmount = Number(amount);
    if (!description.trim()) {
      toast.error("Enter a charge description.");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      toast.error("Enter a valid customer price.");
      return;
    }

    setBusy(true);
    try {
      commit(
        await createDealerCustomerCharge(estimateId, {
          description: description.trim(),
          amount: numericAmount,
        }),
      );
      setDescription("");
      setAmount("");
      toast.success("Customer charge added.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5" /> Customer installation
              &amp; charges
            </CardTitle>
            <CardDescription>
              External dealer pricing only. These amounts appear in the customer
              report and never change what you owe us.
            </CardDescription>
          </div>
          <Badge variant="outline">Customer pricing</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {loading && !summary ? (
          <p className="text-sm text-slate-500">Loading customer charges…</p>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-950">
                  Generated by the system
                </h4>
                <p className="text-xs text-slate-500">
                  Use our price, add a percentage or amount, or set the final
                  customer price directly.
                </p>
              </div>

              {systemLines.length > 0 ? (
                systemLines.map((line) => (
                  <SystemChargeRow
                    key={line.sourceKey}
                    estimateId={estimateId}
                    line={line}
                    editable={editable}
                    onChange={commit}
                  />
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  No company installation charges exist. You can still add your
                  own installation and service prices below.
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-slate-200 pt-5">
              <div>
                <h4 className="text-sm font-semibold text-slate-950">
                  Created by the dealer
                </h4>
                <p className="text-xs text-slate-500">
                  Add installation or any other service even when you do not
                  request installation from us.
                </p>
              </div>

              {dealerLines.map((line) => (
                <DealerChargeRow
                  key={line.id}
                  estimateId={estimateId}
                  line={line}
                  editable={editable}
                  onChange={commit}
                />
              ))}

              {editable && (
                <div className="grid gap-3 rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-4 md:grid-cols-[minmax(180px,1fr)_minmax(140px,0.4fr)_auto] md:items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-customer-charge-description">
                      New charge
                    </Label>
                    <Input
                      id="new-customer-charge-description"
                      maxLength={150}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="e.g. Installation or Remove shutters"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-customer-charge-amount">
                      Customer price ($)
                    </Label>
                    <Input
                      id="new-customer-charge-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <Button type="button" disabled={busy} onClick={addCharge}>
                    <Plus className="mr-2 h-4 w-4" /> Add charge
                  </Button>
                </div>
              )}
            </div>

            {summary && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-slate-950">
                    Customer installation &amp; charges total
                  </span>
                  <span className="text-lg font-semibold text-slate-950">
                    {formatMoney(numberValue(summary.customerTotal))}
                  </span>
                </div>
                {summary.customerTotalIncomplete && (
                  <p className="mt-1 text-xs font-medium text-amber-800">
                    Some company prices are pending. Set a final customer price
                    or wait for the system price to complete the total.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
