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
import type { CompanyLocale } from "@/components/company/company-content";
import { estimateActionError } from "@/lib/estimate-action-language";
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
import { AddressConfirmationPanel } from "@/components/address-confirmation-panel";
import { addressText, useAddressConfirmation, withoutLocation } from "@/lib/use-address-confirmation";
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
  locale = "en",
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
  isAdmin = false,
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
  locale?: CompanyLocale;
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
  isAdmin?: boolean;
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
  const spanish = locale === "es";
  const activeLocale = useRef(locale);
  activeLocale.current = locale;
  const [address, setAddress] = useState<InstallationAddress>(suggestedAddress);
  const [addressChoice, setAddressChoice] = useState<"suggested" | "different" | null>(null);
  const addressRevision = useRef(0);
  const requestInFlight = useRef(false);
  const mounted = useRef(true);
  // Material-total refreshes do not change which address the user is confirming.
  const requestContext = JSON.stringify([estimateId, suggestedAddress.street, suggestedAddress.addressLine2, suggestedAddress.city, suggestedAddress.state, suggestedAddress.postalCode, estimateStatus, order?.id, networkPaymentBlocked]);
  const latestContext = useRef(requestContext);
  latestContext.current = requestContext;
  const completeAddress = (value: InstallationAddress) =>
    (["street", "city", "state", "postalCode"] as const).every(key => value[key].trim());
  const beginAddress = (value: InstallationAddress) => {
    clearAddressSuggestion();
    const state = value.state.trim().toUpperCase();
    const complete = completeAddress(value);
    setAddress(!complete && state && state !== "FL"
      ? { street: "", city: "", state: "FL", postalCode: "" }
      : { ...value, state: state || "FL" });
    setAddressChoice(complete ? null : "different");
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

  const confirmation = useAddressConfirmation({ purpose: "INSTALLATION", address, contextKey: requestContext,
    onAddressChange: next => {
      setAddress(next);
      if (addressText(next) !== addressText(address)) setAddressChoice("different");
    }, disabled: busy || networkPaymentBlocked });
  const invalidateConfirmation = confirmation.invalidate;
  const clearAddressSuggestion = useCallback(() => {
    addressRevision.current++;
    invalidateConfirmation();
  }, [invalidateConfirmation]);
  const editingAddress = () => {
    clearAddressSuggestion();
    setAddress(current => withoutLocation(current));
    setAddressChoice("different");
  };

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
    mounted.current = true;
    const lifetime = addressRevision;
    return () => {
      mounted.current = false;
      lifetime.current++;
    };
  }, []);


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
    (isOwner || isAdmin || canAssist) &&
    !order &&
    estimateStatus === "Active" &&
    job?.status !== "CANCELED" &&
    canEditInstallationBeforePayment(job, estimatePayments);
  const canRemoveBeforePayment = canEditBeforePayment && (isOwner || isAdmin);
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
        if (active) toast.error(estimateActionError(activeLocale.current, error, activeLocale.current === "es"
          ? "No se pudieron cargar las opciones de instalación." : "Could not load installation options."));
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

  const submitRequest = async () => {
    if (requestInFlight.current || busy || networkPaymentBlocked || !canConfigureRequest) return;
    const requestAddress = address;
    const requestAddressConfirmed = confirmation.isConfirmed;
    if (!requestAddressConfirmed || !completeAddress(requestAddress)) {
      toast.error(spanish ? "Confirma la dirección completa de instalación." : "Confirm a complete installation address.");
      return;
    }
    if (requestAddress.state !== "FL") {
      toast.error(spanish ? "La instalación solo está disponible en Florida." : "Installation is available only in Florida.");
      return;
    }
    if (requestAddress.street.trim().length > 150 || requestAddress.city.trim().length > 100) {
      toast.error(spanish ? "Escribe un máximo de 150 caracteres para la calle y 100 para la ciudad." : "Use no more than 150 characters for the street and 100 for the city.");
      return;
    }
    if ((requestAddress.addressLine2 ?? "").trim().length > 150) {
      toast.error(spanish ? "Los detalles de la dirección admiten hasta 150 caracteres." : "Address details must be 150 characters or fewer.");
      return;
    }
    if (!/^\d{5}(?:-\d{4})?$/.test(requestAddress.postalCode.trim())) {
      toast.error(spanish ? "Escribe un código postal válido de 5 dígitos o en formato ZIP+4." : "Enter a valid 5-digit ZIP code or ZIP+4.");
      return;
    }
    if (permitRequested === null) {
      toast.error(spanish ? "Elige quién se encargará de tramitar el permiso." : "Select a permit management option.");
      return;
    }

    for (const row of rows) {
      const service =
        services.find((candidate) => candidate.id === Number(row.serviceId)) ??
        null;
      const error = additionalServiceValidationError(service, row.draft, locale);
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
          ? (spanish ? "Se actualizó la instalación y se recalculó su precio." : "Installation updated and recalculated.")
          : (spanish ? "Se calculó el precio preliminar de la instalación." : "Preliminary installation price calculated."),
      );
    } catch (error) {
      if (!isCurrent()) return;
      if (!confirmation.handleFinalError(error)) {
        toast.error(estimateActionError(locale, error, spanish ? "No se pudo calcular el precio de instalación." : "Could not calculate the installation price."));
      }
    } finally {
      requestInFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const removeRequest = async () => {
    if (!job || busy || !canRemoveBeforePayment) return;
    setBusy(true);
    try {
      const result = await cancelInstallation(job.id);
      commitJob(result);
      toast.success(
        spanish ? "Se quitó la instalación. La cotización incluye solo materiales." : "Installation removed. The estimate remains material only.",
      );
    } catch (error) {
      toast.error(estimateActionError(locale, error, spanish ? "No se pudo quitar la instalación." : "Could not remove the installation."));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-red-200">
        <CardContent className="py-6 text-sm text-muted-foreground">
          {spanish ? "Cargando las opciones de instalación…" : "Loading installation options…"}
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
            <Hammer className="h-5 w-5" /> {spanish ? "Instalación" : "Installation"}
          </CardTitle>
          <CardDescription>
            {job
              ? (spanish ? "Actualiza los datos de instalación y vuelve a calcular el precio preliminar." : "Update the installation details and recalculate the preliminary price.")
              : (spanish ? "Calcula el precio de la instalación antes de decidir si la agregas a esta cotización." : "Calculate the installation price before deciding whether to add it to this estimate.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showRequest ? (
            <Button type="button" onClick={beginNewRequest} disabled={networkPaymentBlocked}>
              {spanish ? "Solicitar precio de instalación" : "Request installation price"}
            </Button>
          ) : (
            <>
              <fieldset disabled={busy} className="space-y-3 rounded-xl border border-red-200 p-4">
                <legend className="px-1 font-semibold">{spanish ? "Dirección de instalación" : "Installation address"}</legend>
                <AddressConfirmationPanel confirmation={confirmation} address={address} purpose="installation" locale={locale}
                  disabled={busy || networkPaymentBlocked || confirmation.checking} onEdit={editingAddress} />
                {addressChoice !== "different" ? (
                  <>
                    <p className="text-sm">{addressText(address)}</p>
                    <p className="text-sm font-medium">{spanish ? "¿Es esta la dirección de instalación?" : "Is this the installation address?"}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant={addressChoice === "suggested" ? "default" : "outline"} disabled={address.state !== "FL" || confirmation.checking || networkPaymentBlocked} onClick={() => { setAddressChoice("suggested"); void confirmation.review(); }}>{spanish ? "Usar esta dirección" : "Use this address"}</Button>
                      <Button type="button" variant="outline" onClick={() => { clearAddressSuggestion(); setAddress({ street: "", city: "", state: "FL", postalCode: "" }); setAddressChoice("different");  }}>{spanish ? "Usar otra dirección" : "Use a different address"}</Button>
                    </div>
                    {address.state !== "FL" && <p className="text-sm text-amber-800">{spanish ? "Solo ofrecemos instalación en Florida. Escribe una dirección de instalación en Florida." : "Installation is available only in Florida. Enter a Florida installation address."}</p>}
                  </>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {([
                        ["street", spanish ? "Calle y número" : "Street address"],
                        ["addressLine2", spanish ? "Apartamento, suite o unidad (opcional)" : "Apartment, suite, unit, etc. (optional)"],
                        ["city", spanish ? "Ciudad" : "City"],
                        ["state", spanish ? "Estado" : "State"],
                        ["postalCode", spanish ? "Código postal" : "ZIP code"],
                      ] as const).map(([key, label]) => (
                        <div key={key} className={key === "street" || key === "addressLine2" ? "sm:col-span-2" : ""}>
                          <Label htmlFor={`installation-${key}`}>{label}</Label>
                          {key === "state" ? (
                            <Select value={address.state} disabled={busy} onValueChange={state => { clearAddressSuggestion(); setAddress(current => ({ ...withoutLocation(current), state }));  }}>
                              <SelectTrigger id="installation-state" className="w-full"><SelectValue placeholder={spanish ? "Selecciona el estado" : "Select state"} /></SelectTrigger>
                              <SelectContent><SelectItem value="FL">Florida (FL)</SelectItem></SelectContent>
                            </Select>
                          ) : key === "street" ? (
                            <AddressAutocomplete
                              id="installation-street"
                              locale={locale}
                              value={address.street}
                              maxLength={150}
                              disabled={busy}
                              contextKey={JSON.stringify([address.city, address.state, address.postalCode])}
                              onChange={event => {
                                clearAddressSuggestion();
                                setAddress(current => ({ ...withoutLocation(current), street: event.target.value }));
                              }}
                              onAddressSelect={selected => {
                                clearAddressSuggestion();
                                if (selected.state !== "FL") {
                                  toast.error(spanish ? "Solo ofrecemos instalación en Florida. Selecciona una dirección en Florida." : "Installation is available only in Florida. Choose a Florida address.");
                                  return;
                                }
                                setAddress(current => ({ ...withoutLocation(current), ...selected }));
                              }}
                            />
                          ) : (
                            <Input id={`installation-${key}`} value={address[key] ?? ""} disabled={busy} autoComplete={key === "addressLine2" ? "address-line2" : undefined} placeholder={key === "addressLine2" ? (spanish ? "Ej. Apto. 4B, suite 200, edificio C" : "e.g. Apt 4B, Suite 200, Building C") : undefined} maxLength={key === "postalCode" ? 10 : key === "city" ? 100 : 150} onChange={event => { clearAddressSuggestion(); setAddress(current => ({ ...withoutLocation(current), [key]: event.target.value }));  }} />
                          )}
                        </div>
                      ))}
                    </div>
                    <Button type="button" disabled={busy || networkPaymentBlocked || confirmation.checking} onClick={() => void confirmation.review()}>{spanish ? "Usar esta dirección" : "Use this address"}</Button>
                  </>
                )}
                <p className="text-xs text-muted-foreground">{spanish ? "Verificaremos la disponibilidad y el precio de la instalación para esta dirección." : "Availability and pricing will be verified for this address."}</p>
              </fieldset>
              <fieldset disabled={busy} className="space-y-3">
                <legend className="font-semibold">{spanish ? "Gestión del permiso" : "Permit coordination"}</legend>
                <p className="text-sm text-muted-foreground">
                  {spanish
                    ? "Elige quién gestionará el permiso de instalación. Debes seleccionar una opción."
                    : "Select the permit management option for this installation. One option is required."}
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
                  aria-label={spanish ? "Responsable de gestionar el permiso" : "Permit coordination responsibility"}
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
                          {spanish ? "Usar mi propio gestor de permisos" : "Use my own permit management service"}
                        </strong>
                        <span className="mt-1 block leading-6 text-muted-foreground">
                          {spanish
                            ? "Mi gestor independiente se encargará de solicitar el permiso, responder a los comentarios de la revisión de planos, tramitar las aprobaciones, gestionar las tasas y programar las inspecciones."
                            : "I will use an independent coordinator to manage the permit application, plan-review responses, required approvals, fees, and inspection scheduling."}
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
                            {spanish ? `Usar el servicio de gestión de permisos de ${companyName}` : `Use the permit management service provided by ${companyName}`}
                          </strong>
                          <span className="mt-1 block leading-6 text-muted-foreground">
                            {spanish
                              ? `El equipo de ${companyName} se encargará de solicitar el permiso, responder a los comentarios de la revisión de planos, tramitar las aprobaciones y programar las inspecciones.`
                              : `The ${companyName} team will manage the permit application, plan-review responses, required approvals, and inspection scheduling.`}
                          </span>
                        </span>
                      </span>

                      <span className="grid gap-2 text-xs font-medium text-slate-700 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          spanish ? "Solicitud del permiso" : "Permit application",
                          spanish ? "Coordinación de la revisión de planos" : "Plan-review coordination",
                          spanish ? "Presentación de documentos ante los organismos correspondientes" : "Agency submissions",
                          spanish ? "Programación de inspecciones" : "Inspection scheduling",
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
                        {spanish
                          ? "La tarifa del permiso se paga después de aprobar las medidas verificadas. El personal de la empresa agregará la tarifa municipal más adelante."
                          : "Permit Fee is paid after remeasurement approval. City Fee is added later by company staff."}
                      </span>
                    </span>
                  </label>
                </RadioGroup>
              </fieldset>

              <p className="rounded-lg bg-slate-50 p-3 text-sm text-muted-foreground">
                {spanish
                  ? "El precio de instalación de las piezas de esta cotización se calcula automáticamente. Si necesitas trabajos adicionales, selecciónalos e ingresa los datos para calcular su precio."
                  : "Installation for estimate pieces is calculated automatically. Select any additional work needed outside this estimate; its pricing inputs are entered manually."}
              </p>

              <fieldset disabled={busy} className="space-y-3">
                <legend className="font-semibold">
                  {spanish ? "Servicios adicionales (opcionales)" : "Additional services (optional)"}
                </legend>
                <p className="text-sm text-muted-foreground">
                  {spanish ? "Selecciona los servicios adicionales que necesites para esta instalación." : "Select all additional services needed for this installation."}
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
                                      locale={locale}
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
                                          {spanish ? "Nota (opcional)" : "Note (optional)"}
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
                                          placeholder={spanish ? "Agrega una nota" : "Add a note"}
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
                    {spanish ? "Por el momento no hay servicios adicionales disponibles." : "No additional services are currently available."}
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
                  {spanish ? "Cancelar" : "Cancel"}
                </Button>
                <Button type="button" disabled={busy || networkPaymentBlocked || !confirmation.isConfirmed || confirmation.checking} onClick={() => void submitRequest()}>
                  {busy
                    ? job
                      ? (spanish ? "Guardando…" : "Saving…")
                      : (spanish ? "Calculando…" : "Calculating…")
                    : job
                      ? (spanish ? "Guardar cambios de instalación" : "Save installation changes")
                      : (spanish ? "Calcular instalación" : "Calculate installation")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const latest = job.quotes[0];
  const stageLabel = installationStageLabel(job, locale);
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
          ? (spanish ? "Se aprobaron la revisión de la cotización y el precio de instalación." : "Estimate revision and installation quote approved.")
          : (spanish ? "Se rechazaron la revisión de la cotización y el precio de instalación." : "Estimate revision and installation quote rejected."),
      );
    } catch (error) {
      toast.error(
        decisionSaved
          ? (spanish ? "Se aprobaron los cambios. Recarga esta página para ver la cotización actualizada." : "The changes were approved, but the estimate could not be refreshed. Reload this page.")
          : estimateActionError(locale, error, spanish ? "No se pudo guardar tu decisión sobre la cotización." : "Could not save your quote decision."),
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
          ? (spanish ? "Se aceptó la fecha de la nueva medición." : "Remeasurement date accepted.")
          : (spanish ? "Se solicitó otra fecha para la nueva medición." : "Remeasurement reschedule requested."),
      );
    } catch (error) {
      toast.error(estimateActionError(locale, error, spanish ? "No se pudo guardar tu respuesta a la cita." : "Could not save your appointment response."));
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
              <Hammer className="h-5 w-5" /> {spanish ? "Instalación" : "Installation"}
            </CardTitle>
            <CardDescription>{stageLabel}</CardDescription>
          </div>
          <Badge>{stageLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {canEditBeforePayment && (isOwner || canAssist) && job.estimate.user.role?.name === "dealer" &&
          job.estimate.user.dealerMode === "INTERNAL" && !job.dealerMeasurementsAcceptedAt && (
          <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              {spanish
                ? "Si las medidas actuales son definitivas, puedes continuar sin depósito, sin otra visita de medición y sin aprobaciones adicionales de la cotización. El importe total de la instalación sigue pendiente de pago."
                : "If the current measurements are final, continue without a deposit, remeasurement visit or quote approvals. The full installation amount remains due."}
            </p>
            <Button type="button" disabled={busy} className="h-auto whitespace-normal"
              onClick={async () => {
                setBusy(true);
                try {
                  if (beforeRequest && !(await beforeRequest())) return;
                  commitJob(await acceptDealerMeasurements(job.id));
                  toast.success(spanish ? "Se eximió el depósito y se conservaron las medidas y el precio actuales." : "Deposit waived. Current measurements and price retained.");
                } catch (error) {
                  toast.error(estimateActionError(locale, error, spanish ? "No se pudieron aceptar las medidas." : "Could not accept the measurements."));
                } finally {
                  setBusy(false);
                }
              }}>
              {spanish ? "Aceptar las medidas y eximir el depósito" : "Accept measurements and waive deposit"}
            </Button>
          </div>
        )}
        {job.dealerMeasurementsAcceptedAt && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <strong className="block">{spanish ? "Medidas del distribuidor aceptadas" : "Dealer measurements accepted"}</strong>
            {spanish ? "Ya no se requiere un depósito de instalación ni otra visita de medición." : "No installation deposit or remeasurement visit is required."}
          </div>
        )}
        {latestRevision &&
          latestRevision.status !== "DRAFT" &&
          latestRevision.status !== "SUPERSEDED" && (
            <EstimateRevisionDialog
              locale={locale}
              revision={latestRevision}
              job={job}
            />
          )}

        {job.status === "CANCELED" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong className="block">{spanish ? "Instalación cancelada" : "Installation canceled"}</strong>
            {depositPaid > 0
              ? (spanish ? "El depósito pagado no es reembolsable. Puedes continuar la cotización solo con materiales." : "The paid deposit remains non-refundable. This estimate can continue with material only.")
              : (spanish ? "Puedes continuar la cotización solo con materiales." : "This estimate can continue with material only.")}
            {job.cancellationReason && (
              <p className="mt-2">{spanish ? "Motivo:" : "Reason:"} {job.cancellationReason}</p>
            )}
          </div>
        )}

        {canEditBeforePayment && job.status === "DEPOSIT_PAYMENT_PENDING" && !job.installationAddressConfirmedAt && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {spanish ? "Edita la solicitud de instalación y confirma la dirección para continuar." : "Edit the installation request and confirm its address before continuing."}
          </p>
        )}
        {canEditBeforePayment && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm text-slate-600">
              {spanish ? "Antes de pagar, puedes editar la solicitud de instalación o quitarla y continuar solo con materiales." : "Before starting payment, you can edit the installation request or remove it and continue with material only."}
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
                {spanish ? "Editar instalación" : "Edit installation"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 hover:text-red-800"
                disabled={busy || !canRemoveBeforePayment}
                onClick={() => setRemoveDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                {spanish ? "Quitar la instalación y continuar solo con materiales" : "Remove installation and continue with material only"}
              </Button>
            </div>
          </div>
        )}

        {isOwner && proposedRemeasurement && (
          <div className="space-y-3 rounded-lg border border-blue-200 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4" /> {spanish ? "Fecha propuesta para la nueva medición" : "Proposed remeasurement date"}
            </div>
            <p className="text-sm">
              {new Date(proposedRemeasurement.startsAt).toLocaleString(locale)}
              {proposedRemeasurement.endsAt
                ? ` - ${new Date(proposedRemeasurement.endsAt).toLocaleString(locale)}`
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
              placeholder={spanish ? "Respuesta opcional" : "Optional response"}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 hover:text-red-800 focus-visible:border-red-400 focus-visible:ring-red-200"
                disabled={busy}
                onClick={() => respondToRemeasurement("REQUEST_RESCHEDULE")}
              >
                {spanish ? "Solicitar otra fecha" : "Request reschedule"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 focus-visible:border-emerald-400 focus-visible:ring-emerald-200"
                disabled={busy}
                onClick={() => respondToRemeasurement("ACCEPT")}
              >
                {spanish ? "Aceptar fecha y hora" : "Accept schedule"}
              </Button>
            </div>
          </div>
        )}

        {job.installationAddress && <div className="rounded-lg border p-3 text-sm"><strong>{spanish ? "Dirección de instalación" : "Installation address"}</strong><p>{addressText(job.installationAddress)}</p></div>}
        {acceptedRemeasurement && !proposedRemeasurement && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <strong className="block">{spanish ? "Fecha de la nueva medición aceptada" : "Remeasurement date accepted"}</strong>
            {new Date(acceptedRemeasurement.startsAt).toLocaleString(locale)}
          </div>
        )}

        {isOwner &&
          !order &&
          latest?.status === "PENDING_CUSTOMER_APPROVAL" && (
            <div className="space-y-3 rounded-lg border border-blue-200 p-4">
              <div>
                <strong className="text-sm">
                  {latest.approvalReason === "PERMIT_REVISION"
                    ? (spanish ? "Aprobar los cambios requeridos por el permiso" : "Approve permit-required changes")
                    : (spanish ? "Aprobar las nuevas medidas y la instalación" : "Approve remeasurement and installation")}
                </strong>
                <p className="text-xs text-muted-foreground">
                  {latestRevision
                    ? (spanish ? "Antes de aprobar, selecciona «Ver cambios» para comparar las medidas y los precios originales con los revisados." : "Use View changes above to compare the original and revised measurements and prices before approving.")
                    : (spanish ? "Revisa los importes actualizados de materiales e instalación en el resumen de la cotización que aparece más abajo." : "Review the updated material and installation amounts in the Estimate Summary below.")}
                </p>
              </div>
              <Textarea
                value={decisionComment}
                onChange={(event) => setDecisionComment(event.target.value)}
                placeholder={spanish ? "Comentario opcional" : "Optional comment"}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => decide("REJECTED")}
                >
                  {spanish ? "Rechazar" : "Reject"}
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => decide("APPROVED")}
                >
                  {spanish ? "Aprobar" : "Approve"}
                </Button>
              </div>
            </div>
          )}

        <div className="flex justify-end">
          {isPrivileged && (
            <Button asChild variant="outline">
              <Link href={`/installations/${job.id}`}>{spanish ? "Abrir operaciones" : "Open operations"}</Link>
            </Button>
          )}
        </div>
        <DeleteConfirmationDialog
          isOpen={removeDialogOpen}
          onClose={() => setRemoveDialogOpen(false)}
          onConfirm={removeRequest}
          lang={locale}
          title={spanish ? "¿Quitar la instalación?" : "Remove installation?"}
          description={spanish
            ? "Se quitará la solicitud de instalación de esta cotización. Podrás continuar solo con materiales y no se cobrará el depósito."
            : "The installation request will be removed from this estimate. You can continue with material only and no deposit will be charged."}
          cancelText={spanish ? "Cancelar" : "Cancel"}
          confirmText={spanish ? "Quitar instalación" : "Remove installation"}
        />
      </CardContent>
    </Card>
  );
}
