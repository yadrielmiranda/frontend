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

type ManualMethod = Exclude<PaymentMethod, "CARD">;

const localDateTimeValue = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export function ManualPaymentDialog({
  estimateId,
  type,
  sequence,
  amount,
  label = "Record manual payment",
  requiresDepositTerms = false,
  depositTerms,
  onRecorded,
}: {
  estimateId: number;
  type: PaymentType;
  sequence?: number;
  amount: number;
  label?: string;
  requiresDepositTerms?: boolean;
  depositTerms?: string | null;
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

  const submit = async () => {
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
    if (!paidAt || Number.isNaN(new Date(paidAt).getTime())) {
      toast.error("Enter a valid payment date.");
      return;
    }

    setBusy(true);
    try {
      const payment = await recordManualPayment({
        estimateId,
        type,
        sequence,
        method,
        fundsVerified: true,
        reference: reference.trim(),
        note: note.trim() || undefined,
        paidAt: new Date(paidAt).toISOString(),
        installationDepositTermsAccepted: requiresDepositTerms
          ? termsAccepted
          : undefined,
      });
      toast.success("Payment recorded and workflow updated.");
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
        <Button type="button" variant="outline">
          <Banknote className="h-4 w-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record confirmed manual payment</DialogTitle>
          <DialogDescription>
            This immediately marks the charge paid and advances the workflow.
            Use it only after the funds are visible and verified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-slate-50 p-3 text-sm">
            <div className="text-muted-foreground">Amount received</div>
            <div className="text-xl font-semibold">{formatMoney(amount)}</div>
          </div>

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
              (requiresDepositTerms && !termsAccepted)
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
