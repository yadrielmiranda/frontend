"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  DealerMode,
  EstimateCustomerChargePricingMode,
  EstimateCustomerChargeSummary,
  EstimateCustomerChargeSummaryLine,
} from "@/lib/types";
import { CircleDollarSign, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

type UiPricingMode = "SAME" | EstimateCustomerChargePricingMode;
type ChargeMutation = (operation: () => Promise<EstimateCustomerChargeSummary>) => Promise<boolean>;

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function initialPricingValue(
  pricingMode: EstimateCustomerChargeSummaryLine["pricingMode"],
  pricingValue: EstimateCustomerChargeSummaryLine["pricingValue"],
  internalDealer: boolean,
) {
  if (internalDealer && pricingMode !== "PERCENTAGE" && pricingMode !== "AMOUNT") {
    return "0";
  }
  return pricingValue == null ? "" : String(numberValue(pricingValue));
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
  internalDealer,
  busy,
  runMutation,
}: {
  estimateId: number;
  line: EstimateCustomerChargeSummaryLine;
  editable: boolean;
  internalDealer: boolean;
  busy: boolean;
  runMutation: ChargeMutation;
}) {
  const initialMode: UiPricingMode = internalDealer
    ? line.pricingMode === "PERCENTAGE" ? "PERCENTAGE" : "AMOUNT"
    : line.pricingMode ?? "SAME";
  const [mode, setMode] = useState<UiPricingMode>(initialMode);
  const [value, setValue] = useState(
    initialPricingValue(line.pricingMode, line.pricingValue, internalDealer),
  );
  const [usedInCustomerQuote, setUsedInCustomerQuote] = useState(
    internalDealer || line.usedInCustomerQuote,
  );

  useEffect(() => {
    setMode(internalDealer
      ? line.pricingMode === "PERCENTAGE" ? "PERCENTAGE" : "AMOUNT"
      : line.pricingMode ?? "SAME");
    setValue(initialPricingValue(line.pricingMode, line.pricingValue, internalDealer));
    setUsedInCustomerQuote(internalDealer || line.usedInCustomerQuote);
  }, [
    line.id,
    line.pricingMode,
    line.pricingValue,
    line.systemAmount,
    line.usedInCustomerQuote,
    internalDealer,
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
    if (!editable || busy || invalidValue || derivedModeBlocked) return;
    const saved = await runMutation(() => saveSystemCustomerCharge(estimateId, {
        source: line.source as Exclude<typeof line.source, "CUSTOM">,
        sourceRefId: line.sourceRefId,
        pricingMode: mode,
        value: mode === "SAME" ? 0 : numericValue,
        usedInCustomerQuote: internalDealer || usedInCustomerQuote,
      }));
    if (saved) toast.success("Customer price saved.");
  };

  const changeUsage = async (nextUsedInCustomerQuote: boolean) => {
    if (!editable || busy || internalDealer) return;
    const savedMode = line.pricingMode ?? "SAME";
    const savedValue =
      line.pricingValue == null ? 0 : numberValue(line.pricingValue);

    const saved = await runMutation(() => saveSystemCustomerCharge(estimateId, {
          source: line.source as Exclude<typeof line.source, "CUSTOM">,
          sourceRefId: line.sourceRefId,
          pricingMode: savedMode,
          value: savedMode === "SAME" ? 0 : savedValue,
          usedInCustomerQuote: nextUsedInCustomerQuote,
        }));
    if (saved) {
      setUsedInCustomerQuote(nextUsedInCustomerQuote);
      toast.success(
        nextUsedInCustomerQuote
          ? "Charge added to the customer quote."
          : "Charge removed from the customer quote.",
      );
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
          {!internalDealer && <div className="flex items-center gap-2 pt-1">
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
          </div>}
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
                {!internalDealer && <SelectItem value="SAME">Same as our price</SelectItem>}
                <SelectItem value="PERCENTAGE" disabled={costPending}>
                  Percentage above cost
                </SelectItem>
                <SelectItem value="AMOUNT" disabled={costPending}>
                  Amount above cost
                </SelectItem>
                {!internalDealer && <SelectItem value="FINAL">Final customer price</SelectItem>}
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
  busy,
  runMutation,
}: {
  estimateId: number;
  line: EstimateCustomerChargeSummaryLine;
  editable: boolean;
  busy: boolean;
  runMutation: ChargeMutation;
}) {
  const [description, setDescription] = useState(line.description);
  const [amount, setAmount] = useState(
    String(numberValue(line.customerAmount)),
  );

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
    if (!editable || busy || !line.id || !description.trim()) return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) return;

    const saved = await runMutation(() => updateDealerCustomerCharge(estimateId, line.id!, {
          description: description.trim(),
          amount: numericAmount,
        }));
    if (saved) toast.success("Customer charge updated.");
  };

  const remove = async () => {
    if (!editable || busy || !line.id) return;
    const removed = await runMutation(() => deleteEstimateCustomerCharge(estimateId, line.id!));
    if (removed) toast.success("Customer charge removed.");
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
          disabled={busy}
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
          disabled={busy}
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
  dealerMode,
  initialSummary,
  refreshKey,
  editable,
  onSummaryChange,
  onBusyChange,
  onError,
}: {
  estimateId: number;
  dealerMode: DealerMode | null;
  initialSummary: EstimateCustomerChargeSummary | null;
  refreshKey: string;
  editable: boolean;
  onSummaryChange: (summary: EstimateCustomerChargeSummary | null) => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  onError?: () => void;
}) {
  const internalDealer = dealerMode === "INTERNAL";
  const [summary, setSummary] = useState(initialSummary);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(true);
  const pendingRequests = useRef(0);
  const generation = useRef(0);
  const requestQueue = useRef<Promise<unknown>>(Promise.resolve());
  const callbacks = useRef({ onSummaryChange, onBusyChange, onError });
  callbacks.current = { onSummaryChange, onBusyChange, onError };

  const enqueue = useCallback((
    operation: () => Promise<EstimateCustomerChargeSummary | null>,
    requestGeneration: number,
    refresh = false,
  ): Promise<boolean> => {
    pendingRequests.current += 1;
    setBusy(true);
    callbacks.current.onBusyChange?.(true);
    const request = requestQueue.current.then(async () => {
      if (refresh && generation.current !== requestGeneration) return;
      const next = await operation();
      if (generation.current === requestGeneration) {
        setSummary(next);
        await callbacks.current.onSummaryChange(next);
      }
    });
    requestQueue.current = request.catch(() => undefined);
    return request.then(() => true).catch((error) => {
      if (generation.current === requestGeneration) {
        callbacks.current.onError?.();
        toast.error((error as Error).message);
      }
      return false;
    }).finally(() => {
      pendingRequests.current -= 1;
      if (pendingRequests.current === 0) {
        setBusy(false);
        callbacks.current.onBusyChange?.(false);
      }
    });
  }, []);

  const runMutation: ChargeMutation = async (operation) => {
    if (!editable || pendingRequests.current > 0) return false;
    return enqueue(operation, ++generation.current);
  };

  useEffect(() => {
    const requestGeneration = ++generation.current;
    void enqueue(() => getEstimateCustomerCharges(estimateId), requestGeneration, true);

    return () => {
      if (generation.current === requestGeneration) generation.current += 1;
    };
  }, [estimateId, refreshKey, enqueue]);

  const systemLines = useMemo(
    () => summary?.lines.filter((line) => line.origin === "SYSTEM") ?? [],
    [summary],
  );
  const dealerLines = useMemo(
    () => summary?.lines.filter((line) => line.origin === "DEALER") ?? [],
    [summary],
  );

  const addCharge = async () => {
    if (!editable || pendingRequests.current > 0) return;
    const numericAmount = Number(amount);
    if (!description.trim()) {
      toast.error("Enter a charge description.");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      toast.error("Enter a valid customer price.");
      return;
    }

    const saved = await runMutation(() => createDealerCustomerCharge(estimateId, {
          description: description.trim(),
          amount: numericAmount,
        }));
    if (saved) {
      setDescription("");
      setAmount("");
      toast.success("Customer charge added.");
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
              {internalDealer
                ? "These amounts are included in the total the customer pays us, including any amounts added above our price and dealer-created charges."
                : "External dealer pricing only. These amounts appear in the customer report and never change what you owe us."}
            </CardDescription>
          </div>
          <Badge variant="outline">Customer pricing</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {busy && !summary ? (
          <p className="text-sm text-slate-500">Loading customer charges…</p>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-950">
                  Generated by the system
                </h4>
                <p className="text-xs text-slate-500">
                  {internalDealer
                    ? "Add a percentage or amount above our calculated price. Use zero to keep our price. Calculated charges are always included in the customer total."
                    : "Use our price, add a percentage or amount, or set the final customer price directly."}
                </p>
              </div>

              {systemLines.length > 0 ? (
                systemLines.map((line) => (
                  <SystemChargeRow
                    key={line.sourceKey}
                    estimateId={estimateId}
                    line={line}
                    editable={editable}
                    internalDealer={internalDealer}
                    busy={busy}
                    runMutation={runMutation}
                  />
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  {internalDealer
                    ? "No installation has been calculated. You can still add other charges below."
                    : "No company installation charges exist. You can still add your own installation and service prices below."}
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-slate-200 pt-5">
              <div>
                <h4 className="text-sm font-semibold text-slate-950">
                  Created by the dealer
                </h4>
                <p className="text-xs text-slate-500">
                  {internalDealer
                    ? "Add any additional work or service with a description and customer price."
                    : "Add installation or any other service even when you do not request installation from us."}
                </p>
              </div>

              {dealerLines.map((line) => (
                <DealerChargeRow
                  key={line.id}
                  estimateId={estimateId}
                  line={line}
                  editable={editable}
                  busy={busy}
                  runMutation={runMutation}
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
                      disabled={busy}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder={internalDealer ? "e.g. Remove shutters" : "e.g. Installation or Remove shutters"}
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
                      disabled={busy}
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
                    {internalDealer
                      ? "Some company prices are pending. The total will be complete once those prices are available."
                      : "Some company prices are pending. Set a final customer price or wait for the system price to complete the total."}
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
