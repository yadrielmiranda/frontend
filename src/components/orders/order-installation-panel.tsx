"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, CreditCard } from "lucide-react";
import { toast } from "sonner";
import type { CompanyLocale } from "@/components/company/company-content";
import type { InstallationJob, OrderWithRelations } from "@/lib/types";
import { createCheckoutSession } from "@/app/api/payments.api";
import {
  decideInstallationQuoteAsCustomer,
  respondInstallationAppointment,
} from "@/app/api/installations.api";
import { InstallationQuoteSummary } from "@/components/estimates/installation-quote-summary";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/formatters";
import { ManualPaymentDialog } from "@/components/payments/manual-payment-dialog";
import { EstimatePaymentLinkActions } from "@/components/estimates/estimate-payment-link-actions";
import { paidInstallationCredit } from "@/lib/installation-flow";
import { customerChargeAdditions } from "@/lib/customer-charge-additions";
import { CardFeeBreakdown } from "@/components/payments/card-fee-breakdown";
import { getCardPaymentBreakdown } from "@/lib/card-payment";
import { estimateActionError } from "@/lib/estimate-action-language";
import { summaryText } from "@/lib/estimate-financial-language";
import { checkoutErrorText, paymentText } from "@/lib/estimate-payment-language";
import { OrderPaymentSection } from "./order-payment-section";

export function OrderInstallationPanel({
  paymentTarget,
  order,
  initialJob,
  isOwner,
  cardSurchargeFraction,
  canRecordManualPayment,
  locale = "en",
}: {
  paymentTarget: HTMLDivElement | null;
  order: OrderWithRelations;
  initialJob: InstallationJob;
  isOwner: boolean;
  cardSurchargeFraction: number;
  canRecordManualPayment: boolean;
  locale?: CompanyLocale;
}) {
  const spanish = locale === "es";
  const dateLocale = spanish ? "es-US" : "en-US";
  const canPay = order.estimate.dealerNetwork ? order.estimate.dealerNetwork.canPay : isOwner;
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [busy, setBusy] = useState(false);
  const [responseNote, setResponseNote] = useState("");
  const [decisionComment, setDecisionComment] = useState("");
  const latestQuote = job.quotes[0];
  const additions = customerChargeAdditions(job.customerChargesSummary ?? order.estimate.customerChargesSummary, order.dealerModeSnapshot === "INTERNAL");
  const installationBalance = Math.max(
    0,
    Number(job.manualDiscountSummary?.installation.total ?? latestQuote?.total ?? 0) + additions.installation + additions.custom - paidInstallationCredit(job),
  );
  const proposedAppointment = job.appointments.find(
    (appointment) =>
      appointment.type === "INSTALLATION" && appointment.status === "PROPOSED",
  );
  const activeInstallationCheckout = job.payments.find(
    (payment) =>
      payment.type === "INSTALLATION" &&
      payment.status === "PENDING" &&
      Boolean(payment.stripeSessionId),
  );
  const installationCardBreakdown = getCardPaymentBreakdown({
    baseAmount: installationBalance,
    surchargeFraction: cardSurchargeFraction,
    payment: activeInstallationCheckout,
  });

  const payInstallation = async () => {
    setBusy(true);
    try {
      const { url } = await createCheckoutSession(order.idEst, "INSTALLATION");
      window.location.href = url;
    } catch (error) {
      toast.error(checkoutErrorText(locale, error));
      setBusy(false);
    }
  };

  const respond = async (response: "ACCEPT" | "REQUEST_RESCHEDULE") => {
    if (!proposedAppointment) return;
    setBusy(true);
    try {
      const updated = await respondInstallationAppointment(
        proposedAppointment.id,
        response,
        responseNote.trim() || undefined,
      );
      setJob(updated);
      setResponseNote("");
      toast.success(
        response === "ACCEPT"
          ? (spanish ? "Fecha de instalación aceptada." : "Installation date accepted.")
          : (spanish ? "Se solicitó un cambio de fecha." : "Reschedule requested."),
      );
    } catch (error) {
      toast.error(estimateActionError(locale, error, spanish ? "No se pudo guardar la respuesta a la cita." : "Could not save the appointment response."));
    } finally {
      setBusy(false);
    }
  };

  const decideQuote = async (decision: "APPROVED" | "REJECTED") => {
    setBusy(true);
    try {
      setJob(
        await decideInstallationQuoteAsCustomer(
          job.id,
          decision,
          decisionComment.trim() || undefined,
        ),
      );
      setDecisionComment("");
      toast.success(
        decision === "APPROVED"
          ? (spanish ? "Cambio de instalación aprobado." : "Installation change approved.")
          : (spanish ? "Cambio de instalación rechazado." : "Installation change rejected."),
      );
    } catch (error) {
      toast.error(estimateActionError(locale, error, spanish ? "No se pudo guardar la respuesta a la cotización." : "Could not save the quote decision."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border bg-white">
      <h2 className="bg-slate-50 px-4 py-3 text-sm font-semibold">
        {summaryText(locale)("Installation & services")}
      </h2>

      <InstallationQuoteSummary job={job} locale={locale} />

      <div className="px-4 pb-4">
        <Button asChild variant="outline" size="sm">
          <Link href={`/installations/${job.id}`}>{spanish ? "Ver instalación" : "View installation"}</Link>
        </Button>
      </div>

      {isOwner && latestQuote?.status === "PENDING_CUSTOMER_APPROVAL" && (
        <div className="mx-4 mb-4 space-y-3 rounded-lg border border-blue-200 p-4">
          <div>
            <strong className="text-sm">
              {latestQuote.approvalReason === "FIELD_CHANGE"
                ? (spanish ? "Aprobar cambio de instalación" : "Approve installation change")
                : (spanish ? "Aprobar la cotización de instalación actualizada" : "Approve updated installation quote")}
            </strong>
            <p className="text-xs text-muted-foreground">
              {spanish ? "Las aprobaciones y los pagos posteriores a la creación de la orden se registran aquí."
                : "This order remains the financial record for every post-order approval and payment."}
            </p>
          </div>
          <Textarea
            value={decisionComment}
            onChange={(event) => setDecisionComment(event.target.value)}
            placeholder={spanish ? "Comentario opcional" : "Optional comment"}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => decideQuote("REJECTED")}
            >
              {spanish ? "Rechazar" : "Reject"}
            </Button>
            <Button disabled={busy} onClick={() => decideQuote("APPROVED")}>
              {spanish ? "Aprobar" : "Approve"}
            </Button>
          </div>
        </div>
      )}

      {!job.paymentSchedule && job.status === "INSTALLATION_PAYMENT_PENDING" &&
        (canPay || (canRecordManualPayment && installationBalance > 0)) && (
          <OrderPaymentSection
            target={paymentTarget}
            locale={locale}
            title={paymentText(locale, "Installation balance")}
            amount={installationBalance}
          >
            {canPay &&
              order.dealerModeSnapshot !== "INTERNAL" &&
              !job.paymentSchedule && job.status === "INSTALLATION_PAYMENT_PENDING" && (
                <div className="mt-4 space-y-2">
                  <div className="ml-auto max-w-md rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3 font-semibold">
                      <span>{paymentText(locale, "Payment total")}</span>
                      <span>
                        {formatMoney(installationCardBreakdown.totalAmount)}
                      </span>
                    </div>
                    <CardFeeBreakdown
                      locale={locale}
                      breakdown={installationCardBreakdown}
                      className="mt-2"
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={busy}
                    onClick={payInstallation}
                  >
                    <CreditCard className="mr-2 h-4 w-4" /> {spanish ? "Pagar saldo de instalación" : "Pay installation balance"} ·{" "}
                    {formatMoney(installationCardBreakdown.totalAmount)}
                  </Button>
                </div>
              )}

            {canPay &&
              order.dealerModeSnapshot === "INTERNAL" &&
              !job.paymentSchedule && job.status === "INSTALLATION_PAYMENT_PENDING" && (
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

            {canRecordManualPayment &&
              !job.paymentSchedule && job.status === "INSTALLATION_PAYMENT_PENDING" &&
              installationBalance > 0 && (
                <div className="mt-4 flex justify-end">
                  <ManualPaymentDialog
                    locale={locale}
                    estimateId={order.idEst}
                    type="INSTALLATION"
                    amount={installationBalance}
                    label={spanish ? "Registrar pago de instalación" : "Record installation payment"}
                    onRecorded={() => router.refresh()}
                  />
                </div>
              )}
          </OrderPaymentSection>
        )}

      {isOwner && proposedAppointment && (
        <div className="mx-4 mb-4 space-y-3 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4" /> {spanish ? "Fecha propuesta para la instalación" : "Proposed installation date"}
          </div>
          <p className="text-sm">
            {new Date(proposedAppointment.startsAt).toLocaleString(dateLocale)}
            {proposedAppointment.endsAt
              ? ` - ${new Date(proposedAppointment.endsAt).toLocaleString(dateLocale)}`
              : ""}
          </p>
          {proposedAppointment.note && (
            <p className="text-sm text-muted-foreground">
              {proposedAppointment.note}
            </p>
          )}
          <Textarea
            value={responseNote}
            onChange={(event) => setResponseNote(event.target.value)}
            placeholder={spanish ? "Respuesta opcional" : "Optional response"}
          />
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            <Button
              variant="outline"
              className="border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 hover:text-red-800 focus-visible:border-red-400 focus-visible:ring-red-200"
              disabled={busy}
              onClick={() => respond("REQUEST_RESCHEDULE")}
            >
              {spanish ? "Solicitar otra fecha" : "Request reschedule"}
            </Button>
            <Button
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 focus-visible:border-emerald-400 focus-visible:ring-emerald-200"
              disabled={busy}
              onClick={() => respond("ACCEPT")}
            >
              {spanish ? "Aceptar fecha" : "Accept schedule"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
