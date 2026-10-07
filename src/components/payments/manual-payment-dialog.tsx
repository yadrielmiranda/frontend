"use client";

import { useState } from "react";
import { Banknote, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  recordManualPayment,
  type ManualPaymentResult,
} from "@/app/api/payments.api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/formatters";
import type { PaymentMethod, PaymentType } from "@/lib/types";
import type { PaymentSchedule } from "@/lib/payment-plan";
import { previewCustomPayment } from "@/lib/custom-payment";
import { CustomPaymentAmount } from "./custom-payment-amount";

type ManualMethod = Exclude<PaymentMethod, "CARD" | "BANK">;

const localDateTimeValue = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export function ManualPaymentDialog({
  estimateId,
  type,
  sequence,
  sequences,
  payFullBalance = false,
  amount,
  paymentSchedule,
  customAmount,
  label = "Record manual payment",
  disabled = false,
  requiresDepositTerms = false,
  requiresCityFeeAcceptance = false,
  cityFeeAmount,
  depositTerms,
  beforeSubmit,
  onRecorded,
}: {
  estimateId: number;
  type: PaymentType;
  sequence?: number;
  sequences?: number[];
  payFullBalance?: boolean;
  amount: number;
  paymentSchedule?: PaymentSchedule | null;
  customAmount?: number;
  label?: string;
  disabled?: boolean;
  requiresDepositTerms?: boolean;
  requiresCityFeeAcceptance?: boolean;
  cityFeeAmount?: number;
  depositTerms?: string | null;
  beforeSubmit?: () => Promise<boolean>;
  onRecorded?: (payment: ManualPaymentResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<ManualMethod>("CHECK");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState(localDateTimeValue);
  const [fundsVerified, setFundsVerified] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cityFeeAccepted, setCityFeeAccepted] = useState(false);
  const [manualCustom, setManualCustom] = useState(customAmount !== undefined);
  const [customInput, setCustomInput] = useState(customAmount?.toFixed(2) ?? "");
  const custom = previewCustomPayment(paymentSchedule, customInput);
  const acceptsCityFee = manualCustom ? Boolean(custom.cityFeeKey) : requiresCityFeeAcceptance;
  const acceptedCityAmount = manualCustom ? custom.cityFeeAmount : cityFeeAmount ?? amount;

  const submit = async () => {
    if (disabled || busy) return;
    if (manualCustom && !custom.valid) { toast.error(custom.error!); return; }
    if (!reference.trim()) {
      toast.error("Enter the check, transfer, or receipt reference.");
      return;
    }
    if (!fundsVerified) {
      toast.error("Confirm that the funds are already verified.");
      return;
    }
    if (requiresDepositTerms && !termsAccepted) {
      toast.error("Confirm acceptance of the deposit terms.");
      return;
    }
    if (acceptsCityFee && !cityFeeAccepted) { toast.error("Confirm customer acceptance of the City Fee adjustment."); return; }
    if (!paidAt || Number.isNaN(new Date(paidAt).getTime())) {
      toast.error("Enter a valid payment date.");
      return;
    }

    setBusy(true);
    try {
      if (beforeSubmit && !(await beforeSubmit())) return;
      const payment = await recordManualPayment({
        estimateId,
        type: manualCustom ? "INSTALLMENT" : type,
        sequence: manualCustom ? undefined : sequence,
        sequences: manualCustom ? undefined : sequences,
        ...(manualCustom ? { customAmount: custom.amount, expectedBalance: custom.maximum }
          : payFullBalance ? { payFullBalance: true, expectedBalance: amount } : {}),
        method,
        fundsVerified: true,
        cityFeeAccepted: acceptsCityFee ? cityFeeAccepted : undefined,
        reference: reference.trim(),
        note: note.trim() || undefined,
        paidAt: new Date(paidAt).toISOString(),
        installationDepositTermsAccepted: requiresDepositTerms
          ? termsAccepted
          : undefined,
      });
      toast.success("Payment recorded.");
      setOpen(false);
      onRecorded?.(payment);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          <Banknote className="h-4 w-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Record confirmed manual payment</DialogTitle>
          <DialogDescription>
            This records the confirmed amount against the selected project balance.
            Use it only after the funds are visible and verified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {manualCustom ? <CustomPaymentAmount input={customInput} preview={custom} disabled={busy}
            onChange={value => { setCustomInput(value); setCityFeeAccepted(false); }} /> : <div className="rounded-lg border bg-slate-50 p-3 text-sm">
            <div className="text-muted-foreground">Amount received</div>
            <div className="text-xl font-semibold">{formatMoney(amount)}</div>
          </div>}
          {custom.available && customAmount === undefined && <Button type="button" variant="outline" disabled={busy} onClick={() => {
            setManualCustom(!manualCustom); setCityFeeAccepted(false);
          }}>{manualCustom ? "Use scheduled amount" : "Pay another amount"}</Button>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Payment method</Label>
              <Select
                value={method}
                onValueChange={(value) => setMethod(value as ManualMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="ZELLE">Zelle</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="ACH">ACH</SelectItem>
                  <SelectItem value="WIRE">Wire transfer</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="manual-paid-at">Payment date</Label>
              <Input
                id="manual-paid-at"
                type="datetime-local"
                value={paidAt}
                onChange={(event) => setPaidAt(event.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="manual-reference">Reference</Label>
            <Input
              id="manual-reference"
              value={reference}
              maxLength={150}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Check number, confirmation, or receipt"
            />
          </div>

          <div>
            <Label htmlFor="manual-note">Internal note (optional)</Label>
            <Textarea
              id="manual-note"
              value={note}
              maxLength={1000}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          {acceptsCityFee && (
            <label className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
              <Checkbox checked={cityFeeAccepted} onCheckedChange={value => setCityFeeAccepted(value === true)} />
              <span>The customer accepted the City Fee adjustment of {formatMoney(acceptedCityAmount)}.</span>
            </label>
          )}
          {requiresDepositTerms && (
            <label className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              <Checkbox
                checked={termsAccepted}
                onCheckedChange={(checked) =>
                  setTermsAccepted(Boolean(checked))
                }
                className="mt-0.5"
              />
              <span>
                <strong className="block">
                  Customer accepted the non-refundable deposit terms
                </strong>
                {depositTerms && (
                  <span className="mt-1 block text-xs">{depositTerms}</span>
                )}
              </span>
            </label>
          )}

          <label className="flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
            <Checkbox
              checked={fundsVerified}
              onCheckedChange={(checked) => setFundsVerified(Boolean(checked))}
              className="mt-0.5"
            />
            <strong>
              I verified that these funds are already available in the company
              account.
            </strong>
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={
              busy ||
              !reference.trim() ||
              !fundsVerified ||
              (manualCustom && !custom.valid) ||
              (requiresDepositTerms && !termsAccepted) ||
              (acceptsCityFee && !cityFeeAccepted)
            }
            onClick={() => void submit()}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Mark paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
