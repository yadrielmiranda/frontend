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
import type { CompanyLocale } from "@/components/company/company-content";
import type { PaymentSchedule } from "@/lib/payment-plan";
import { previewCustomPayment } from "@/lib/custom-payment";
import { CustomPaymentAmount, customPaymentErrorText } from "./custom-payment-amount";

type ManualMethod = Exclude<PaymentMethod, "CARD" | "BANK">;

const manualPaymentErrorsEs = new Map([
  ["Confirm that the funds are already available before recording a manual payment.", "Confirma que los fondos ya están disponibles antes de registrar el pago manual."],
  ["Card and Stripe bank payments must be confirmed through Stripe. Use ACH or WIRE for a verified manual bank payment.", "Confirma en Stripe los pagos procesados por Stripe. Para registrar una transferencia bancaria verificada, selecciona ACH o transferencia bancaria."],
  ["A check number, transfer confirmation, or receipt reference is required.", "Escribe el número del cheque, la confirmación de la transferencia o la referencia del recibo."],
  ["Invalid payment date.", "Escribe una fecha de pago válida."],
  ["Payment date cannot be in the future.", "La fecha de pago debe ser de hoy o anterior."],
  ["Only administrators or the internal dealer who owns this estimate can record a manual payment.", "Solo un administrador o el distribuidor interno titular de esta cotización puede registrar un pago manual."],
  ["Confirm customer acceptance of the City Fee adjustment.", "Confirma que el cliente aceptó el ajuste de la tasa municipal."],
  ["This charge is already paid or requires refund review.", "Este cargo ya está pagado o tiene un reembolso pendiente de revisión."],
  ["A new checkout was opened. Close it before recording a manual payment.", "Se inició otro pago. Cierra ese pago antes de registrar el pago manual."],
]);

const localDateTimeValue = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export function ManualPaymentDialog({
  locale = "en",
  estimateId,
  type,
  sequence,
  sequences,
  payFullBalance = false,
  amount,
  paymentSchedule,
  customAmount,
  label,
  disabled = false,
  requiresDepositTerms = false,
  requiresCityFeeAcceptance = false,
  cityFeeAmount,
  depositTerms,
  beforeSubmit,
  onRecorded,
}: {
  locale?: CompanyLocale;
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
  const spanish = locale === "es";
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
    if (manualCustom && !custom.valid) { toast.error(customPaymentErrorText(locale, custom.error!)); return; }
    if (!reference.trim()) {
      toast.error(spanish ? "Escribe la referencia del cheque, la transferencia o el recibo." : "Enter the check, transfer, or receipt reference.");
      return;
    }
    if (!fundsVerified) {
      toast.error(spanish ? "Confirma que ya verificaste los fondos." : "Confirm that the funds are already verified.");
      return;
    }
    if (requiresDepositTerms && !termsAccepted) {
      toast.error(spanish ? "Confirma que el cliente aceptó las condiciones del depósito." : "Confirm acceptance of the deposit terms.");
      return;
    }
    if (acceptsCityFee && !cityFeeAccepted) { toast.error(spanish ? "Confirma que el cliente aceptó el ajuste de la tasa municipal." : "Confirm customer acceptance of the City Fee adjustment."); return; }
    if (!paidAt || Number.isNaN(new Date(paidAt).getTime())) {
      toast.error(spanish ? "Escribe una fecha de pago válida." : "Enter a valid payment date.");
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
      toast.success(spanish ? "Pago registrado." : "Payment recorded.");
      setOpen(false);
      onRecorded?.(payment);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(spanish
        ? manualPaymentErrorsEs.get(message) ?? "No se pudo registrar el pago. Revisa los datos y el saldo actual."
        : message || "Could not record the payment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          <Banknote className="h-4 w-4" /> {label ?? (spanish ? "Registrar pago manual" : "Record manual payment")}
        </Button>
      </DialogTrigger>
      <DialogContent lang={locale} closeLabel={spanish ? "Cerrar" : "Close"} className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{spanish ? "Registrar un pago manual verificado" : "Record confirmed manual payment"}</DialogTitle>
          <DialogDescription>
            {spanish ? "Registra el importe recibido como abono al saldo seleccionado del proyecto. Hazlo después de verificar que los fondos están disponibles." : "This records the confirmed amount against the selected project balance. Use it only after the funds are visible and verified."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {manualCustom ? <CustomPaymentAmount locale={locale} input={customInput} preview={custom} disabled={busy}
            onChange={value => { setCustomInput(value); setCityFeeAccepted(false); }} /> : <div className="rounded-lg border bg-slate-50 p-3 text-sm">
            <div className="text-muted-foreground">{spanish ? "Importe recibido" : "Amount received"}</div>
            <div className="text-xl font-semibold">{formatMoney(amount)}</div>
          </div>}
          {custom.available && customAmount === undefined && <Button type="button" variant="outline" disabled={busy} onClick={() => {
            setManualCustom(!manualCustom); setCityFeeAccepted(false);
          }}>{manualCustom
            ? (spanish ? "Usar el importe de la cuota" : "Use scheduled amount")
            : (spanish ? "Pagar otro importe" : "Pay another amount")}</Button>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{spanish ? "Método de pago" : "Payment method"}</Label>
              <Select
                value={method}
                onValueChange={(value) => setMethod(value as ManualMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHECK">{spanish ? "Cheque" : "Check"}</SelectItem>
                  <SelectItem value="ZELLE">Zelle</SelectItem>
                  <SelectItem value="CASH">{spanish ? "Efectivo" : "Cash"}</SelectItem>
                  <SelectItem value="ACH">ACH</SelectItem>
                  <SelectItem value="WIRE">{spanish ? "Transferencia bancaria" : "Wire transfer"}</SelectItem>
                  <SelectItem value="OTHER">{spanish ? "Otro" : "Other"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="manual-paid-at">{spanish ? "Fecha de pago" : "Payment date"}</Label>
              <Input
                id="manual-paid-at"
                type="datetime-local"
                value={paidAt}
                onChange={(event) => setPaidAt(event.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="manual-reference">{spanish ? "Referencia" : "Reference"}</Label>
            <Input
              id="manual-reference"
              value={reference}
              maxLength={150}
              onChange={(event) => setReference(event.target.value)}
              placeholder={spanish ? "Número de cheque, confirmación o recibo" : "Check number, confirmation, or receipt"}
            />
          </div>

          <div>
            <Label htmlFor="manual-note">{spanish ? "Nota interna (opcional)" : "Internal note (optional)"}</Label>
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
              <span>{spanish ? "El cliente aceptó el ajuste de la tasa municipal de " : "The customer accepted the City Fee adjustment of "}{formatMoney(acceptedCityAmount)}.</span>
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
                  {spanish ? "El cliente aceptó las condiciones del depósito no reembolsable" : "Customer accepted the non-refundable deposit terms"}
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
              {spanish ? "Verifiqué que estos fondos ya están disponibles en la cuenta de la empresa." : "I verified that these funds are already available in the company account."}
            </strong>
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            {spanish ? "Cancelar" : "Cancel"}
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
            {spanish ? "Marcar como pagado" : "Mark paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
