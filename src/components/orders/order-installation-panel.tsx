"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/formatters";
import {
  installationStageLabel,
  paidInstallationCredit,
  paymentTypeLabel,
} from "@/lib/installation-flow";

export function OrderInstallationPanel({
  order,
  initialJob,
  isOwner,
  isPrivileged,
}: {
  order: OrderWithRelations;
  initialJob: InstallationJob;
  isOwner: boolean;
  isPrivileged: boolean;
}) {
  const [job, setJob] = useState(initialJob);
  const [busy, setBusy] = useState(false);
  const [responseNote, setResponseNote] = useState("");
  const [decisionComment, setDecisionComment] = useState("");
  const latestQuote = job.quotes[0];
  const installationBalance = Math.max(
    0,
    Number(latestQuote?.total ?? 0) - paidInstallationCredit(job),
  );
  const proposedAppointment = job.appointments.find(
    (appointment) =>
      appointment.type === "INSTALLATION" &&
      appointment.status === "PROPOSED",
  );

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
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Installation</h2>
          <p className="text-sm text-muted-foreground">
            {installationStageLabel(job)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{installationStageLabel(job)}</Badge>
          {isPrivileged && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/installations/${job.id}`}>Open operations</Link>
            </Button>
          )}
        </div>
      </div>

      <InstallationQuoteSummary job={job} />

      {isOwner && latestQuote?.status === "PENDING_CUSTOMER_APPROVAL" && (
        <div className="mt-4 space-y-3 rounded-lg border border-blue-200 p-4">
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

      <div className="mt-6 space-y-2 border-t pt-4">
        <h3 className="text-sm font-semibold">Payment history</h3>
        {job.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          job.payments.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
            >
              <span>
                {paymentTypeLabel(payment.type)}
                {payment.type === "EXTRA" ? ` #${payment.sequence}` : ""}
              </span>
              <span className="text-muted-foreground">
                {formatMoney(Number(payment.baseAmount))}
              </span>
              <Badge
                variant={payment.status === "PAID" ? "default" : "secondary"}
              >
                {payment.status}
              </Badge>
            </div>
          ))
        )}
      </div>

      {isOwner && job.status === "INSTALLATION_PAYMENT_PENDING" && (
        <Button
          className="mt-4 w-full"
          disabled={busy}
          onClick={payInstallation}
        >
          <CreditCard className="mr-2 h-4 w-4" /> Pay installation balance ·{" "}
          {formatMoney(installationBalance)}
        </Button>
      )}

      {isOwner && proposedAppointment && (
        <div className="mt-4 space-y-3 rounded-lg border border-blue-200 p-4">
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
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => respond("REQUEST_RESCHEDULE")}
            >
              Request reschedule
            </Button>
            <Button disabled={busy} onClick={() => respond("ACCEPT")}>
              Accept schedule
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
