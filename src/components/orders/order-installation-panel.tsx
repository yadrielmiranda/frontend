"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, CreditCard } from "lucide-react";
import { toast } from "sonner";
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
import { CardFeeBreakdown } from "@/components/payments/card-fee-breakdown";
import { getCardPaymentBreakdown } from "@/lib/card-payment";
import { OrderPaymentSection } from "./order-payment-section";

export function OrderInstallationPanel({
  paymentTarget,
  order,
  initialJob,
  isOwner,
  cardSurchargeFraction,
  canRecordManualPayment,
}: {
  paymentTarget: HTMLDivElement | null;
  order: OrderWithRelations;
  initialJob: InstallationJob;
  isOwner: boolean;
  cardSurchargeFraction: number;
  canRecordManualPayment: boolean;
}) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [busy, setBusy] = useState(false);
  const [responseNote, setResponseNote] = useState("");
  const [decisionComment, setDecisionComment] = useState("");
  const latestQuote = job.quotes[0];
  const installationBalance = Math.max(
    0,
    Number(job.manualDiscountSummary?.installation.total ?? latestQuote?.total ?? 0) - paidInstallationCredit(job),
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
      toast.error((error as Error).message);
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
          ? "Installation date accepted."
          : "Reschedule requested.",
      );
    } catch (error) {
      toast.error((error as Error).message);
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
          ? "Installation change approved."
          : "Installation change rejected.",
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border bg-white">
      <h2 className="bg-slate-50 px-4 py-3 text-sm font-semibold">
        Installation &amp; services
      </h2>

      <InstallationQuoteSummary job={job} />

      <div className="px-4 pb-4">
        <Button asChild variant="outline" size="sm">
          <Link href={`/installations/${job.id}`}>View installation</Link>
        </Button>
      </div>

      {isOwner && latestQuote?.status === "PENDING_CUSTOMER_APPROVAL" && (
        <div className="mx-4 mb-4 space-y-3 rounded-lg border border-blue-200 p-4">
          <div>
            <strong className="text-sm">
              {latestQuote.approvalReason === "FIELD_CHANGE"
                ? "Approve installation change"
                : "Approve updated installation quote"}
            </strong>
            <p className="text-xs text-muted-foreground">
              This order remains the financial record for every post-order
              approval and payment.
            </p>
          </div>
          <Textarea
            value={decisionComment}
            onChange={(event) => setDecisionComment(event.target.value)}
            placeholder="Optional comment"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => decideQuote("REJECTED")}
            >
              Reject
            </Button>
            <Button disabled={busy} onClick={() => decideQuote("APPROVED")}>
              Approve
            </Button>
          </div>
        </div>
      )}

      {!job.paymentSchedule && job.status === "INSTALLATION_PAYMENT_PENDING" &&
        (isOwner || (canRecordManualPayment && installationBalance > 0)) && (
          <OrderPaymentSection
            target={paymentTarget}
            title="Installation balance"
            amount={installationBalance}
          >
            {isOwner &&
              order.dealerModeSnapshot !== "INTERNAL" &&
              !job.paymentSchedule && job.status === "INSTALLATION_PAYMENT_PENDING" && (
                <div className="mt-4 space-y-2">
                  <div className="ml-auto max-w-md rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3 font-semibold">
                      <span>Payment total</span>
                      <span>
                        {formatMoney(installationCardBreakdown.totalAmount)}
                      </span>
                    </div>
                    <CardFeeBreakdown
                      breakdown={installationCardBreakdown}
                      className="mt-2"
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={busy}
                    onClick={payInstallation}
                  >
                    <CreditCard className="mr-2 h-4 w-4" /> Pay installation balance ·{" "}
                    {formatMoney(installationCardBreakdown.totalAmount)}
                  </Button>
                </div>
              )}

            {isOwner &&
              order.dealerModeSnapshot === "INTERNAL" &&
              !job.paymentSchedule && job.status === "INSTALLATION_PAYMENT_PENDING" && (
                <div className="mt-4 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  <p>Send the payment link to the final customer.</p>
                  <EstimatePaymentLinkActions
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
                    estimateId={order.idEst}
                    type="INSTALLATION"
                    amount={installationBalance}
                    label="Record installation payment"
                    onRecorded={() => router.refresh()}
                  />
                </div>
              )}
          </OrderPaymentSection>
        )}

      {isOwner && proposedAppointment && (
        <div className="mx-4 mb-4 space-y-3 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4" /> Proposed installation date
          </div>
          <p className="text-sm">
            {new Date(proposedAppointment.startsAt).toLocaleString()}
            {proposedAppointment.endsAt
              ? ` – ${new Date(proposedAppointment.endsAt).toLocaleString()}`
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
            placeholder="Optional response"
          />
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            <Button
              variant="outline"
              className="border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 hover:text-red-800 focus-visible:border-red-400 focus-visible:ring-red-200"
              disabled={busy}
              onClick={() => respond("REQUEST_RESCHEDULE")}
            >
              Request reschedule
            </Button>
            <Button
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 focus-visible:border-emerald-400 focus-visible:ring-emerald-200"
              disabled={busy}
              onClick={() => respond("ACCEPT")}
            >
              Accept schedule
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
