"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Hammer,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import type {
  EstimatePayment,
  InstallationJob,
  InstallationQuoteLine,
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
  updateInstallationRequest,
} from "@/app/api/installations.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

const draftText = (value: string | number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

function additionalServiceDraftFromLine(
  line: InstallationQuoteLine,
): AdditionalServiceDraft {
  return {
    widthIn: draftText(line.widthIn),
    heightIn: draftText(line.heightIn),
    areaSqFt: draftText(line.areaSqFt),
    panelCount: draftText(line.panelCount),
    lengthIn: draftText(line.lengthIn),
    occurrences: String(line.occurrences || 1),
    description: line.description ?? "",
  };
}

export function InstallationEstimatePanel({
  estimateId,
  estimateOwnerId,
  estimateStatus,
  order,
  estimatePayments,
  pieces,
  initialJob,
  currentUserId,
  isPrivileged,
  refreshKey,
  beforeRequest,
  onJobChange,
  onRequestEditingChange,
}: {
  estimateId: number;
  estimateOwnerId: number;
  estimateStatus: string;
  order: Order | null;
  estimatePayments: EstimatePayment[];
  pieces: EstimatePieceTarget[];
  initialJob: InstallationJob | null;
  currentUserId: number;
  isPrivileged: boolean;
  refreshKey: string;
  beforeRequest?: () => Promise<boolean>;
  onJobChange?: (job: InstallationJob | null) => void;
  onRequestEditingChange?: (isEditing: boolean) => void;
}) {
  const [job, setJob] = useState<InstallationJob | null>(initialJob);
  const [services, setServices] = useState<InstallationService[]>([]);
  const [loading, setLoading] = useState(!initialJob);
  const [busy, setBusy] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [permitRequested, setPermitRequested] = useState<boolean | null>(null);
  const [rows, setRows] = useState<RequestedRow[]>([]);
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

  const setRequestEditing = useCallback(
    (isEditing: boolean) => {
      setShowRequest(isEditing);
      onRequestEditingChange?.(isEditing);
    },
    [onRequestEditingChange],
  );

  const checkoutStarted = estimatePayments.some(
    (payment) => payment.status === "PAID" || Boolean(payment.stripeSessionId),
  );
  const canRequest =
    !job &&
    estimateStatus === "Active" &&
    !order &&
    pieces.length > 0 &&
    !checkoutStarted;
  const isOwner = currentUserId === estimateOwnerId;
  const depositPaid = job ? paidBaseFor(job, "INSTALLATION_DEPOSIT") : 0;
  const canEditBeforeDeposit =
    Boolean(job) &&
    isOwner &&
    !order &&
    job?.status === "DEPOSIT_PAYMENT_PENDING" &&
    depositPaid === 0;
  const canConfigureRequest = canRequest || canEditBeforeDeposit;

  useEffect(() => {
    if (showRequest && !canConfigureRequest) {
      setRequestEditing(false);
    }
  }, [canConfigureRequest, setRequestEditing, showRequest]);

  useEffect(
    () => () => {
      onRequestEditingChange?.(false);
    },
    [onRequestEditingChange],
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

  const setAdditionalServiceSelected = (
    serviceId: number,
    selected: boolean,
  ) => {
    const requestedServiceId = String(serviceId);
    setRows((current) => {
      if (!selected) {
        return current.filter(
          (row) => row.serviceId !== requestedServiceId,
        );
      }

      if (current.some((row) => row.serviceId === requestedServiceId)) {
        return current;
      }

      const nextId = current.reduce(
        (highestId, row) => Math.max(highestId, row.id),
        0,
      ) + 1;
      return [
        ...current,
        {
          id: nextId,
          serviceId: requestedServiceId,
          draft: emptyAdditionalServiceDraft(),
        },
      ];
    });
  };

  const beginNewRequest = () => {
    setPermitRequested(null);
    setRows([]);
    setRequestEditing(true);
  };

  const beginEditRequest = () => {
    if (!job || !canEditBeforeDeposit) return;
    const selectedLines = (job.quotes[0]?.lines ?? []).filter(
      (line) => line.origin === "USER_SELECTED",
    );
    setPermitRequested(Boolean(job.permit));
    setRows(
      selectedLines.map((line, index) => ({
        id: index + 1,
        serviceId: String(line.serviceId),
        draft: additionalServiceDraftFromLine(line),
      })),
    );
    setRequestEditing(true);
  };

  const submitRequest = async () => {
    if (permitRequested === null) {
      toast.error("Select a permit management option.");
      return;
    }

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
      const payload = {
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
      };
      const updatedJob = job
        ? await updateInstallationRequest(job.id, payload)
        : await requestInstallation(estimateId, payload);
      commitJob(updatedJob);
      setRequestEditing(false);
      toast.success(
        job
          ? "Installation updated and recalculated."
          : "Preliminary installation price calculated.",
      );
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
      toast.success(
        "Installation removed. The estimate remains material only.",
      );
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

  if (!job || (showRequest && canEditBeforeDeposit)) {
    if (!job && !canRequest) return null;

    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5" /> Installation
          </CardTitle>
          <CardDescription>
            {job
              ? "Update the installation details and recalculate the preliminary price."
              : "Calculate the installation price before deciding whether to add it to this estimate."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showRequest ? (
            <Button type="button" onClick={beginNewRequest}>
              Request installation price
            </Button>
          ) : (
            <>
              <fieldset className="space-y-3">
                <legend className="font-semibold">Permit coordination</legend>
                <p className="text-sm text-muted-foreground">
                  Select the permit management option for this installation. One
                  option is required.
                </p>

                <RadioGroup
                  value={
                    permitRequested === null
                      ? undefined
                      : permitRequested
                        ? "COMPANY"
                        : "INDEPENDENT"
                  }
                  onValueChange={(value) =>
                    setPermitRequested(value === "COMPANY")
                  }
                  aria-label="Permit coordination responsibility"
                  className="gap-3"
                >
                  <label
                    htmlFor="permit-independent-provider"
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors sm:p-5 ${
                      permitRequested === false
                        ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-200"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"
                    }`}
                  >
                    <RadioGroupItem
                      id="permit-independent-provider"
                      value="INDEPENDENT"
                      className="mt-1 border-slate-400 text-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <span className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                        <UserRound className="h-5 w-5" />
                      </span>
                      <span>
                        <strong className="block text-base text-slate-950">
                          Use my own permit management service
                        </strong>
                        <span className="mt-1 block leading-6 text-muted-foreground">
                          I will use an independent coordinator to manage the
                          permit application, plan-review responses, required
                          approvals, fees, and inspection scheduling.
                        </span>
                      </span>
                    </span>
                  </label>

                  <label
                    htmlFor="permit-installation-provider"
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors sm:p-5 ${
                      permitRequested === true
                        ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-200"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"
                    }`}
                  >
                    <RadioGroupItem
                      id="permit-installation-provider"
                      value="COMPANY"
                      className="mt-1 border-slate-400 text-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-3">
                      <span className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                          <Building2 className="h-5 w-5" />
                        </span>
                        <span>
                          <strong className="block text-base text-slate-950">
                            Use Authentic Evolution&apos;s permit management
                            service
                          </strong>
                          <span className="mt-1 block leading-6 text-muted-foreground">
                            The Authentic Evolution team will manage the permit
                            application, plan-review responses, required
                            approvals, and inspection scheduling.
                          </span>
                        </span>
                      </span>

                      <span className="grid gap-2 text-xs font-medium text-slate-700 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          "Permit application",
                          "Plan-review coordination",
                          "Agency submissions",
                          "Inspection scheduling",
                        ].map((item) => (
                          <span
                            key={item}
                            className="flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            {item}
                          </span>
                        ))}
                      </span>

                      <span className="rounded-lg bg-white/80 px-3 py-2 leading-5 text-slate-600">
                        Permit Fee is paid after remeasurement approval. City
                        Fee is added later by company staff.
                      </span>
                    </span>
                  </label>
                </RadioGroup>
              </fieldset>

              <p className="rounded-lg bg-slate-50 p-3 text-sm text-muted-foreground">
                Installation for estimate pieces is calculated automatically.
                Select any additional work needed outside this estimate; its
                pricing inputs are entered manually.
              </p>

              <fieldset className="space-y-3">
                <legend className="font-semibold">
                  Additional services (optional)
                </legend>
                <p className="text-sm text-muted-foreground">
                  Select all additional services needed for this installation.
                </p>

                {services.length > 0 ? (
                  <div className="space-y-3">
                    {services.map((service) => {
                      const serviceRows = rows.filter(
                        (row) => row.serviceId === String(service.id),
                      );
                      const isSelected = serviceRows.length > 0;
                      const checkboxId = `additional-service-${service.id}`;

                      return (
                        <div
                          key={service.id}
                          className={`overflow-hidden rounded-xl border transition-colors ${
                            isSelected
                              ? "border-blue-400 bg-blue-50/50 ring-1 ring-blue-100"
                              : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/20"
                          }`}
                        >
                          <label
                            htmlFor={checkboxId}
                            className="flex cursor-pointer items-start gap-3 p-4 sm:p-5"
                          >
                            <Checkbox
                              id={checkboxId}
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                setAdditionalServiceSelected(
                                  service.id,
                                  checked === true,
                                )
                              }
                              className="mt-0.5"
                            />
                            <span className="min-w-0 flex-1">
                              <strong className="block text-sm text-slate-950 sm:text-base">
                                {service.name}
                              </strong>
                              {service.description && (
                                <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                                  {service.description}
                                </span>
                              )}
                            </span>
                          </label>

                          {isSelected && (
                            <div className="space-y-4 border-t border-blue-200 bg-white/80 p-4 sm:p-5">
                              {serviceRows.map((row, index) => (
                                <div key={row.id} className="space-y-3">
                                  {serviceRows.length > 1 && (
                                    <p className="text-sm font-medium text-slate-700">
                                      Service details {index + 1}
                                    </p>
                                  )}
                                  <AdditionalServiceFields
                                    service={service}
                                    value={row.draft}
                                    onChange={(draft) =>
                                      setRows((current) =>
                                        current.map((item) =>
                                          item.id === row.id
                                            ? { ...item, draft }
                                            : item,
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
                                                  description:
                                                    event.target.value,
                                                },
                                              }
                                            : item,
                                        ),
                                      )
                                    }
                                    placeholder="Description or note (optional)"
                                    aria-label={`${service.name} description or note`}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-muted-foreground">
                    No additional services are currently available.
                  </p>
                )}
              </fieldset>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setRequestEditing(false)}
                >
                  Cancel
                </Button>
                <Button type="button" disabled={busy} onClick={submitRequest}>
                  {busy
                    ? job
                      ? "Saving…"
                      : "Calculating…"
                    : job
                      ? "Save installation changes"
                      : "Calculate installation"}
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
  const proposedRemeasurement = job.appointments.find(
    (appointment) =>
      appointment.type === "REMEASUREMENT" && appointment.status === "PROPOSED",
  );
  const acceptedRemeasurement = job.appointments.find(
    (appointment) =>
      appointment.type === "REMEASUREMENT" &&
      (appointment.status === "ACCEPTED" || appointment.status === "COMPLETED"),
  );
  const canRemoveBeforeDeposit = canEditBeforeDeposit;

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
              Before paying the installation deposit, you can update the request
              or continue with material only.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800"
                disabled={busy}
                onClick={beginEditRequest}
              >
                <Pencil className="h-4 w-4" />
                Edit installation
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 hover:text-red-800"
                disabled={busy}
                onClick={() => setRemoveDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Remove installation and continue with material only
              </Button>
            </div>
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
                onClick={() => respondToRemeasurement("REQUEST_RESCHEDULE")}
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
