"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Hammer, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type {
  InstallationJob,
  InstallationService,
  Order,
} from "@/lib/types";
import {
  cancelInstallation,
  decideInstallationQuoteAsCustomer,
  getEstimateInstallation,
  getInstallationServices,
  requestInstallation,
  respondInstallationAppointment,
} from "@/app/api/installations.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { installationStageLabel, paidBaseFor } from "@/lib/installation-flow";
import { EstimateRevisionSummary } from "./estimate-revision-summary";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";
import { AdditionalServiceFields } from "@/components/installations/additional-service-fields";
import {
  additionalServiceValidationError,
  additionalServiceValues,
  emptyAdditionalServiceDraft,
  type AdditionalServiceDraft,
} from "@/lib/installation-additional-service";

type RequestedRow = {
  id: number;
  serviceId: string;
  draft: AdditionalServiceDraft;
};
type EstimatePieceTarget = { id: number; mark: string; qty: number };

export function InstallationEstimatePanel({
  estimateId,
  estimateOwnerId,
  estimateStatus,
  order,
  pieces,
  initialJob,
  currentUserId,
  isPrivileged,
  refreshKey,
  beforeRequest,
  onJobChange,
}: {
  estimateId: number;
  estimateOwnerId: number;
  estimateStatus: string;
  order: Order | null;
  pieces: EstimatePieceTarget[];
  initialJob: InstallationJob | null;
  currentUserId: number;
  isPrivileged: boolean;
  refreshKey: string;
  beforeRequest?: () => Promise<boolean>;
  onJobChange?: (job: InstallationJob | null) => void;
}) {
  const [job, setJob] = useState<InstallationJob | null>(initialJob);
  const [services, setServices] = useState<InstallationService[]>([]);
  const [loading, setLoading] = useState(!initialJob);
  const [busy, setBusy] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [permitRequested, setPermitRequested] = useState(false);
  const [rows, setRows] = useState<RequestedRow[]>([]);
  const [nextRowId, setNextRowId] = useState(1);
  const [decisionComment, setDecisionComment] = useState("");
  const [appointmentResponseNote, setAppointmentResponseNote] = useState("");
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const commitJob = useCallback(
    (nextJob: InstallationJob | null) => {
      setJob(nextJob);
      onJobChange?.(nextJob);
    },
    [onJobChange],
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      getEstimateInstallation(estimateId),
      getInstallationServices(false),
    ])
      .then(([installation, catalog]) => {
        if (!active) return;
        commitJob(installation);
        setServices(catalog.filter((service) => service.availableForRequest));
      })
      .catch((error) => {
        if (active) toast.error((error as Error).message);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [commitJob, estimateId, refreshKey]);

  const addRow = () => {
    setRows((current) => [
      ...current,
      {
        id: nextRowId,
        serviceId: "",
        draft: emptyAdditionalServiceDraft(),
      },
    ]);
    setNextRowId((value) => value + 1);
  };

  const submitRequest = async () => {
    for (const row of rows) {
      const service =
        services.find((candidate) => candidate.id === Number(row.serviceId)) ??
        null;
      const error = additionalServiceValidationError(service, row.draft);
      if (error) {
        toast.error(error);
        return;
      }
    }

    if (beforeRequest && !(await beforeRequest())) return;

    setBusy(true);
    try {
      const created = await requestInstallation(estimateId, {
        permitRequested,
        selectedServices: rows.map((row) => {
          const service = services.find(
            (candidate) => candidate.id === Number(row.serviceId),
          )!;
          return {
            serviceId: service.id,
            ...additionalServiceValues(service, row.draft),
          };
        }),
      });
      commitJob(created);
      setShowRequest(false);
      toast.success("Preliminary installation price calculated.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeRequest = async () => {
    if (!job) return;
    setBusy(true);
    try {
      const result = await cancelInstallation(job.id);
      commitJob(result);
      toast.success("Installation removed. The estimate remains material only.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-red-200">
        <CardContent className="py-6 text-sm text-muted-foreground">
          Loading installation options…
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    const canRequest =
      estimateStatus === "Active" && !order && pieces.length > 0;
    if (!canRequest) return null;

    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5" /> Installation
          </CardTitle>
          <CardDescription>
            Calculate the installation price before deciding whether to add it
            to this estimate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showRequest ? (
            <Button type="button" onClick={() => setShowRequest(true)}>
              Request installation price
            </Button>
          ) : (
            <>
              <label className="flex items-start gap-3 rounded-lg border p-4 text-sm">
                <Checkbox
                  checked={permitRequested}
                  onCheckedChange={(checked) =>
                    setPermitRequested(Boolean(checked))
                  }
                />
                <span>
                  <strong className="block">Include our permit service</strong>
                  <span className="text-muted-foreground">
                    Permit Fee is paid after remeasurement approval. City Fee
                    is added later by company staff.
                  </span>
                </span>
              </label>

              <p className="rounded-lg bg-slate-50 p-3 text-sm text-muted-foreground">
                Installation for estimate pieces is calculated automatically.
                Add a service below only for separate work outside this
                estimate; its pricing inputs are entered manually.
              </p>

              {rows.map((row) => (
                <div
                  key={row.id}
                  className="space-y-3 rounded-lg bg-slate-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Select
                      value={row.serviceId}
                      onValueChange={(serviceId) =>
                        setRows((current) =>
                          current.map((item) =>
                            item.id === row.id
                              ? {
                                  ...item,
                                  serviceId,
                                  draft: emptyAdditionalServiceDraft(),
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Additional service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem
                            key={service.id}
                            value={String(service.id)}
                          >
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setRows((current) =>
                          current.filter((item) => item.id !== row.id),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <AdditionalServiceFields
                    service={
                      services.find(
                        (service) => service.id === Number(row.serviceId),
                      ) ?? null
                    }
                    value={row.draft}
                    onChange={(draft) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.id === row.id ? { ...item, draft } : item,
                        ),
                      )
                    }
                  />
                  <Textarea
                    value={row.draft.description}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.id === row.id
                            ? {
                                ...item,
                                draft: {
                                  ...item.draft,
                                  description: event.target.value,
                                },
                              }
                            : item,
                        ),
                      )
                    }
                    placeholder="Description or note (optional)"
                  />
                </div>
              ))}

              {services.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  <Plus className="mr-2 h-4 w-4" /> Add additional service
                </Button>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRequest(false)}
                >
                  Cancel
                </Button>
                <Button type="button" disabled={busy} onClick={submitRequest}>
                  {busy ? "Calculating…" : "Calculate installation"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const latest = job.quotes[0];
  const latestRevision = latest
    ? job.revisions?.find((revision) => revision.quoteId === latest.id)
    : job.revisions?.[0];
  const isOwner = currentUserId === estimateOwnerId;
  const depositPaid = paidBaseFor(job, "INSTALLATION_DEPOSIT");
  const proposedRemeasurement = job.appointments.find(
    (appointment) =>
      appointment.type === "REMEASUREMENT" &&
      appointment.status === "PROPOSED",
  );
  const acceptedRemeasurement = job.appointments.find(
    (appointment) =>
      appointment.type === "REMEASUREMENT" &&
      (appointment.status === "ACCEPTED" ||
        appointment.status === "COMPLETED"),
  );
  const canRemoveBeforeDeposit =
    isOwner &&
    job.status === "DEPOSIT_PAYMENT_PENDING" &&
    depositPaid === 0;

  const decide = async (decision: "APPROVED" | "REJECTED") => {
    setBusy(true);
    try {
      commitJob(
        await decideInstallationQuoteAsCustomer(
          job.id,
          decision,
          decisionComment.trim() || undefined,
        ),
      );
      setDecisionComment("");
      toast.success(
        decision === "APPROVED"
          ? "Estimate revision and installation quote approved."
          : "Estimate revision and installation quote rejected.",
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const respondToRemeasurement = async (
    response: "ACCEPT" | "REQUEST_RESCHEDULE",
  ) => {
    if (!proposedRemeasurement) return;
    setBusy(true);
    try {
      commitJob(
        await respondInstallationAppointment(
          proposedRemeasurement.id,
          response,
          appointmentResponseNote.trim() || undefined,
        ),
      );
      setAppointmentResponseNote("");
      toast.success(
        response === "ACCEPT"
          ? "Remeasurement date accepted."
          : "Remeasurement reschedule requested.",
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-red-200">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Hammer className="h-5 w-5" /> Installation
            </CardTitle>
            <CardDescription>{installationStageLabel(job)}</CardDescription>
          </div>
          <Badge>{installationStageLabel(job)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {latestRevision &&
          latestRevision.status !== "DRAFT" &&
          latestRevision.status !== "SUPERSEDED" && (
            <EstimateRevisionSummary
              revision={latestRevision}
              showFinancials={false}
            />
          )}

        {job.status === "CANCELED" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong className="block">Installation canceled</strong>
            {depositPaid > 0
              ? "The paid deposit remains non-refundable. This estimate can continue with material only."
              : "This estimate can continue with material only."}
            {job.cancellationReason && (
              <p className="mt-2">Reason: {job.cancellationReason}</p>
            )}
          </div>
        )}

        {canRemoveBeforeDeposit && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm text-slate-600">
              Installation has not been confirmed. You can still continue
              with material only before paying the deposit.
            </p>
            <Button
              type="button"
              className="w-full"
              variant="outline"
              disabled={busy}
              onClick={() => setRemoveDialogOpen(true)}
            >
              Remove installation and continue with material only
            </Button>
          </div>
        )}

        {isOwner && proposedRemeasurement && (
          <div className="space-y-3 rounded-lg border border-blue-200 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4" /> Proposed remeasurement date
            </div>
            <p className="text-sm">
              {new Date(proposedRemeasurement.startsAt).toLocaleString()}
              {proposedRemeasurement.endsAt
                ? ` – ${new Date(proposedRemeasurement.endsAt).toLocaleString()}`
                : ""}
            </p>
            {proposedRemeasurement.note && (
              <p className="text-sm text-muted-foreground">
                {proposedRemeasurement.note}
              </p>
            )}
            <Textarea
              value={appointmentResponseNote}
              onChange={(event) =>
                setAppointmentResponseNote(event.target.value)
              }
              placeholder="Optional response"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  respondToRemeasurement("REQUEST_RESCHEDULE")
                }
              >
                Request reschedule
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => respondToRemeasurement("ACCEPT")}
              >
                Accept schedule
              </Button>
            </div>
          </div>
        )}

        {acceptedRemeasurement && !proposedRemeasurement && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <strong className="block">Remeasurement date accepted</strong>
            {new Date(acceptedRemeasurement.startsAt).toLocaleString()}
          </div>
        )}

        {isOwner &&
          !order &&
          latest?.status === "PENDING_CUSTOMER_APPROVAL" && (
            <div className="space-y-3 rounded-lg border border-blue-200 p-4">
              <div>
                <strong className="text-sm">
                  {latest.approvalReason === "PERMIT_REVISION"
                    ? "Approve permit-required changes"
                    : "Approve remeasurement and installation"}
                </strong>
                <p className="text-xs text-muted-foreground">
                  Review the updated material and installation amounts in the
                  Estimate Summary below.
                </p>
              </div>
              <Textarea
                value={decisionComment}
                onChange={(event) => setDecisionComment(event.target.value)}
                placeholder="Optional comment"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => decide("REJECTED")}
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => decide("APPROVED")}
                >
                  Approve
                </Button>
              </div>
            </div>
          )}

        <div className="flex justify-end">
          {isPrivileged && (
            <Button asChild variant="outline">
              <Link href={`/installations/${job.id}`}>Open operations</Link>
            </Button>
          )}
        </div>
        <DeleteConfirmationDialog
          isOpen={removeDialogOpen}
          onClose={() => setRemoveDialogOpen(false)}
          onConfirm={removeRequest}
          title="Remove installation?"
          description="The installation request will be removed from this estimate. You can continue with material only and no deposit will be charged."
          confirmText="Remove installation"
        />
      </CardContent>
    </Card>
  );
}
