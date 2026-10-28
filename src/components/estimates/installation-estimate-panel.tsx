"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  InstallationAddress,
  InstallationQuoteLine,
  InstallationService,
  Order,
} from "@/lib/types";
import {
  acceptDealerMeasurements,
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
import { Input } from "@/components/ui/input";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { canEditInstallationBeforePayment, hasStartedInstallationPayment, installationStageLabel, paidBaseFor } from "@/lib/installation-flow";
import { EstimateRevisionDialog } from "./estimate-revision-dialog";
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

type AddressSuggestion = {
  entered: InstallationAddress;
  suggested: InstallationAddress;
  context: string;
  revision: number;
};

const addressText = (value: InstallationAddress) =>
  [value.street, value.city, value.state, value.postalCode].join(", ");

const sameAddress = (left: InstallationAddress, right: InstallationAddress) =>
  (["street", "city", "state", "postalCode"] as const).every(
    key => left[key].trim().toUpperCase() === right[key].trim().toUpperCase(),
  );

function suggestedInstallationAddress(error: unknown): InstallationAddress | null {
  if (!error || typeof error !== "object" || !("status" in error) || error.status !== 400 || !("data" in error)) return null;
  const data = error.data;
  if (!data || typeof data !== "object" || !("code" in data) || data.code !== "INSTALLATION_ADDRESS_CONFIRMATION_REQUIRED" || !("suggestedAddress" in data)) return null;
  const value = data.suggestedAddress;
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const keys = ["street", "city", "state", "postalCode"] as const;
  if (keys.some(key => typeof source[key] !== "string" || !source[key].trim())) return null;
  const address = Object.fromEntries(keys.map(key => [key, (source[key] as string).trim()])) as InstallationAddress;
  if (address.street.length > 150 || address.city.length > 100 || address.state !== "FL" || !/^\d{5}(?:-\d{4})?$/.test(address.postalCode)) return null;
  return address;
}

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
  suggestedAddress,
  estimateStatus,
  order,
  estimatePayments,
  pieces,
  initialJob,
  currentUserId,
  isPrivileged,
  canAssist = false,
  networkPaymentBlocked = false,
  allowAdditionalServiceNotes,
  companyName,
  refreshKey,
  beforeRequest,
  onJobChange,
  onQuoteApproved,
  onRequestEditingChange,
}: {
  estimateId: number;
  estimateOwnerId: number;
  suggestedAddress: InstallationAddress;
  estimateStatus: string;
  order: Order | null;
  estimatePayments: EstimatePayment[];
  pieces: EstimatePieceTarget[];
  initialJob: InstallationJob | null;
  currentUserId: number;
  isPrivileged: boolean;
  canAssist?: boolean;
  networkPaymentBlocked?: boolean;
  allowAdditionalServiceNotes: boolean;
  companyName: string;
  refreshKey: string;
  beforeRequest?: () => Promise<boolean>;
  onJobChange?: (job: InstallationJob | null) => void;
  onQuoteApproved?: () => Promise<void>;
  onRequestEditingChange?: (isEditing: boolean) => void;
}) {
  const [address, setAddress] = useState<InstallationAddress>(suggestedAddress);
  const [addressChoice, setAddressChoice] = useState<"suggested" | "different" | null>(null);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [addressSuggestion, setAddressSuggestion] = useState<AddressSuggestion | null>(null);
  const addressRevision = useRef(0);
  const requestInFlight = useRef(false);
  const mounted = useRef(true);
  const suggestionPanel = useRef<HTMLDivElement>(null);
  // Material-total refreshes do not change which address the user is confirming.
  const requestContext = JSON.stringify([estimateId, suggestedAddress.street, suggestedAddress.city, suggestedAddress.state, suggestedAddress.postalCode, estimateStatus, order?.id, networkPaymentBlocked]);
  const latestContext = useRef(requestContext);
  latestContext.current = requestContext;
  const clearAddressSuggestion = useCallback(() => {
    addressRevision.current++;
    setAddressSuggestion(null);
  }, []);
  const completeAddress = (value: InstallationAddress) => Object.values(value).every(part => part.trim());
  const beginAddress = (value: InstallationAddress) => {
    clearAddressSuggestion();
    const state = value.state.trim().toUpperCase();
    const complete = completeAddress(value);
    setAddress(!complete && state && state !== "FL"
      ? { street: "", city: "", state: "FL", postalCode: "" }
      : { ...value, state: state || "FL" });
    setAddressChoice(complete ? null : "different");
    setAddressConfirmed(false);
  };
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
      if (!isEditing) clearAddressSuggestion();
      setShowRequest(isEditing);
      onRequestEditingChange?.(isEditing);
    },
    [clearAddressSuggestion, onRequestEditingChange],
  );

  useEffect(() => {
    setAddressSuggestion(null);
  }, [requestContext]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      addressRevision.current++;
    };
  }, []);

  useEffect(() => {
    if (addressSuggestion) {
      suggestionPanel.current?.focus();
      suggestionPanel.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [addressSuggestion]);

  const checkoutStarted = hasStartedInstallationPayment(estimatePayments);
  const canRequest =
    !job &&
    estimateStatus === "Active" &&
    !order &&
    pieces.length > 0 &&
    !checkoutStarted;
  const isOwner = currentUserId === estimateOwnerId;
  const depositPaid = job ? paidBaseFor(job, "INSTALLATION_DEPOSIT") : 0;
  const canEditBeforePayment =
    Boolean(job) &&
    (isOwner || canAssist) &&
    !order &&
    estimateStatus === "Active" &&
    job?.status !== "CANCELED" &&
    canEditInstallationBeforePayment(job, estimatePayments);
  const canConfigureRequest = canRequest || canEditBeforePayment;

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
        return current.filter((row) => row.serviceId !== requestedServiceId);
      }

      if (current.some((row) => row.serviceId === requestedServiceId)) {
        return current;
      }

      const nextId =
        current.reduce((highestId, row) => Math.max(highestId, row.id), 0) + 1;
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
    beginAddress(suggestedAddress);
    setPermitRequested(null);
    setRows([]);
    setRequestEditing(true);
  };

  const beginEditRequest = () => {
    if (!job || !canEditBeforePayment) return;
    beginAddress(job.installationAddress ?? suggestedAddress);
    const selectedLines = (job.quotes[0]?.lines ?? []).filter(
      (line) => line.isRequestedService ?? line.origin === "USER_SELECTED",
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

  const submitRequest = async (acceptedAddress?: InstallationAddress) => {
    if (requestInFlight.current || busy || networkPaymentBlocked || !canConfigureRequest) return;
    const requestAddress = acceptedAddress ?? address;
    const requestAddressConfirmed = Boolean(acceptedAddress) || addressConfirmed;
    if (!requestAddressConfirmed || !completeAddress(requestAddress)) {
      toast.error("Confirm a complete installation address.");
      return;
    }
    if (requestAddress.state !== "FL") {
      toast.error("Installation is available only in Florida.");
      return;
    }
    if (requestAddress.street.trim().length > 150 || requestAddress.city.trim().length > 100) {
      toast.error("Use no more than 150 characters for the street and 100 for the city.");
      return;
    }
    if (!/^\d{5}(?:-\d{4})?$/.test(requestAddress.postalCode.trim())) {
      toast.error("Enter a valid 5-digit ZIP code or ZIP+4.");
      return;
    }
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

    requestInFlight.current = true;
    const revision = addressRevision.current;
    const context = requestContext;
    const isCurrent = () => mounted.current && revision === addressRevision.current && context === latestContext.current;
    setBusy(true);
    try {
      if (beforeRequest && !(await beforeRequest())) return;
      if (!isCurrent()) return;
      const payload = {
        installationAddress: requestAddress,
        installationAddressConfirmed: requestAddressConfirmed,
        permitRequested,
        selectedServices: rows.map((row) => {
          const service = services.find(
            (candidate) => candidate.id === Number(row.serviceId),
          )!;
          const draft = allowAdditionalServiceNotes
            ? row.draft
            : { ...row.draft, description: "" };
          return {
            serviceId: service.id,
            ...additionalServiceValues(service, draft),
          };
        }),
      };
      const updatedJob = job
        ? await updateInstallationRequest(job.id, payload)
        : await requestInstallation(estimateId, payload);
      if (!isCurrent()) return;
      commitJob(updatedJob);
      setRequestEditing(false);
      toast.success(
        job
          ? "Installation updated and recalculated."
          : "Preliminary installation price calculated.",
      );
    } catch (error) {
      if (!isCurrent()) return;
      const suggested = suggestedInstallationAddress(error);
      if (suggested && !sameAddress(requestAddress, suggested)) {
        setAddressSuggestion({ entered: { ...requestAddress }, suggested, context, revision });
      } else {
        toast.error((error as Error).message);
      }
    } finally {
      requestInFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const acceptAddressSuggestion = async () => {
    if (!addressSuggestion || busy || requestInFlight.current || networkPaymentBlocked) return;
    if (addressSuggestion.context !== latestContext.current || addressSuggestion.revision !== addressRevision.current || !sameAddress(address, addressSuggestion.entered)) {
      clearAddressSuggestion();
      return;
    }
    const suggested = addressSuggestion.suggested;
    clearAddressSuggestion();
    setAddress(suggested);
    setAddressChoice("different");
    setAddressConfirmed(true);
    await submitRequest(suggested);
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

  if (!job || (showRequest && canEditBeforePayment)) {
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
            <Button type="button" onClick={beginNewRequest} disabled={networkPaymentBlocked}>
              Request installation price
            </Button>
          ) : (
            <>
              <fieldset disabled={busy} className="space-y-3 rounded-xl border border-red-200 p-4">
                <legend className="px-1 font-semibold">Installation address</legend>
                {addressSuggestion ? (
                  <div ref={suggestionPanel} tabIndex={-1} role="region" aria-labelledby="installation-address-suggestion-title" aria-live="polite" className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/60 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                    <div>
                      <h3 id="installation-address-suggestion-title" className="font-semibold">Google suggests this installation address</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Review the corrected address before continuing with the installation calculation.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-md border border-slate-200 bg-white p-3">
                        <p className="text-xs font-medium text-muted-foreground">Address you entered</p>
                        <p className="mt-1 text-sm">{addressText(addressSuggestion.entered)}</p>
                      </div>
                      <div className="rounded-md border border-blue-300 bg-white p-3">
                        <p className="text-xs font-medium text-blue-800">Suggested by Google</p>
                        <p className="mt-1 text-sm font-medium">{addressText(addressSuggestion.suggested)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" className="h-auto min-h-9 whitespace-normal" disabled={busy || networkPaymentBlocked} onClick={() => void acceptAddressSuggestion()}>Use suggested address and calculate</Button>
                      <Button type="button" variant="outline" disabled={busy} onClick={() => { clearAddressSuggestion(); setAddressChoice("different"); setAddressConfirmed(false); }}>Edit my address</Button>
                    </div>
                  </div>
                ) : addressChoice !== "different" ? (
                  <>
                    <p className="text-sm">{[address.street, address.city, address.state, address.postalCode].join(", ")}</p>
                    <p className="text-sm font-medium">Is this the installation address?</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant={addressChoice === "suggested" ? "default" : "outline"} disabled={address.state !== "FL"} onClick={() => { clearAddressSuggestion(); setAddressChoice("suggested"); setAddressConfirmed(true); }}>Use this address</Button>
                      <Button type="button" variant="outline" onClick={() => { clearAddressSuggestion(); setAddress({ street: "", city: "", state: "FL", postalCode: "" }); setAddressChoice("different"); setAddressConfirmed(false); }}>Use a different address</Button>
                    </div>
                    {address.state !== "FL" && <p className="text-sm text-amber-800">Installation is available only in Florida. Enter a Florida installation address.</p>}
                    {addressConfirmed && <p className="text-sm text-emerald-700">Installation address selected.</p>}
                  </>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {([['street', 'Street address'], ['city', 'City'], ['state', 'State'], ['postalCode', 'ZIP code']] as const).map(([key, label]) => (
                        <div key={key} className={key === "street" ? "sm:col-span-2" : ""}>
                          <Label htmlFor={`installation-${key}`}>{label}</Label>
                          {key === "state" ? (
                            <Select value={address.state} disabled={busy} onValueChange={state => { clearAddressSuggestion(); setAddress(current => ({ ...current, state })); setAddressConfirmed(false); }}>
                              <SelectTrigger id="installation-state" className="w-full"><SelectValue placeholder="Select state" /></SelectTrigger>
                              <SelectContent><SelectItem value="FL">Florida (FL)</SelectItem></SelectContent>
                            </Select>
                          ) : key === "street" ? (
                            <AddressAutocomplete
                              id="installation-street"
                              value={address.street}
                              maxLength={150}
                              disabled={busy}
                              contextKey={JSON.stringify([address.city, address.state, address.postalCode])}
                              onChange={event => {
                                clearAddressSuggestion();
                                setAddress(current => ({ ...current, street: event.target.value }));
                                setAddressConfirmed(false);
                              }}
                              onAddressSelect={selected => {
                                clearAddressSuggestion();
                                setAddressConfirmed(false);
                                if (selected.state !== "FL") {
                                  toast.error("Installation is available only in Florida. Choose a Florida address.");
                                  return;
                                }
                                setAddress(selected);
                              }}
                            />
                          ) : (
                            <Input id={`installation-${key}`} value={address[key]} maxLength={key === "postalCode" ? 10 : key === "city" ? 100 : 150} onChange={event => { clearAddressSuggestion(); setAddress(current => ({ ...current, [key]: event.target.value })); setAddressConfirmed(false); }} />
                          )}
                        </div>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={addressConfirmed} onCheckedChange={value => { clearAddressSuggestion(); setAddressConfirmed(value === true); }} />This is the installation address.</label>
                  </>
                )}
                <p className="text-xs text-muted-foreground">Availability and pricing will be verified for this address.</p>
              </fieldset>
              <fieldset disabled={busy} className="space-y-3">
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
                            Use the permit management service provided by{" "}
                            {companyName}
                          </strong>
                          <span className="mt-1 block leading-6 text-muted-foreground">
                            The {companyName} team will manage the permit
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

              <fieldset disabled={busy} className="space-y-3">
                <legend className="font-semibold">
                  Additional services (optional)
                </legend>
                <p className="text-sm text-muted-foreground">
                  Select all additional services needed for this installation.
                </p>

                {services.length > 0 ? (
                  <div className="space-y-2">
                    {services.map((service) => {
                      const serviceRows = rows.filter(
                        (row) => row.serviceId === String(service.id),
                      );
                      const isSelected = serviceRows.length > 0;
                      const checkboxId = `additional-service-${service.id}`;

                      return (
                        <div
                          key={service.id}
                          className={`rounded-xl border p-3 transition-colors ${
                            isSelected
                              ? "border-blue-400 bg-blue-50/50 ring-1 ring-blue-100"
                              : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/20"
                          }`}
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                            <label
                              htmlFor={checkboxId}
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 lg:min-h-9"
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
                              />
                              <span className="min-w-0 flex-1">
                                <strong className="block text-sm text-slate-950 sm:text-base">
                                  {service.name}
                                </strong>
                                {service.description && (
                                  <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                                    {service.description}
                                  </span>
                                )}
                              </span>
                            </label>

                            {isSelected && (
                              <div className="flex min-w-0 flex-wrap items-end gap-3 lg:justify-end">
                                {serviceRows.map((row, index) => (
                                  <div
                                    key={row.id}
                                    className="flex min-w-0 flex-wrap items-end gap-3"
                                  >
                                    {serviceRows.length > 1 && (
                                      <span className="self-center text-xs font-medium text-slate-600">
                                        #{index + 1}
                                      </span>
                                    )}
                                    <AdditionalServiceFields
                                      service={service}
                                      value={row.draft}
                                      compact
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
                                    {allowAdditionalServiceNotes && (
                                      <div className="min-w-52 flex-1 space-y-1 lg:w-64 lg:flex-none">
                                        <Label
                                          htmlFor={`additional-service-note-${row.id}`}
                                          className="text-xs"
                                        >
                                          Note (optional)
                                        </Label>
                                        <Input
                                          id={`additional-service-note-${row.id}`}
                                          value={row.draft.description}
                                          maxLength={500}
                                          className="h-9"
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
                                          placeholder="Add a note"
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
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
                <Button type="button" disabled={busy || networkPaymentBlocked || Boolean(addressSuggestion)} onClick={() => void submitRequest()}>
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
  const canRemoveBeforePayment = canEditBeforePayment;

  const decide = async (decision: "APPROVED" | "REJECTED") => {
    setBusy(true);
    let decisionSaved = false;
    try {
      commitJob(
        await decideInstallationQuoteAsCustomer(
          job.id,
          decision,
          decisionComment.trim() || undefined,
        ),
      );
      decisionSaved = true;
      setDecisionComment("");
      if (decision === "APPROVED") await onQuoteApproved?.();
      toast.success(
        decision === "APPROVED"
          ? "Estimate revision and installation quote approved."
          : "Estimate revision and installation quote rejected.",
      );
    } catch (error) {
      toast.error(
        decisionSaved
          ? "The changes were approved, but the estimate could not be refreshed. Reload this page."
          : (error as Error).message,
      );
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
        {canEditBeforePayment && job.estimate.user.role?.name === "dealer" &&
          job.estimate.user.dealerMode === "INTERNAL" && !job.dealerMeasurementsAcceptedAt && (
          <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              If the current measurements are final, continue without a deposit,
              remeasurement visit or quote approvals. The full installation amount remains due.
            </p>
            <Button type="button" disabled={busy} className="h-auto whitespace-normal"
              onClick={async () => {
                setBusy(true);
                try {
                  if (beforeRequest && !(await beforeRequest())) return;
                  commitJob(await acceptDealerMeasurements(job.id));
                  toast.success("Deposit waived. Current measurements and price retained.");
                } catch (error) {
                  toast.error((error as Error).message);
                } finally {
                  setBusy(false);
                }
              }}>
              Accept measurements and waive deposit
            </Button>
          </div>
        )}
        {job.dealerMeasurementsAcceptedAt && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <strong className="block">Dealer measurements accepted</strong>
            No installation deposit or remeasurement visit is required.
          </div>
        )}
        {latestRevision &&
          latestRevision.status !== "DRAFT" &&
          latestRevision.status !== "SUPERSEDED" && (
            <EstimateRevisionDialog
              revision={latestRevision}
              job={job}
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

        {canEditBeforePayment && job.status === "DEPOSIT_PAYMENT_PENDING" && !job.installationAddressConfirmedAt && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Edit the installation request and confirm its address before continuing.</p>}
        {canRemoveBeforePayment && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm text-slate-600">
              Before starting payment, you can edit the installation request
              or remove it and continue with material only.
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
                disabled={busy || !isOwner}
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
                className="border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 hover:text-red-800 focus-visible:border-red-400 focus-visible:ring-red-200"
                disabled={busy}
                onClick={() => respondToRemeasurement("REQUEST_RESCHEDULE")}
              >
                Request reschedule
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 focus-visible:border-emerald-400 focus-visible:ring-emerald-200"
                disabled={busy}
                onClick={() => respondToRemeasurement("ACCEPT")}
              >
                Accept schedule
              </Button>
            </div>
          </div>
        )}

        {job.installationAddress && <div className="rounded-lg border p-3 text-sm"><strong>Installation address</strong><p>{[job.installationAddress.street, job.installationAddress.city, job.installationAddress.state, job.installationAddress.postalCode].join(", ")}</p></div>}
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
                  {latestRevision
                    ? "Use View changes above to compare the original and revised measurements and prices before approving."
                    : "Review the updated material and installation amounts in the Estimate Summary below."}
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
