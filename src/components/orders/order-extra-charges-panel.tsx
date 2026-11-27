"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { OrderExtraCharge, OrderWithRelations } from "@/lib/types";
import {
  createOrderExtraCharge,
  respondOrderExtraCharge,
} from "@/app/api/orders.api";
import { createCheckoutSession } from "@/app/api/payments.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/formatters";
import type { CompanyLocale } from "@/components/company/company-content";
import { checkoutErrorText, paymentText } from "@/lib/estimate-payment-language";
import { titleCase } from "@/lib/installation-flow";
import { ManualPaymentDialog } from "@/components/payments/manual-payment-dialog";
import { EstimatePaymentLinkActions } from "@/components/estimates/estimate-payment-link-actions";
import { CardFeeBreakdown } from "@/components/payments/card-fee-breakdown";
import { getCardPaymentBreakdown } from "@/lib/card-payment";
import { OrderPaymentSection } from "./order-payment-section";

type DraftLine = {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  taxable: boolean;
};

const chargeStatusesEs: Record<OrderExtraCharge["status"], string> = {
  DRAFT: "Borrador",
  PENDING_CUSTOMER_APPROVAL: "Pendiente de aprobación del cliente",
  PAYMENT_DUE: "Pendiente de pago",
  PAID: "Pagado",
  REJECTED: "Rechazado",
  CANCELED: "Cancelado",
};

const chargeErrorsEs = new Map([
  ["Installation extra charges require an installation order.", "Los cargos adicionales requieren una orden con instalación."],
  ["Extra charges can be created after the installation order is Delivered.", "Puedes agregar cargos cuando la orden con instalación figure como entregada."],
  ["An approved installation quote is required.", "Se requiere una cotización de instalación aprobada."],
  ["Installation must be paid before creating extra charges.", "Debes pagar la instalación antes de crear cargos adicionales."],
  ["Sales tax must be stored as a decimal fraction between 0 and 1.", "El impuesto sobre las ventas debe configurarse como una fracción decimal entre 0 y 1."],
  ["Every extra-charge line requires a description.", "Escribe una descripción para cada concepto del cargo adicional."],
  ["Extra charge not found.", "No se encontró el cargo adicional."],
  ["This extra charge is not awaiting customer approval.", "Este cargo adicional ya no está pendiente de aprobación del cliente."],
]);

function chargeError(locale: CompanyLocale, error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  return locale === "es" ? chargeErrorsEs.get(message) ?? fallback : message || fallback;
}

const emptyLine = (id: number): DraftLine => ({
  id,
  description: "",
  quantity: "1",
  unitPrice: "",
  taxable: false,
});

export function OrderExtraChargesPanel({
  locale = "en",
  paymentTarget,
  order,
  isOwner,
  isPrivileged,
  cardSurchargeFraction,
  canRecordManualPayment,
}: {
  locale?: CompanyLocale;
  paymentTarget: HTMLDivElement | null;
  order: OrderWithRelations;
  isOwner: boolean;
  isPrivileged: boolean;
  cardSurchargeFraction: number;
  canRecordManualPayment: boolean;
}) {
  const spanish = locale === "es";
  const chargeLabel = spanish ? "Cargo adicional" : "Extra charge";
  const canPay = order.estimate.dealerNetwork ? order.estimate.dealerNetwork.canPay : isOwner;
  const router = useRouter();
  const [charges, setCharges] = useState(order.extraCharges ?? []);
  const [showForm, setShowForm] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(1)]);
  const [nextLineId, setNextLineId] = useState(2);
  const [notes, setNotes] = useState("");
  const [comments, setComments] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  const replaceCharge = (updated: OrderExtraCharge) => {
    setCharges((current) =>
      current.map((charge) => (charge.id === updated.id ? updated : charge)),
    );
  };

  const createCharge = async () => {
    const payload = lines.map((line) => ({
      description: line.description.trim(),
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      taxable: line.taxable,
    }));
    if (
      payload.some(
        (line) =>
          !line.description ||
          !Number.isFinite(line.quantity) ||
          line.quantity <= 0 ||
          !Number.isFinite(line.unitPrice) ||
          line.unitPrice <= 0,
      )
    ) {
      toast.error(spanish ? "Completa cada concepto con una descripción, una cantidad y un precio válidos." : "Complete every extra-charge line with valid values.");
      return;
    }

    setBusy(true);
    try {
      const created = await createOrderExtraCharge(order.id, {
        lines: payload,
        notes: notes.trim() || undefined,
      });
      setCharges((current) => [...current, created]);
      setLines([emptyLine(1)]);
      setNextLineId(2);
      setNotes("");
      setShowForm(false);
      toast.success(spanish ? "Se envió el cargo adicional para que el cliente lo apruebe." : "Extra charge sent for customer approval.");
    } catch (error) {
      toast.error(chargeError(locale, error, spanish ? "No se pudo crear el cargo adicional." : "Could not create the extra charge."));
    } finally {
      setBusy(false);
    }
  };

  const respond = async (
    charge: OrderExtraCharge,
    decision: "APPROVE" | "REJECT",
  ) => {
    setBusy(true);
    try {
      replaceCharge(
        await respondOrderExtraCharge(
          charge.id,
          decision,
          comments[charge.id]?.trim() || undefined,
        ),
      );
      toast.success(
        decision === "APPROVE"
          ? (spanish ? "Cargo adicional aprobado." : "Extra charge approved.")
          : (spanish ? "Cargo adicional rechazado." : "Extra charge rejected."),
      );
    } catch (error) {
      toast.error(chargeError(locale, error, spanish ? "No se pudo guardar la respuesta al cargo adicional." : "Could not save the response to the extra charge."));
    } finally {
      setBusy(false);
    }
  };

  const pay = async (charge: OrderExtraCharge) => {
    setBusy(true);
    try {
      const { url } = await createCheckoutSession(
        order.idEst,
        "EXTRA",
        charge.sequence,
      );
      window.location.href = url;
    } catch (error) {
      toast.error(checkoutErrorText(locale, error));
      setBusy(false);
    }
  };

  const canCreate =
    isPrivileged &&
    ["Delivered", "Installation in progress", "Installed"].includes(
      order.status.name,
    );

  if (charges.length === 0 && !showForm) {
    if (!canCreate) return null;
    return (
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> {spanish ? "Agregar cargo adicional" : "Add extra charge"}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{spanish ? "Cargos adicionales" : "Extra charges"}</h2>
          <p className="text-sm text-muted-foreground">
            {spanish ? "Cada grupo de cargos se aprueba y se paga por separado. Una vez pagado, su importe es definitivo." : "Each group is approved and paid separately. Paid groups never change."}
          </p>
        </div>
        {canCreate && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> {spanish ? "Agregar cargo" : "Add charge"}
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {charges.map((charge) => {
          const cardBreakdown = getCardPaymentBreakdown({
            baseAmount: Number(charge.total),
            surchargeFraction: cardSurchargeFraction,
            payment: charge.payment,
          });

          return (
            <div key={charge.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <strong>{chargeLabel} #{charge.sequence}</strong>
                <Badge
                  variant={charge.status === "PAID" ? "default" : "secondary"}
                >
                  {(spanish && chargeStatusesEs[charge.status]) || titleCase(charge.status)}
                </Badge>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {charge.lines.map((line) => (
                  <div key={line.id} className="flex justify-between gap-3">
                    <span>
                      {line.description} · {Number(line.quantity)} ×{" "}
                      {formatMoney(Number(line.unitPrice))}
                      {line.taxable && (spanish ? " · sujeto a impuesto" : " · taxable")}
                    </span>
                    <span>{formatMoney(Number(line.subtotal))}</span>
                  </div>
                ))}
                {Number(charge.taxAmount) > 0 && (
                  <div className="flex justify-between border-t pt-2 text-muted-foreground">
                    <span>{spanish ? "Impuesto" : "Tax"}</span>
                    <span>{formatMoney(Number(charge.taxAmount))}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(Number(charge.total))}</span>
                </div>
                {charge.notes && (
                  <p className="text-muted-foreground">{charge.notes}</p>
                )}
              </div>

              {isOwner && charge.status === "PENDING_CUSTOMER_APPROVAL" && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  <Textarea
                    value={comments[charge.id] ?? ""}
                    onChange={(event) =>
                      setComments((current) => ({
                        ...current,
                        [charge.id]: event.target.value,
                      }))
                    }
                    placeholder={spanish ? "Comentario opcional" : "Optional comment"}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() => respond(charge, "REJECT")}
                    >
                      {spanish ? "Rechazar" : "Reject"}
                    </Button>
                    <Button
                      disabled={busy}
                      onClick={() => respond(charge, "APPROVE")}
                    >
                      {spanish ? "Aprobar" : "Approve"}
                    </Button>
                  </div>
                </div>
              )}

              {charge.status === "PAYMENT_DUE" && (canPay || canRecordManualPayment) && (
                <OrderPaymentSection
                  locale={locale}
                  target={paymentTarget}
                  title={`${chargeLabel} #${charge.sequence}`}
                  description={charge.lines.map((line) => line.description).join(" · ")}
                  amount={Number(charge.total)}
                >
                  {canPay &&
                    order.dealerModeSnapshot !== "INTERNAL" &&
                    charge.status === "PAYMENT_DUE" && (
                      <div className="mt-4 space-y-2">
                        <div className="ml-auto max-w-md rounded-lg border p-3 text-sm">
                          <div className="flex items-center justify-between gap-3 font-semibold">
                            <span>{paymentText(locale, "Payment total")}</span>
                            <span>{formatMoney(cardBreakdown.totalAmount)}</span>
                          </div>
                          <CardFeeBreakdown
                            locale={locale}
                            breakdown={cardBreakdown}
                            className="mt-2"
                          />
                        </div>
                        <Button
                          className="w-full"
                          disabled={busy}
                          onClick={() => pay(charge)}
                        >
                          <CreditCard className="mr-2 h-4 w-4" /> {spanish ? "Pagar cargo adicional" : "Pay extra charge"} ·{" "}
                          {formatMoney(cardBreakdown.totalAmount)}
                        </Button>
                      </div>
                    )}

                  {canPay &&
                    order.dealerModeSnapshot === "INTERNAL" &&
                    charge.status === "PAYMENT_DUE" && (
                      <div className="mt-4 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                        <p>{spanish ? "Envía el enlace de pago al cliente final." : "Send the payment link to the final customer."}</p>
                        <EstimatePaymentLinkActions
                          locale={locale}
                          estimateId={order.idEst}
                          estimateNumber={order.estimate.number}
                          showShare
                          size="sm"
                        />
                      </div>
                    )}

                  {canRecordManualPayment && charge.status === "PAYMENT_DUE" && (
                    <div className="mt-4 flex justify-end">
                      <ManualPaymentDialog
                        locale={locale}
                        estimateId={order.idEst}
                        type="EXTRA"
                        sequence={charge.sequence}
                        amount={Number(charge.total)}
                        label={spanish ? "Registrar pago del cargo adicional" : "Record extra charge payment"}
                        onRecorded={() => {
                          setCharges((current) =>
                            current.map((item) =>
                              item.id === charge.id
                                ? { ...item, status: "PAID" }
                                : item,
                            ),
                          );
                          router.refresh();
                        }}
                      />
                    </div>
                  )}
                </OrderPaymentSection>
              )}
            </div>
          );
        })}

        {showForm && (
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            {lines.map((line) => (
              <div
                key={line.id}
                className="grid gap-2 md:grid-cols-[1fr_100px_130px_auto_auto]"
              >
                <Input
                  value={line.description}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.id === line.id
                          ? { ...item, description: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder={spanish ? "Descripción" : "Description"}
                />
                <Input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={line.quantity}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.id === line.id
                          ? { ...item, quantity: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder={spanish ? "Cantidad" : "Qty"}
                />
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.id === line.id
                          ? { ...item, unitPrice: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder={spanish ? "Precio unitario" : "Unit price"}
                />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={line.taxable}
                    onCheckedChange={(checked) =>
                      setLines((current) =>
                        current.map((item) =>
                          item.id === line.id
                            ? { ...item, taxable: Boolean(checked) }
                            : item,
                        ),
                      )
                    }
                  />{" "}
                  {spanish ? "Sujeto a impuesto" : "Taxable"}
                </label>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={spanish ? "Quitar concepto" : "Remove line"}
                  disabled={lines.length === 1}
                  onClick={() =>
                    setLines((current) =>
                      current.filter((item) => item.id !== line.id),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLines((current) => [...current, emptyLine(nextLineId)]);
                setNextLineId((value) => value + 1);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> {spanish ? "Agregar concepto" : "Add line"}
            </Button>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={spanish ? "Notas opcionales" : "Optional notes"}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setShowForm(false)}
              >
                {spanish ? "Cancelar" : "Cancel"}
              </Button>
              <Button disabled={busy} onClick={createCharge}>
                {spanish ? "Enviar para aprobación" : "Send for approval"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
