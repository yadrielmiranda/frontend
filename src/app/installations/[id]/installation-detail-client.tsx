"use client";

import { MaterialRevisionAccess } from "@/components/estimates/material-revisions/material-revision-access";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePortalLanguage } from "@/contexts/PortalLanguageContext";
import { installationActionError } from "@/lib/installation-action-language";
import { pieceFormText } from "@/lib/piece-form-language";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  Plus,
  RefreshCw,
  Replace,
  Trash2,
  XCircle,
} from "lucide-react";
import type {
  Coating,
  CreatePieceData,
  Crystal,
  EstimateRevisionChangeReason,
  EstimateRevisionItem,
  FrameColor,
  InstallationJob,
  InstallationAppointmentStatus,
  InstallationMeasurement,
  InstallationPermitStatus,
  InstallationService,
  MuntinPattern,
  MuntinType,
  PieceWithRelations,
  ProductWithBrands,
  Privacy,
  SysConf,
  SystemWithConfigs,
  Tint,
} from "@/lib/types";
import {
  acceptDealerMeasurements,
  addInstallationLine,
  addInstallationMeasurement,
  calculateInstallationMeasurementPiece,
  calculateInstallationAddedPiece,
  saveInstallationAddedPiece,
  removeInstallationAddedPiece,
  cancelInstallation,
  completeInstallation,
  decideInstallationQuoteAsAdmin,
  decideInstallationQuoteAsCustomer,
  deleteInstallationLine,
  proposeInstallationAppointment,
  proposeInstallationMeasurementPiece,
  recalculateInstallationQuote,
  respondInstallationAppointment,
  startInstallation,
  submitInstallationQuote,
  updateInstallationMeasurement,
  updateInstallationPermit,
} from "@/app/api/installations.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/navigation/back-link";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentScheduleView } from "@/components/payments/payment-schedule";
import {
  installationAppointmentStatusLabel,
  installationAppointmentTypeLabel,
  installationPermitStatusLabel,
  installationQuoteStatusLabel,
  installationStageLabel,
  paidBaseFor,
} from "@/lib/installation-flow";
import { PieceModal } from "@/components/estimates/piece-modal";
import type { PieceFormProps } from "@/components/estimates/piece-form";
import type { PieceFormValues } from "@/components/estimates/types";
import { EstimateRevisionSummary, estimateRevisionLabel } from "@/components/estimates/estimate-revision-summary";
import { revisionPieceForm, revisionPieceInput } from "@/components/estimates/material-revisions/piece-values";
import { InstallationQuoteTable } from "@/components/installations/installation-quote-table";
import { InstallationFinancialSummary } from "@/components/installations/installation-financial-summary";
import { AdditionalServiceFields } from "@/components/installations/additional-service-fields";
import {
  additionalServiceValidationError,
  additionalServiceValues,
  emptyAdditionalServiceDraft,
} from "@/lib/installation-additional-service";

const ACTIVE_APPOINTMENT_STATUSES: InstallationAppointmentStatus[] = [
  "PROPOSED",
  "ACCEPTED",
  "RESCHEDULE_REQUESTED",
];

// Las opciones siguen las transiciones admitidas por el backend.
const PERMIT_TRANSITIONS: Record<
  InstallationPermitStatus,
  InstallationPermitStatus[]
> = {
  PAYMENT_PENDING: [],
  PAID: ["SUBMITTED"],
  SUBMITTED: ["CHANGES_REQUIRED", "APPROVED", "REJECTED"],
  CHANGES_REQUIRED: ["SUBMITTED", "REJECTED"],
  APPROVED: [],
  REJECTED: ["SUBMITTED"],
};

const money = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0));

const numeric = (value: string | number | null | undefined) =>
  value == null ? "" : String(Number(value));

const CHANGE_REASONS: Array<{
  value: Exclude<EstimateRevisionChangeReason, "REMEASUREMENT">;
  label: string;
  labelEs: string;
}> = [
  { value: "EGRESS", label: "Does not meet egress requirements", labelEs: "Incumple los requisitos de salida de emergencia" },
  { value: "DIMENSION_LIMITS", label: "Does not meet dimension limits", labelEs: "Medidas fuera de los límites permitidos" },
  { value: "STRUCTURAL_CONDITION", label: "Structural condition", labelEs: "Condición estructural" },
  { value: "CUSTOMER_REQUEST", label: "Customer request", labelEs: "Solicitud del cliente" },
  { value: "OTHER", label: "Other", labelEs: "Otro" },
];

function pieceToForm(piece: PieceWithRelations): PieceFormValues {
  return {
    ...piece,
    width: piece.width ?? "",
    height: piece.height ?? "",
    heightLeft: piece.heightLeft ?? "",
    heightRight: piece.heightRight ?? "",
    legHeight: piece.legHeight ?? "",
    sashHeight: piece.sashHeight ?? "",
    windowHeight: piece.windowHeight ?? "",
    doorWidth: piece.doorWidth ?? "",
    doorHeight: piece.doorHeight ?? "",
    leftSideliteWidth: piece.leftSideliteWidth ?? "",
    rightSideliteWidth: piece.rightSideliteWidth ?? "",
    leftPanels: piece.leftPanels == null ? null : Number(piece.leftPanels),
    rightPanels: piece.rightPanels == null ? null : Number(piece.rightPanels),
    panelCount: piece.panelCount == null ? null : Number(piece.panelCount),
    horizontalHeights: Array.isArray(piece.horizontalHeights)
      ? piece.horizontalHeights.map(Number)
      : null,
    rate: Number(piece.rate) || 0,
    price: Number(piece.price) || 0,
    subtotal: Number(piece.subtotal) || 0,
    dealerMarkup: Number(piece.dealerMarkup || 0) * 100,
    total: Number(piece.customerSubtotal) || 0,
    netProfitD: Number(piece.netProfitD) || 0,
    customerPrice: Number(piece.customerPrice) || 0,
    customerSubtotal: Number(piece.customerSubtotal) || 0,
    dpPosPsf: piece.dpPosPsf == null ? null : Number(piece.dpPosPsf),
    dpNegPsf: piece.dpNegPsf == null ? null : Number(piece.dpNegPsf),
    highBottom: piece.highBottom ?? false,
    highBottomPercent:
      piece.highBottomPercent == null ? null : Number(piece.highBottomPercent),
    muntin: piece.pieceMuntin
      ? {
          idPattern: Number(piece.pieceMuntin.patternId),
          idType:
            piece.pieceMuntin.typeId == null
              ? null
              : Number(piece.pieceMuntin.typeId),
          panels: piece.pieceMuntin.panels.map((panel, index) => ({
            panelIndex: Number(panel.panelIndex),
            panelCode: panel.panelCode ?? undefined,
            panelLabel:
              panel.panelLabel ?? panel.panelCode ?? `Panel ${index + 1}`,
            horizontalLites: Number(panel.horizontalLites || 1),
            verticalLites: Number(panel.verticalLites || 1),
          })),
        }
      : null,
  };
}

function pieceForPersistence(
  piece: PieceFormValues,
  products: ProductWithBrands[],
): CreatePieceData {
  const product = products.find((product) => product.id === Number(piece.idProd));
  const isLinear = product?.kind === "LINEAR_MATERIAL";
  const text = (value: unknown) =>
    value == null || value === "" ? null : String(value);
  return {
    mark: piece.mark.trim(),
    idProd: Number(piece.idProd),
    idBrand: Number(piece.idBrand),
    idSyst: Number(piece.idSyst),
    idConf: Number(piece.idConf),
    idFC: Number(piece.idFC),
    idDesign: piece.idDesign == null ? null : Number(piece.idDesign),
    idDesignColor: piece.idDesignColor == null ? null : Number(piece.idDesignColor),
    frameColorBeforeDesignId: piece.frameColorBeforeDesignId == null ? null : Number(piece.frameColorBeforeDesignId),
    designSnapshot: piece.designSnapshot ?? null,
    idDoorDesign: piece.idDoorDesign ?? null,
    width: text(piece.width),
    height: text(piece.height),
    heightLeft: text(piece.heightLeft),
    heightRight: text(piece.heightRight),
    legHeight: text(piece.legHeight),
    sashHeight: text(piece.sashHeight),
    windowHeight: text(piece.windowHeight),
    doorWidth: text(piece.doorWidth),
    doorHeight: text(piece.doorHeight),
    leftSideliteWidth: text(piece.leftSideliteWidth),
    rightSideliteWidth: text(piece.rightSideliteWidth),
    leftPanels: piece.leftPanels == null ? null : Number(piece.leftPanels),
    rightPanels: piece.rightPanels == null ? null : Number(piece.rightPanels),
    panelCount: piece.panelCount == null ? null : Number(piece.panelCount),
    horizontalHeights: Array.isArray(piece.horizontalHeights)
      ? piece.horizontalHeights.map(Number)
      : null,
    idCryst: isLinear ? null : Number(piece.idCryst),
    idTint: isLinear || piece.idTint == null ? null : Number(piece.idTint),
    idCoat: isLinear || piece.idCoat == null ? null : Number(piece.idCoat),
    idPrivacy: isLinear || piece.idPrivacy == null ? null : Number(piece.idPrivacy),
    screen: isLinear ? false : Boolean(piece.screen),
    highBottom: isLinear ? false : Boolean(piece.highBottom),
    idActiveOption:
      isLinear || !piece.idActiveOption ? null : Number(piece.idActiveOption),
    idPreparationOption:
      isLinear || !piece.idPreparationOption
        ? null
        : Number(piece.idPreparationOption),
    idSillOption:
      isLinear || !piece.idSillOption ? null : Number(piece.idSillOption),
    idReinforcementOption:
      isLinear || !piece.idReinforcementOption
        ? null
        : Number(piece.idReinforcementOption),
    muntin: isLinear || product?.allowMuntin === false ? null : (piece.muntin ?? null),
    qty: 1,
    dealerMarkup: Number(piece.dealerMarkup || 0),
  };
}

type DimensionRequirements = {
  requiresWidth: boolean;
  requiresHeight: boolean;
  requiresHeightLeft: boolean;
  requiresHeightRight: boolean;
  requiresLegHeight: boolean;
  requiresSashHeight: boolean;
  requiresWindowHeight: boolean;
  requiresDoorWidth: boolean;
  requiresDoorHeight: boolean;
  requiresLeftSideliteWidth: boolean;
  requiresRightSideliteWidth: boolean;
  requiresLeftPanels: boolean;
  requiresRightPanels: boolean;
  requiresPanelCount: boolean;
  requiresHorizontalHeights: boolean;
  requiresLength: boolean;
};

function dimensionRequirements(
  piece: PieceWithRelations,
  sysConf: SysConf | undefined,
): DimensionRequirements {
  const linear = piece.prod.kind === "LINEAR_MATERIAL";
  if (linear) {
    return {
      requiresWidth: false,
      requiresHeight: false,
      requiresHeightLeft: false,
      requiresHeightRight: false,
      requiresLegHeight: false,
      requiresSashHeight: false,
      requiresWindowHeight: false,
      requiresDoorWidth: false,
      requiresDoorHeight: false,
      requiresLeftSideliteWidth: false,
      requiresRightSideliteWidth: false,
      requiresLeftPanels: false,
      requiresRightPanels: false,
      requiresPanelCount: false,
      requiresHorizontalHeights: false,
      requiresLength: Boolean(sysConf?.requiresWidth),
    };
  }
  if ((sysConf?.dimensionMode ?? "STANDARD") === "STANDARD") {
    return {
      requiresWidth: Boolean(piece.conf.requiresWidth),
      requiresHeight: Boolean(piece.conf.requiresHeight),
      requiresHeightLeft: Boolean(piece.conf.requiresHeightLeft),
      requiresHeightRight: Boolean(piece.conf.requiresHeightRight),
      requiresLegHeight: Boolean(piece.conf.requiresLegHeight),
      requiresSashHeight: Boolean(piece.conf.requiresSashHeight),
      requiresWindowHeight: Boolean(piece.conf.requiresWindowHeight),
      requiresDoorWidth: false,
      requiresDoorHeight: false,
      requiresLeftSideliteWidth: false,
      requiresRightSideliteWidth: false,
      requiresLeftPanels: false,
      requiresRightPanels: false,
      requiresPanelCount: false,
      requiresHorizontalHeights: false,
      requiresLength: false,
    };
  }
  return {
    requiresWidth: Boolean(sysConf?.requiresWidth),
    requiresHeight: Boolean(sysConf?.requiresHeight),
    requiresHeightLeft: Boolean(sysConf?.requiresHeightLeft),
    requiresHeightRight: Boolean(sysConf?.requiresHeightRight),
    requiresLegHeight: false,
    requiresSashHeight: false,
    requiresWindowHeight: false,
    requiresDoorWidth: Boolean(sysConf?.requiresDoorWidth),
    requiresDoorHeight: Boolean(sysConf?.requiresDoorHeight),
    requiresLeftSideliteWidth: Boolean(sysConf?.requiresLeftSideliteWidth),
    requiresRightSideliteWidth: Boolean(sysConf?.requiresRightSideliteWidth),
    requiresLeftPanels: Boolean(sysConf?.requiresLeftPanels),
    requiresRightPanels: Boolean(sysConf?.requiresRightPanels),
    requiresPanelCount:
      piece.conf.fixedPanelCount == null &&
      Boolean(sysConf?.requiresPanelCount),
    requiresHorizontalHeights: Boolean(sysConf?.requiresHorizontalHeights),
    requiresLength: false,
  };
}

type MeasurementDraft = {
  label: string;
  widthIn: string;
  heightIn: string;
  heightLeftIn: string;
  heightRightIn: string;
  legHeightIn: string;
  sashHeightIn: string;
  windowHeightIn: string;
  doorWidthIn: string;
  doorHeightIn: string;
  leftSideliteWidthIn: string;
  rightSideliteWidthIn: string;
  leftPanels: string;
  rightPanels: string;
  panelCount: string;
  horizontalHeights: string[];
  lengthIn: string;
  notes: string;
};

const measurementDraft = (
  measurement?: InstallationMeasurement,
  defaultLabel = "",
): MeasurementDraft => ({
  label: measurement?.label?.trim() || defaultLabel,
  widthIn: numeric(measurement?.widthIn),
  heightIn: numeric(measurement?.heightIn),
  heightLeftIn: numeric(measurement?.heightLeftIn),
  heightRightIn: numeric(measurement?.heightRightIn),
  legHeightIn: numeric(measurement?.legHeightIn),
  sashHeightIn: numeric(measurement?.sashHeightIn),
  windowHeightIn: numeric(measurement?.windowHeightIn),
  doorWidthIn: numeric(measurement?.doorWidthIn),
  doorHeightIn: numeric(measurement?.doorHeightIn),
  leftSideliteWidthIn: numeric(measurement?.leftSideliteWidthIn),
  rightSideliteWidthIn: numeric(measurement?.rightSideliteWidthIn),
  leftPanels: numeric(measurement?.leftPanels),
  rightPanels: numeric(measurement?.rightPanels),
  panelCount: numeric(measurement?.panelCount),
  horizontalHeights: Array.isArray(measurement?.horizontalHeights)
    ? measurement.horizontalHeights.map(numeric)
    : [],
  lengthIn: numeric(measurement?.lengthIn),
  notes: measurement?.notes ?? "",
});

const toMeasurementPayload = (draft: MeasurementDraft) => {
  const decimal = (value: string) => (value === "" ? undefined : Number(value));
  return {
    label: draft.label.trim(),
    widthIn: decimal(draft.widthIn),
    heightIn: decimal(draft.heightIn),
    heightLeftIn: decimal(draft.heightLeftIn),
    heightRightIn: decimal(draft.heightRightIn),
    legHeightIn: decimal(draft.legHeightIn),
    sashHeightIn: decimal(draft.sashHeightIn),
    windowHeightIn: decimal(draft.windowHeightIn),
    doorWidthIn: decimal(draft.doorWidthIn),
    doorHeightIn: decimal(draft.doorHeightIn),
    leftSideliteWidthIn: decimal(draft.leftSideliteWidthIn),
    rightSideliteWidthIn: decimal(draft.rightSideliteWidthIn),
    leftPanels: decimal(draft.leftPanels),
    rightPanels: decimal(draft.rightPanels),
    panelCount: decimal(draft.panelCount),
    horizontalHeights:
      draft.horizontalHeights.length > 0
        ? draft.horizontalHeights.map(Number)
        : undefined,
    lengthIn: decimal(draft.lengthIn),
    notes: draft.notes.trim() || undefined,
  };
};

function MeasurementEditor({
  measurement,
  piece,
  sysConf,
  revisionItem,
  defaultLabel,
  onSave,
  onReplace,
  onRemove,
  busy,
}: {
  measurement: InstallationMeasurement;
  piece: PieceWithRelations;
  sysConf?: SysConf;
  revisionItem?: EstimateRevisionItem;
  defaultLabel: string;
  onSave: (draft: MeasurementDraft) => Promise<void>;
  onReplace: (
    reason: Exclude<EstimateRevisionChangeReason, "REMEASUREMENT">,
    note?: string,
  ) => void;
  onRemove: (
    reason: Exclude<EstimateRevisionChangeReason, "REMEASUREMENT">,
    note?: string,
  ) => Promise<void>;
  busy: boolean;
}) {
  const { locale } = usePortalLanguage();
  const t = (english: string, spanish: string) => locale === "es" ? spanish : english;
  const [draft, setDraft] = useState(() => {
    const value = measurementDraft(measurement, defaultLabel);
    const sourceMark = piece.mark.trim();
    const oldDefault = piece.qty > 1 ? `${sourceMark} (${measurement.unitIndex}/${piece.qty})`.trim() : sourceMark;
    if (measurement.status === "PENDING" && value.label.trim() === oldDefault) value.label = defaultLabel;
    return value;
  });
  const [reason, setReason] = useState<
    Exclude<EstimateRevisionChangeReason, "REMEASUREMENT"> | ""
  >(
    revisionItem?.reason && revisionItem.reason !== "REMEASUREMENT"
      ? revisionItem.reason
      : "",
  );
  const [reasonNote, setReasonNote] = useState(revisionItem?.reasonNote ?? "");
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const requirements = dimensionRequirements(piece, sysConf);
  const fields: Array<{
    key: Exclude<
      keyof MeasurementDraft,
      "label" | "notes" | "horizontalHeights"
    >;
    label: string;
    step: string;
    show: boolean;
  }> = [
    {
      key: "widthIn",
      label: "Width",
      step: "0.001",
      show: requirements.requiresWidth,
    },
    {
      key: "heightIn",
      label: requirements.requiresWindowHeight
        ? "Open Height"
        : requirements.requiresDoorHeight
          ? "Opening Height"
          : "Height",
      step: "0.001",
      show: requirements.requiresHeight,
    },
    {
      key: "heightLeftIn",
      label: "Height Left",
      step: "0.001",
      show: requirements.requiresHeightLeft,
    },
    {
      key: "heightRightIn",
      label: "Height Right",
      step: "0.001",
      show: requirements.requiresHeightRight,
    },
    {
      key: "legHeightIn",
      label: "Leg Height",
      step: "0.001",
      show: requirements.requiresLegHeight,
    },
    {
      key: "sashHeightIn",
      label: "Sash Height",
      step: "0.001",
      show: requirements.requiresSashHeight,
    },
    {
      key: "windowHeightIn",
      label: "Window Height",
      step: "0.001",
      show: requirements.requiresWindowHeight,
    },
    {
      key: "doorWidthIn",
      label: "Door Width",
      step: "0.001",
      show: requirements.requiresDoorWidth,
    },
    {
      key: "doorHeightIn",
      label: "Door Height",
      step: "0.001",
      show: requirements.requiresDoorHeight,
    },
    {
      key: "leftSideliteWidthIn",
      label: "Left Sidelite Width",
      step: "0.001",
      show: requirements.requiresLeftSideliteWidth,
    },
    {
      key: "rightSideliteWidthIn",
      label: "Right Sidelite Width",
      step: "0.001",
      show: requirements.requiresRightSideliteWidth,
    },
    {
      key: "leftPanels",
      label: "Left Panels",
      step: "1",
      show: requirements.requiresLeftPanels,
    },
    {
      key: "rightPanels",
      label: "Right Panels",
      step: "1",
      show: requirements.requiresRightPanels,
    },
    {
      key: "panelCount",
      label: "Panel Count",
      step: "1",
      show: requirements.requiresPanelCount,
    },
    {
      key: "lengthIn",
      label: "Length",
      step: "0.001",
      show: requirements.requiresLength,
    },
  ];
  const originalSize = piece.width
    ? `${Number(piece.width)}${piece.height ? ` × ${Number(piece.height)}` : ""}`
    : "—";

  return (
    <>
      <details
        className="rounded-lg border bg-white"
        open={measurement.status === "PENDING"}
      >
        <summary className="cursor-pointer list-none p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="font-medium">
                {draft.label.trim() || defaultLabel} · {piece.prod.name} · {piece.syst.name} ·{" "}
                {piece.conf.conf}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {t(`Unit ${measurement.unitIndex} of ${piece.qty}`, `Unidad ${measurement.unitIndex} de ${piece.qty}`)} · Original {originalSize}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {revisionItem && (
                <Badge
                  variant={
                    revisionItem.action === "REMOVE" ? "destructive" : "outline"
                  }
                >
                  {estimateRevisionLabel(revisionItem.action, locale)}
                </Badge>
              )}
              <Badge
                variant={
                  measurement.status === "COMPLETED" ? "default" : "secondary"
                }
              >
                {measurement.status === "COMPLETED" ? t("Completed", "Completada") : t("Pending", "Pendiente")}
              </Badge>
            </div>
          </div>
        </summary>
        <div className="space-y-4 border-t p-4">
          <div className="space-y-2">
            <Label>{t("Label (optional)", "Etiqueta (opcional)")}</Label>
            <Input
              placeholder={defaultLabel}
              value={draft.label}
              onChange={(event) =>
                setDraft((value) => ({ ...value, label: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {fields
              .filter((field) => field.show)
              .map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs">{field.key === "lengthIn" ? t("Length", "Longitud") : pieceFormText(locale, field.label)}</Label>
                  <Input
                    type="number"
                    min="0"
                    step={field.step}
                    value={draft[field.key]}
                    onChange={(event) =>
                      setDraft((value) => ({
                        ...value,
                        [field.key]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
          </div>
          {requirements.requiresHorizontalHeights && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <Label>{pieceFormText(locale, "Horizontal Heights")}</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDraft((value) => ({
                      ...value,
                      horizontalHeights: [...value.horizontalHeights, "18"],
                    }))
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> {t("Add height", "Agregar altura")}
                </Button>
              </div>
              {draft.horizontalHeights.map((height, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={height}
                    onChange={(event) =>
                      setDraft((value) => ({
                        ...value,
                        horizontalHeights: value.horizontalHeights.map(
                          (current, currentIndex) =>
                            currentIndex === index
                              ? event.target.value
                              : current,
                        ),
                      }))
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    aria-label={t(`Remove height ${index + 1}`, `Quitar altura ${index + 1}`)}
                    variant="ghost"
                    onClick={() =>
                      setDraft((value) => ({
                        ...value,
                        horizontalHeights: value.horizontalHeights.filter(
                          (_, currentIndex) => currentIndex !== index,
                        ),
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-1">
            <Label>{t("Notes", "Notas")}</Label>
            <Textarea
              value={draft.notes}
              onChange={(event) =>
                setDraft((value) => ({ ...value, notes: event.target.value }))
              }
            />
          </div>
          {revisionItem?.action === "REPLACE" && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
              {t("Replacement proposed:", "Reemplazo propuesto:")}{" "}
              {revisionItem.calculatedSnapshot?.display?.productName} ·{" "}
              {revisionItem.calculatedSnapshot?.display?.systemName} ·{" "}
              {revisionItem.calculatedSnapshot?.display?.configName}
            </div>
          )}
          {revisionItem?.action === "REMOVE" && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              {t("This unit is proposed for removal from the Estimate. Nothing changes until customer approval.", "Se propuso quitar esta unidad de la cotización. El cambio se aplicará cuando el cliente lo apruebe.")}
            </div>
          )}
          <div className="grid gap-3 rounded-md border border-amber-200 bg-amber-50/50 p-3 md:grid-cols-[240px_1fr]">
            <Select
              value={reason}
              onValueChange={(value) =>
                setReason(
                  value as Exclude<
                    EstimateRevisionChangeReason,
                    "REMEASUREMENT"
                  >,
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("Reason for replacement/removal", "Motivo del reemplazo o la eliminación")} />
              </SelectTrigger>
              <SelectContent>
                {CHANGE_REASONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.label, option.labelEs)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={reasonNote}
              onChange={(event) => setReasonNote(event.target.value)}
              placeholder={t("Reason details (required for Other)", "Detalles del motivo (obligatorios si eliges «Otro»)")}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() =>
                reason && onReplace(reason, reasonNote.trim() || undefined)
              }
              disabled={busy || !reason}
            >
              <Replace className="mr-2 h-4 w-4" /> {t("Replace Piece", "Reemplazar pieza")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setRemoveDialogOpen(true)}
              disabled={busy || !reason}
            >
              <XCircle className="mr-2 h-4 w-4" /> {t("Unable to install", "Imposible instalar")}
            </Button>
            <Button
              onClick={() => onSave(draft)}
              disabled={busy}
            >
              {measurement.status === "COMPLETED"
                ? t("Update measured Piece", "Actualizar pieza medida")
                : t("Confirm as measured", "Confirmar medidas")}
            </Button>
          </div>
        </div>
      </details>
      <DeleteConfirmationDialog
        isOpen={removeDialogOpen}
        onClose={() => setRemoveDialogOpen(false)}
        onConfirm={() => {
          if (!reason) return;
          return onRemove(reason, reasonNote.trim() || undefined);
        }}
        title={t("Mark this unit as unable to install?", "¿Marcar esta unidad como imposible de instalar?")}
        description={t(
          `This will propose removing ${piece.mark} · Unit ${measurement.unitIndex} from the Estimate. Nothing changes until the customer approves the revision.`,
          `Se propondrá quitar ${piece.mark} · Unidad ${measurement.unitIndex} de la cotización. El cambio se aplicará cuando el cliente apruebe la revisión.`,
        )}
        confirmText={t("Propose removal", "Proponer eliminación")}
        cancelText={t("Cancel", "Cancelar")}
        lang={locale}
      />
    </>
  );
}

export function InstallationDetailClient({
  initialJob,
  services,
  userId,
  userRole,
  returnHref,
  productsWithBrands,
  systemsWithConfigs,
  frameColors,
  crystals,
  tints,
  coatings,
  privacies,
  muntinPatterns,
  muntinTypes,
}: {
  initialJob: InstallationJob;
  services: InstallationService[];
  userId: number;
  userRole: string;
  returnHref: string;
  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];
  privacies: Privacy[];
  muntinPatterns: MuntinPattern[];
  muntinTypes: MuntinType[];
}) {
  const router = useRouter();
  const { locale } = usePortalLanguage();
  const t = (english: string, spanish: string) => locale === "es" ? spanish : english;
  const [job, setJob] = useState(initialJob);
  // Incorpora los datos del servidor al refrescar la ruta sin desmontar la vista.
  useEffect(() => {
    setJob(initialJob);
  }, [initialJob]);
  const [busy, setBusy] = useState(false);
  const [manualDraft, setManualDraft] = useState(measurementDraft());
  const [serviceId, setServiceId] = useState<string>("");
  const [serviceDraft, setServiceDraft] = useState(
    emptyAdditionalServiceDraft(),
  );
  const [quoteNotes, setQuoteNotes] = useState("");
  const [decisionComment, setDecisionComment] = useState("");
  const [permitStatus, setPermitStatus] = useState<InstallationPermitStatus>(
    job.permit?.status === "PAID"
      ? "SUBMITTED"
      : (job.permit?.status ?? "SUBMITTED"),
  );
  const [cityFee, setCityFee] = useState(numeric(job.permit?.cityFee));
  const [permitNotes, setPermitNotes] = useState(job.permit?.notes ?? "");
  useEffect(() => {
    setPermitStatus(
      job.permit?.status === "PAID"
        ? "SUBMITTED"
        : (job.permit?.status ?? "SUBMITTED"),
    );
    setCityFee(numeric(job.permit?.cityFee));
    setPermitNotes(job.permit?.notes ?? "");
  }, [job.permit?.id, job.permit?.status, job.permit?.cityFee, job.permit?.notes]);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [appointmentNote, setAppointmentNote] = useState("");
  const [appointmentResponseNotes, setAppointmentResponseNotes] = useState<
    Record<number, string>
  >({});
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [replacement, setReplacement] = useState<{
    measurement: InstallationMeasurement;
    piece: PieceWithRelations;
    reason: Exclude<EstimateRevisionChangeReason, "REMEASUREMENT">;
    note?: string;
  } | null>(null);

  const [addedPieceEditor, setAddedPieceEditor] = useState<{
    measurementId?: number;
    input?: CreatePieceData;
    key: string;
  } | null>(null);

  const estimateCanceled = job.estimate.status?.name === "Canceled";
  const privileged = !estimateCanceled && (userRole === "admin" || userRole === "operator");
  const admin = !estimateCanceled && userRole === "admin";
  const owner = !estimateCanceled && job.estimate.idUser === userId;
  const latest = job.quotes[0];
  const addedMeasurementId = addedPieceEditor?.measurementId;
  const quoteId = latest?.id;
  const calculateAddedPiece = useCallback<NonNullable<PieceFormProps["onCalculate"]>>(
    piece => calculateInstallationAddedPiece(job.id, {
      measurementId: addedMeasurementId, quoteId, piece: revisionPieceInput(piece, productsWithBrands),
    }),
    [job.id, addedMeasurementId, quoteId, productsWithBrands],
  );
  const replacementMeasurementId = replacement?.measurement.id;
  const calculateReplacement = useMemo<PieceFormProps["onCalculate"]>(() => {
    if (replacementMeasurementId == null) return undefined;
    return piece => calculateInstallationMeasurementPiece(job.id, replacementMeasurementId, piece);
  }, [job.id, replacementMeasurementId]);
  const pendingMeasurements = job.measurements.filter((measurement) => measurement.status === "PENDING");
  const quoteHistory = job.quotes.filter((quote) => quote.status !== "DRAFT");
  const latestRevision = latest
    ? job.revisions?.find((revision) => revision.quoteId === latest.id)
    : job.revisions?.[0];
  const revisionItemByMeasurement = new Map(
    (latestRevision?.items ?? []).map((item) => [item.measurementId, item]),
  );
  const combinedRevisionSubmitted = Boolean(latest &&
    ["PENDING_ADMIN_APPROVAL", "PENDING_CUSTOMER_APPROVAL"].includes(latest.status) &&
    latestRevision?.items.some((item) => item.action === "ADD"));
  const pieceById = new Map(
    (job.estimate.pieces ?? []).map((piece) => [piece.id, piece]),
  );
  const appliedServiceMinimums = (latest?.serviceMinimumsSnapshot ?? []).filter(
    (minimum) => Number(minimum.adjustment) > 0,
  );
  const serviceChoices = services.filter((service) =>
    privileged ? service.availableForField : service.availableForRequest,
  );
  const selectedService =
    serviceChoices.find((service) => service.id === Number(serviceId)) ?? null;
  const depositPaid = paidBaseFor(job, "INSTALLATION_DEPOSIT");
  const canManageAdditionalServices =
    !estimateCanceled &&
    !["COMPLETED", "CANCELED"].includes(job.status) &&
    (privileged ||
      (userRole === "dealer" && job.status === "DEPOSIT_PAYMENT_PENDING"));
  const showServiceChangeNotice =
    userRole === "client" &&
    depositPaid > 0 &&
    [
      "MEASUREMENT_SCHEDULING",
      "MEASUREMENT_SCHEDULED",
      "MEASUREMENT_PENDING",
    ].includes(job.status);
  const installationPaid = paidBaseFor(job, "INSTALLATION");
  const permitUsesPaymentPlan = Boolean(job.paymentSchedule);
  const permitLocked = !permitUsesPaymentPlan && (job.payments ?? []).some(
    (payment) =>
      ["MATERIAL", "INSTALLMENT"].includes(payment.type) &&
      (payment.status === "PAID" || Boolean(payment.stripeSessionId)),
  );
  const permitOptions: InstallationPermitStatus[] = job.permit ? (permitUsesPaymentPlan && job.permit.status === "PAYMENT_PENDING" ? ["SUBMITTED"] : PERMIT_TRANSITIONS[job.permit.status]) : [];
  const approvingPermit = permitStatus === "APPROVED";
  const validCityFee =
    cityFee.trim() !== "" &&
    Number.isFinite(Number(cityFee)) &&
    Number(cityFee) >= 0;
  const permitChanged = Boolean(
    job.permit &&
      (permitStatus !== job.permit.status ||
        permitNotes.trim() !== (job.permit.notes ?? "").trim() ||
        (approvingPermit &&
          validCityFee &&
          (job.permit.cityFee == null ||
            Number(cityFee) !== Number(job.permit.cityFee)))),
  );
  const validPermitStatus =
    permitOptions.includes(permitStatus) ||
    (permitStatus === job.permit?.status &&
      !["PAYMENT_PENDING", "PAID"].includes(permitStatus));
  const canSavePermit =
    !busy &&
    !permitLocked &&
    validPermitStatus &&
    (!approvingPermit || validCityFee) &&
    permitChanged;
  const canRecordMeasurements =
    Number(job.depositAmountSnapshot) === 0 ||
    [
      "MEASUREMENT_SCHEDULED",
      "MEASUREMENT_PENDING",
      "QUOTE_DRAFT",
      "ADMIN_APPROVAL_PENDING",
      "CUSTOMER_APPROVAL_PENDING",
    ].includes(job.status);
  const canEditRemeasurementRevision = privileged && canRecordMeasurements && !job.estimate.order &&
    !["COMPLETED", "CANCELED"].includes(job.status) &&
    Boolean(latest && !["PENDING_ADMIN_APPROVAL", "PENDING_CUSTOMER_APPROVAL"].includes(latest.status));
  const showRemeasurementNotReady =
    !canRecordMeasurements &&
    ["REQUESTED", "DEPOSIT_PAYMENT_PENDING", "MEASUREMENT_SCHEDULING"].includes(
      job.status,
    );
  const appointmentType = [
    "MEASUREMENT_SCHEDULING",
    "MEASUREMENT_SCHEDULED",
  ].includes(job.status)
    ? "REMEASUREMENT"
    : "INSTALLATION";
  const canManageAppointmentScheduling = [
    "MEASUREMENT_SCHEDULING",
    "MEASUREMENT_SCHEDULED",
    "INSTALLATION_PAID",
    "SCHEDULING",
    "SCHEDULED",
  ].includes(job.status);
  const activeAppointmentsForType = job.appointments.filter(
    (appointment) =>
      appointment.type === appointmentType &&
      ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status),
  );
  const blockingAppointment = activeAppointmentsForType.find(
    (appointment) =>
      appointment.status === "PROPOSED" || appointment.status === "ACCEPTED",
  );
  const rescheduleRequested = activeAppointmentsForType.some(
    (appointment) => appointment.status === "RESCHEDULE_REQUESTED",
  );
  const canProposeAppointment =
    canManageAppointmentScheduling && !blockingAppointment;
  const installationOrder = job.estimate.order;
  const deliveryOverride = installationOrder?.deliveries?.find(
    (delivery) =>
      delivery.type === "INSTALLATION_OVERRIDE" &&
      delivery.status !== "CANCELED",
  );
  const deliveryOverridePaid =
    !deliveryOverride || deliveryOverride.payment?.status === "PAID";
  const orderReadyToStartInstallation = Boolean(
    installationOrder &&
      (installationOrder.status?.name === "Delivered" ||
        (["Preparing for pickup", "Ready to pick up"].includes(
          installationOrder.status?.name ?? "",
        ) &&
          installationOrder.fulfillmentMethod === "INSTALLATION_DELIVERY")) &&
      deliveryOverridePaid,
  );

  const run = async (
    action: () => Promise<InstallationJob>,
    success: string | ((result: InstallationJob) => string),
  ) => {
    setBusy(true);
    try {
      const result = await action();
      setJob(result);
      toast.success(typeof success === "function" ? success(result) : success);
    } catch (error) {
      toast.error(installationActionError(locale, error));
    } finally {
      setBusy(false);
    }
  };

  const respondToAppointment = async (
    appointmentId: number,
    response: "ACCEPT" | "REQUEST_RESCHEDULE",
  ) => {
    setBusy(true);
    try {
      const updated = await respondInstallationAppointment(
        appointmentId,
        response,
        appointmentResponseNotes[appointmentId]?.trim() || undefined,
      );
      setJob(updated);
      setAppointmentResponseNotes((current) => {
        const next = { ...current };
        delete next[appointmentId];
        return next;
      });
      toast.success(
        response === "ACCEPT"
          ? t("Appointment accepted.", "Cita aceptada.")
          : t("Reschedule requested.", "Se solicitó un cambio de fecha."),
      );
    } catch (error) {
      toast.error(installationActionError(locale, error));
    } finally {
      setBusy(false);
    }
  };

  const addAdditionalService = async () => {
    if (!canManageAdditionalServices) return;
    const error = additionalServiceValidationError(
      selectedService,
      serviceDraft,
      locale,
    );
    if (error) {
      toast.error(error);
      return;
    }

    await run(async () => {
      const result = await addInstallationLine(job.id, {
        serviceId: selectedService!.id,
        ...additionalServiceValues(selectedService!, serviceDraft),
        origin: privileged ? "FIELD_ADDED" : "USER_SELECTED",
      });
      setServiceId("");
      setServiceDraft(emptyAdditionalServiceDraft());
      return result;
    }, t("Additional service added.", "Servicio adicional agregado."));
  };

  const cancelPaidInstallation = async () => {
    setBusy(true);
    try {
      const result = await cancelInstallation(
        job.id,
        cancellationReason.trim() || undefined,
      );
      if (result) {
        setJob(result);
      } else {
        router.replace(`/estimates/${job.estimateId}/edit`);
      }
      toast.success(
        t("Installation canceled. The deposit remains non-refundable.", "Instalación cancelada. El depósito no es reembolsable."),
      );
    } catch (error) {
      toast.error(installationActionError(locale, error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <BackLink href={returnHref} label={t("Back to Installations", "Volver a instalaciones")} />
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            {t("Installation · Estimate #", "Instalación · Cotización n.º ")}{job.estimate.number}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.estimate.customerFirstName} {job.estimate.customerLastName} ·{" "}
            {t("Requested", "Fecha de solicitud")} {new Date(job.requestedAt).toLocaleDateString(locale === "es" ? "es-US" : "en-US")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="text-sm">{installationStageLabel(job, locale)}</Badge>
          <Button variant="outline" asChild>
            <Link
              href={
                job.estimate.order
                  ? `/orders/${job.estimate.order.id}`
                  : `/estimates/${job.estimateId}${estimateCanceled ? "" : "/edit"}`
              }
            >
              {job.estimate.order ? t("Open order", "Abrir orden") : t("Open estimate", "Abrir cotización")}
            </Link>
          </Button>
        </div>
      </div>

      {estimateCanceled && <p role="status" className="rounded-lg border bg-slate-50 p-4 text-sm">{t("This estimate is canceled. Reactivate it from the estimate to resume this project.", "Esta cotización está cancelada. Reactívala desde la cotización para continuar con el proyecto.")}</p>}
      {!estimateCanceled && <MaterialRevisionAccess estimateId={job.estimateId} context="installation" locale={locale} />}
      {job.installationAddress && <div className="rounded-lg border bg-white p-4 text-sm"><strong>{t("Installation address", "Dirección de instalación")}</strong><p className="mt-1">{[job.installationAddress.street, job.installationAddress.addressLine2, job.installationAddress.city, job.installationAddress.state, job.installationAddress.postalCode].filter(Boolean).join(", ")}</p></div>}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {(admin || (owner && userRole === "dealer" && job.estimate.user.dealerMode === "INTERNAL")) &&
            job.estimate.user.role?.name === "dealer" &&
            job.status === "DEPOSIT_PAYMENT_PENDING" &&
            !job.dealerMeasurementsAcceptedAt &&
            depositPaid === 0 && (
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle>{t("Accept dealer measurements", "Aceptar las medidas del distribuidor")}</CardTitle>
                  <CardDescription>
                    {t("Use the current estimate measurements without a company remeasurement visit or an installation deposit. The full installation balance remains due. Continue with the current price without submitting the quote or requesting approvals.", "Usa las medidas actuales de la cotización y omite la visita de verificación y el depósito de instalación. El saldo completo de la instalación queda pendiente. Se mantiene el precio actual y puedes continuar sin enviar la cotización ni solicitar aprobaciones.")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-end">
                  <Button
                    className="h-auto whitespace-normal"
                    disabled={busy}
                    onClick={() => run(
                      () => acceptDealerMeasurements(job.id),
                      t("Dealer measurements accepted. Deposit and remeasurement waived.", "Se aceptaron las medidas del distribuidor. Se omitieron el depósito y la visita de verificación."),
                    )}
                  >
                    {t("Accept measurements and waive deposit", "Aceptar las medidas y omitir el depósito")}
                  </Button>
                </CardContent>
              </Card>
            )}

          {job.dealerMeasurementsAcceptedAt && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <strong className="block">{t("Dealer measurements accepted", "Medidas del distribuidor aceptadas")}</strong>
              <p>{t("No installation deposit or remeasurement visit is required.", "Se omiten el depósito de instalación y la visita de verificación de medidas.")}</p>
              {admin && job.dealerMeasurementsAcceptedById && (
                <p className="mt-1 text-xs">
                  {t("Authorized by", "Autorizado por")} {job.dealerMeasurementsAcceptedBy?.firstName}{" "}
                  {job.dealerMeasurementsAcceptedBy?.lastName} ·{" "}
                  {new Date(job.dealerMeasurementsAcceptedAt).toLocaleString(locale === "es" ? "es-US" : "en-US")}
                </p>
              )}
              {admin && !job.dealerMeasurementsAcceptedById && (
                <p className="mt-1 text-xs">{t("Applied from the dealer's No installation deposit setting.", "Se aplicó la opción «Sin depósito de instalación» del distribuidor.")}</p>
              )}
            </div>
          )}

          {privileged && showRemeasurementNotReady && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> {t("Remeasurement is not ready", "Verificación de medidas pendiente")}
                </CardTitle>
                <CardDescription>
                  {t("Record measurements only after the deposit is paid and the customer accepts the remeasurement date.", "Registra las medidas después de que se pague el depósito y el cliente acepte la fecha de la visita.")}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {privileged && canRecordMeasurements && (
            <Card id="material-revision">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>{job.dealerMeasurementsAcceptedAt ? t("Accepted measurements", "Medidas aceptadas") : t("Field Measurements", "Medidas en obra")}</CardTitle>
                  {canEditRemeasurementRevision && <Button disabled={busy} onClick={() =>
                    setAddedPieceEditor({ key: `new-${Date.now()}` })}>
                    <Plus className="mr-2 h-4 w-4" /> {t("Add Piece", "Agregar pieza")}
                  </Button>}
                </div>
                <CardDescription>
                  {t("Each physical unit is identified from its Estimate Piece. Only the dimensions required by that System configuration are shown. Added pieces and measurement changes stay in this same revision; submit the quote once all units have been confirmed.", "Cada unidad se identifica por su pieza en la cotización. Aquí aparecen las medidas que requiere la configuración de ese sistema. Las piezas nuevas y los cambios de medidas se incluyen en esta revisión. Envía la cotización cuando hayas confirmado todas las unidades.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {combinedRevisionSubmitted && <p className="text-sm text-muted-foreground">
                  {t("This revision is awaiting approval. Return it for changes before editing its material or measurements.", "Esta revisión está pendiente de aprobación. Devuélvela para hacer cambios antes de editar los materiales o las medidas.")}
                </p>}
                {job.measurements
                  .filter((measurement) => !measurement.isManual)
                  .map((measurement) => {
                    const piece =
                      measurement.pieceId == null
                        ? undefined
                        : pieceById.get(measurement.pieceId);
                    if (!piece) {
                      const addition = revisionItemByMeasurement.get(measurement.id);
                      const input = addition?.proposedPieceInput;
                      if (addition?.action !== "ADD" || !input) return null;
                      const display = addition.calculatedSnapshot?.display;
                      const dimensions = ([
                        ["Width", input.width], ["Height", input.height], ["Height Left", input.heightLeft],
                        ["Height Right", input.heightRight], ["Leg Height", input.legHeight],
                        ["Sash Height", input.sashHeight], ["Window Height", input.windowHeight],
                        ["Door Width", input.doorWidth], ["Door Height", input.doorHeight],
                        ["Left Sidelite Width", input.leftSideliteWidth], ["Right Sidelite Width", input.rightSideliteWidth],
                      ] as const).filter(([, value]) => value != null && value !== "");
                      return <div key={`${measurement.id}-${measurement.updatedAt}`} className="space-y-3 rounded-lg border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-semibold">{input.mark || t("New piece", "Nueva pieza")} · {t("Unit", "Unidad")} {addition.sourceUnitIndex}</h3>
                          <div className="flex gap-2"><Badge variant="outline">{t("Added piece", "Pieza agregada")}</Badge><Badge variant="outline">{measurement.status === "COMPLETED" ? t("Completed", "Completada") : t("Pending", "Pendiente")}</Badge></div>
                        </div>
                        <p className="text-sm">{[display?.productName, display?.systemName, display?.configName].filter(Boolean).join(" · ")}</p>
                        <p className="text-sm">{dimensions.map(([name, value]) => `${pieceFormText(locale, name)}: ${Number(value)} ${t("in", "pulg.")}`).join(" · ")}</p>
                        {input.horizontalHeights?.length ? <p className="text-sm">{pieceFormText(locale, "Horizontal Heights")}: {input.horizontalHeights.join(" / ")} {t("in", "pulg.")}</p> : null}
                        {input.panelCount != null && <p className="text-sm">{t("Panels", "Paneles")}: {input.panelCount}</p>}
                        <p className="text-xs text-muted-foreground">{t("Pending material addition. It is not part of the original estimate until approval. Use Edit Piece to review all specifications.", "Esta pieza se incorporará a la cotización original cuando se apruebe la revisión. Selecciona «Editar pieza» para ver sus especificaciones.")}</p>
                        {canEditRemeasurementRevision && <div className="flex flex-wrap gap-2">
                          <Button variant="outline" disabled={busy} onClick={() => setAddedPieceEditor({
                            measurementId: measurement.id,
                            input: { ...input, doorDesignSnapshot: addition.calculatedSnapshot?.doorDesignSnapshot },
                            key: `added-${measurement.id}-${measurement.updatedAt}`,
                          })}>{t("Edit Piece", "Editar pieza")}</Button>
                          <Button disabled={busy || measurement.status === "COMPLETED"} onClick={() => void run(
                            () => updateInstallationMeasurement(job.id, measurement.id, { label: measurement.label }),
                            t("Added unit measurement confirmed. Continue preparing the same revision.", "Se confirmó la medida de la unidad agregada. Puedes continuar con esta revisión."),
                          )}>{measurement.status === "COMPLETED" ? t("Measurement confirmed", "Medida confirmada") : t("Confirm measurement", "Confirmar medida")}</Button>
                          <Button variant="outline" disabled={busy} onClick={() => {
                            if (window.confirm(t("Remove this added unit from the pending revision? Original material will not change.", "¿Quieres quitar esta unidad de la revisión pendiente? El material original se conserva.")))
                              void run(() => removeInstallationAddedPiece(job.id, measurement.id), t("Pending added unit removed.", "Se quitó la unidad de la revisión pendiente."));
                          }}>{t("Remove added unit", "Quitar unidad agregada")}</Button>
                        </div>}
                      </div>;
                    }
                    const system = systemsWithConfigs.find(
                      (candidate) => candidate.id === piece.idSyst,
                    );
                    const sysConf = system?.sysconfs.find(
                      (candidate) => candidate.idConfig === piece.idConf,
                    );
                    return (
                      <MeasurementEditor
                        key={`${measurement.id}-${measurement.updatedAt ?? measurement.status}`}
                        measurement={measurement}
                        piece={piece}
                        defaultLabel={piece.mark.trim() || `#${(job.estimate.pieces ?? []).findIndex((item) => item.id === piece.id) + 1}`}
                        sysConf={sysConf}
                        revisionItem={revisionItemByMeasurement.get(
                          measurement.id,
                        )}
                        busy={busy || combinedRevisionSubmitted}
                        onSave={(draft) =>
                          run(
                            () =>
                              updateInstallationMeasurement(
                                job.id,
                                measurement.id,
                                toMeasurementPayload(draft),
                              ),
                            t("Measurement confirmed. Submit Quote when the visit is complete.", "Medida confirmada. Envía la cotización al terminar la visita."),
                          )
                        }
                        onReplace={(reason, note) =>
                          setReplacement({
                            measurement,
                            piece,
                            reason,
                            note,
                          })
                        }
                        onRemove={(reason, note) =>
                          run(
                            () =>
                              proposeInstallationMeasurementPiece(
                                job.id,
                                measurement.id,
                                { action: "REMOVE", reason, note },
                              ),
                            t("Removal added to the pending Estimate revision.", "Se incluyó la eliminación de la pieza en la revisión pendiente."),
                          )
                        }
                      />
                    );
                  })}
                {job.measurements.some(
                  (measurement) => measurement.isManual,
                ) && (
                  <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    {t("Manual installation-only openings:", "Aberturas manuales solo para instalación:")}{" "}
                    {job.measurements
                      .filter((measurement) => measurement.isManual)
                      .map((measurement) => measurement.label)
                      .join(", ")}
                    {t(". These do not add material Pieces to the Estimate.", ". Estas aberturas se usan solo para calcular la instalación.")}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {privileged && canRecordMeasurements && (
            <Card>
              <CardHeader>
                <CardTitle>{t("Add an opening not in the estimate", "Agregar una abertura que falta en la cotización")}</CardTitle>
                <CardDescription>
                  {t("Add each physical component separately when needed, then attach existing catalog services. No duplicate manual service is created.", "Agrega cada componente por separado y asígnale los servicios del catálogo que correspondan. Así evitas duplicar servicios.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1 sm:col-span-2">
                    <Label>{t("Label", "Etiqueta")}</Label>
                    <Input
                      value={manualDraft.label}
                      onChange={(event) =>
                        setManualDraft((value) => ({
                          ...value,
                          label: event.target.value,
                        }))
                      }
                      placeholder={t("Existing opening / component", "Abertura o componente existente")}
                    />
                  </div>
                  {(
                    [
                      ["widthIn", "Width"],
                      ["heightIn", "Height"],
                      ["doorWidthIn", "Door Width"],
                      ["doorHeightIn", "Door Height"],
                      ["panelCount", "Panel Count"],
                      ["lengthIn", "Length"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">
                        {key === "lengthIn" ? t("Length", "Longitud") : pieceFormText(locale, label)}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step={key === "panelCount" ? "1" : "0.001"}
                        value={manualDraft[key]}
                        onChange={(event) =>
                          setManualDraft((value) => ({
                            ...value,
                            [key]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <Textarea
                  value={manualDraft.notes}
                  onChange={(event) =>
                    setManualDraft((value) => ({
                      ...value,
                      notes: event.target.value,
                    }))
                  }
                  placeholder={t("Notes", "Notas")}
                />
                <div className="flex justify-end">
                  <Button
                    disabled={busy || !manualDraft.label.trim()}
                    onClick={() =>
                      run(async () => {
                        const result = await addInstallationMeasurement(
                          job.id,
                          toMeasurementPayload(manualDraft),
                        );
                        setManualDraft(measurementDraft());
                        return result;
                      }, t("Manual opening added.", "Se agregó la abertura manual."))
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" /> {t("Add opening", "Agregar abertura")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {latestRevision && (
            <EstimateRevisionSummary revision={latestRevision} comparison={job.revisionComparison} locale={locale} />
          )}

          <Card
            className={
              latest?.needsRecalculation ? "border-amber-300" : undefined
            }
          >
            <CardHeader>
              <CardTitle>{t("Quote", "Cotización")} {latest?.submittedAt ? `v${latest.version}` : ""}</CardTitle>
              <CardDescription>
                {admin
                  ? t("Confirm all measurements, then submit the completed visit.", "Confirma todas las medidas y envía la cotización al terminar la visita.")
                  : t("Installation services and prices.", "Servicios y precios de instalación.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {latest?.needsRecalculation && (
                <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {privileged
                      ? t("Changes will be recalculated when you submit. You can also recalculate now to preview the total.", "El total se recalculará cuando envíes la cotización. También puedes recalcularlo ahora para revisarlo.")
                      : t("The quote is being checked. You will be asked to review it if measurements, services, or prices change.", "Se está revisando la cotización. Te pediremos que la revises si cambian las medidas, los servicios o los precios.")}
                  </span>
                </div>
              )}
              {latest?.lines.length ? (
                <InstallationQuoteTable
                  quote={latest}
                  locale={locale}
                  showInternal={admin}
                  renderAction={canManageAdditionalServices ? (line) => {
                    const removable = line.canRemove ??
                      (line.origin !== "AUTO" && (latest.status === "DRAFT" || (latest.status === "SUPERSEDED" && !latest.submittedAt)) &&
                        (privileged || line.origin === "USER_SELECTED"));
                    return removable ? (
                      <Button
                        size="icon"
                        aria-label={t("Remove service", "Quitar servicio")}
                        variant="ghost"
                        disabled={busy}
                        onClick={() => run(
                          () => deleteInstallationLine(job.id, line.id),
                          t("Service removed.", "Se quitó el servicio."),
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null;
                  } : undefined}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("No quote lines yet.", "Aún no hay servicios en la cotización.")}
                </p>
              )}

              {latest && (
                <div className="ml-auto grid max-w-sm grid-cols-2 gap-2 rounded-lg bg-slate-50 p-4 text-sm">
                  {admin && (<>
                  <span className="text-muted-foreground">{t("Base subtotal", "Subtotal base")}</span>
                  <span className="text-right">
                    {money(latest.baseSubtotal)}
                  </span>
                  <span className="text-muted-foreground">
                    {t("Profile increases", "Incrementos del perfil")} ({latest.profileNameSnapshot})
                  </span>
                  <span className="text-right">
                    {money(Number(latest.adjustedSubtotal ?? 0) - Number(latest.baseSubtotal ?? 0))}
                  </span>
                  <span className="text-muted-foreground">
                    {t("Adjusted subtotal", "Subtotal ajustado")}
                  </span>
                  <span className="text-right">
                    {money(latest.adjustedSubtotal)}
                  </span>
                  {appliedServiceMinimums.map((minimum) => (
                    <div
                      key={minimum.serviceId}
                      className="col-span-2 grid grid-cols-2 gap-2"
                    >
                      <span className="text-muted-foreground">
                        {t(`${minimum.serviceName} minimum`, `Mínimo de ${minimum.serviceName}`)} ({money(minimum.minimumCharge)})
                      </span>
                      <span className="text-right">
                        {money(minimum.adjustment)}
                      </span>
                    </div>
                  ))}
                  {Number(latest.minimumAdjustment) > 0 && (
                    <>
                      <span className="text-muted-foreground">
                        {latest.providerCostSnapshot ? t("Provider minimum adjustment", "Ajuste por el mínimo del proveedor") : t("Initial minimum adjustment", "Ajuste por el mínimo inicial")}
                      </span>
                      <span className="text-right">
                        {money(latest.minimumAdjustment)}
                      </span>
                    </>
                  )}
                  </>)}
                  {Number(latest.installationSurcharge ?? 0) > 0 && <><span className="text-muted-foreground">{t("Installation surcharge", "Recargo de instalación")}</span><span className="text-right">{money(latest.installationSurcharge)}</span></>}
                  <strong>Total</strong>
                  <strong className="text-right">{money(latest.total)}</strong>
                </div>
              )}
              {latest && <InstallationFinancialSummary quote={latest} processing={job.installationProcessingSummary} userRole={userRole} locale={locale} />}
            </CardContent>
          </Card>

          {showServiceChangeNotice && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              {t("You can request additional services or changes to existing services during the technician's remeasurement visit.", "Puedes solicitar servicios adicionales o cambios a los servicios existentes durante la visita de verificación de medidas.")}
            </div>
          )}

          {serviceChoices.length > 0 &&
            canManageAdditionalServices && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("Add additional service", "Agregar un servicio adicional")}</CardTitle>
                  <CardDescription>
                    {t("Add work outside this estimate. It is priced from the manual values below and is never linked to an estimate opening.", "Agrega trabajos adicionales a la cotización. Su precio se calcula con los valores que ingreses aquí y se registra por separado de las aberturas.")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    value={serviceId}
                    onValueChange={(value) => {
                      setServiceId(value);
                      setServiceDraft(emptyAdditionalServiceDraft());
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select additional service", "Selecciona un servicio adicional")} />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceChoices.map((service) => (
                        <SelectItem key={service.id} value={String(service.id)}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <AdditionalServiceFields
                    service={selectedService}
                    locale={locale}
                    value={serviceDraft}
                    onChange={setServiceDraft}
                  />
                  <Textarea
                    value={serviceDraft.description}
                    onChange={(event) =>
                      setServiceDraft((value) => ({
                        ...value,
                        description: event.target.value,
                      }))
                    }
                    placeholder={t("Description or field note (optional)", "Descripción o nota de la visita (opcional)")}
                  />
                  <div className="flex justify-end">
                    <Button
                      disabled={
                        busy ||
                        Boolean(
                          additionalServiceValidationError(
                            selectedService,
                            serviceDraft,
                            locale,
                          ),
                        )
                      }
                      onClick={addAdditionalService}
                    >
                      <Plus className="mr-2 h-4 w-4" /> {t("Add service", "Agregar servicio")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

          {privileged &&
            ["DRAFT", "SUPERSEDED"].includes(latest?.status ?? "") &&
            (Number(job.depositAmountSnapshot) === 0 ||
              ["MEASUREMENT_SCHEDULED", "MEASUREMENT_PENDING", "QUOTE_DRAFT"].includes(job.status)) && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("Submit final quote", "Enviar cotización final")}</CardTitle>
                  <CardDescription>
                    {pendingMeasurements.length > 0
                      ? t(`${pendingMeasurements.length} unit(s) still need confirmation.`, pendingMeasurements.length === 1 ? "Falta confirmar una unidad." : `Faltan ${pendingMeasurements.length} unidades por confirmar.`)
                      : t("Submit the completed visit. Unchanged measurements and prices keep the current quote; changes are sent for review.", "Envía la cotización al terminar la visita. Si las medidas y los precios siguen iguales, se mantiene la cotización actual. Los cambios se envían a revisión.")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={quoteNotes}
                    onChange={(event) => setQuoteNotes(event.target.value)}
                    placeholder={t("Quote notes", "Notas de la cotización")}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      disabled={busy || !latest?.needsRecalculation}
                      onClick={() =>
                        run(
                          () => recalculateInstallationQuote(job.id),
                          t("Quote recalculated and ready to submit.", "Cotización recalculada y lista para enviar."),
                        )
                      }
                    >
                      <RefreshCw className="mr-2 h-4 w-4" /> {t("Recalculate quote", "Recalcular cotización")}
                    </Button>
                    <Button
                      disabled={busy || pendingMeasurements.length > 0}
                      onClick={() =>
                        run(
                          () =>
                            submitInstallationQuote(
                              job.id,
                              quoteNotes || undefined,
                            ),
                          (result) => result.quotes[0]?.status === "APPROVED"
                            ? t("Remeasurement completed without changes. No new version or approval required.", "Las medidas se verificaron sin cambios. La cotización conserva su versión y su aprobación.")
                            : t("Changes submitted for review.", "Se enviaron los cambios a revisión."),
                        )
                      }
                    >
                      {t("Submit quote", "Enviar cotización")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

          {admin && latest?.status === "PENDING_ADMIN_APPROVAL" && (
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle>{t("Admin approval", "Aprobación del administrador")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={decisionComment}
                  onChange={(event) => setDecisionComment(event.target.value)}
                  placeholder={t("Approval or rejection comment", "Comentario sobre la aprobación o el rechazo")}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          decideInstallationQuoteAsAdmin(
                            job.id,
                            "REJECTED",
                            decisionComment || undefined,
                          ),
                        t("Quote returned to draft.", "La cotización volvió a borrador."),
                      )
                    }
                  >
                    {t("Reject", "Rechazar")}
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          decideInstallationQuoteAsAdmin(
                            job.id,
                            "APPROVED",
                            decisionComment || undefined,
                          ),
                        t("Quote sent to customer.", "Se envió la cotización al cliente."),
                      )
                    }
                  >
                    {t("Approve", "Aprobar")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {owner && latest?.status === "PENDING_CUSTOMER_APPROVAL" && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle>{t("Installation approval", "Aprobación de la instalación")}</CardTitle>
                <CardDescription>
                  {t("Review the quote above and respond without leaving this installation.", "Revisa la cotización de arriba y responde aquí.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={decisionComment}
                  onChange={(event) => setDecisionComment(event.target.value)}
                  placeholder={t("Optional response", "Respuesta opcional")}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          decideInstallationQuoteAsCustomer(
                            job.id,
                            "REJECTED",
                            decisionComment || undefined,
                          ),
                        t("Installation quote rejected.", "Cotización de instalación rechazada."),
                      )
                    }
                  >
                    {t("Reject", "Rechazar")}
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          decideInstallationQuoteAsCustomer(
                            job.id,
                            "APPROVED",
                            decisionComment || undefined,
                          ),
                        t("Installation quote approved.", "Cotización de instalación aprobada."),
                      )
                    }
                  >
                    {t("Approve", "Aprobar")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          {job.permit && (
            <Card>
              <CardHeader>
                <CardTitle>{t("Permit", "Permiso")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span>{t("Permit status", "Estado del permiso")}</span>
                  <Badge variant="outline">
                    {permitUsesPaymentPlan && ["PAYMENT_PENDING", "PAID"].includes(job.permit.status)
                      ? t("Pending", "Pendiente")
                      : installationPermitStatusLabel(job.permit.status, locale)}
                  </Badge>
                </div>
                {permitUsesPaymentPlan && privileged && (
                  <p className="text-sm text-muted-foreground">
                    {t("The permit can be submitted before or after the order is placed.", "El permiso se puede presentar antes o después de realizar la orden.")}
                  </p>
                )}
                {privileged &&
                  (permitUsesPaymentPlan || job.permit.status !== "PAYMENT_PENDING") &&
                  !permitLocked && (
                    <div className="space-y-3 rounded-lg border p-3">
                      {permitOptions.length > 0 && (
                        <div className="space-y-2">
                          <Label htmlFor="permit-next-status">{t("Update permit status", "Actualizar el estado del permiso")}</Label>
                          <Select
                            value={
                              permitStatus === job.permit.status ? "" : permitStatus
                            }
                            disabled={busy}
                            onValueChange={(value) =>
                              setPermitStatus(value as InstallationPermitStatus)
                            }
                          >
                            <SelectTrigger id="permit-next-status" aria-label={t("Permit status", "Estado del permiso")}>
                              <SelectValue placeholder={t("Select permit status", "Selecciona el estado del permiso")} />
                            </SelectTrigger>
                            <SelectContent>
                              {permitOptions.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {installationPermitStatusLabel(status, locale)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {approvingPermit && (
                        <div className="space-y-2">
                          <Label htmlFor="permit-city-fee">{t("City Fee", "Tasa municipal")}</Label>
                          <Input
                            id="permit-city-fee"
                            type="number"
                            min="0"
                            step="0.01"
                            value={cityFee}
                            disabled={busy}
                            onChange={(event) => setCityFee(event.target.value)}
                            placeholder={t("Required for approval", "Obligatoria para aprobar el permiso")}
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="permit-notes">{t("Permit notes", "Notas del permiso")}</Label>
                        <Textarea
                          id="permit-notes"
                          value={permitNotes}
                          disabled={busy}
                          onChange={(event) => setPermitNotes(event.target.value)}
                          placeholder={t("Permit notes", "Notas del permiso")}
                        />
                      </div>
                      <Button
                        className="w-full"
                        disabled={!canSavePermit}
                        onClick={() =>
                          run(
                            () =>
                              updateInstallationPermit(job.id, {
                                status: permitStatus,
                                cityFee: approvingPermit
                                  ? Number(cityFee)
                                  : undefined,
                                notes: permitNotes.trim(),
                              }),
                            t("Permit updated.", "Permiso actualizado."),
                          )
                        }
                      >
                        {t("Save permit", "Guardar permiso")}
                      </Button>
                    </div>
                  )}
                {privileged && permitLocked && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                    <p>
                      {t("Permit status and City Fee are locked because material checkout has started.", "El estado del permiso y la tasa municipal están bloqueados porque ya comenzó el pago de los materiales.")}
                    </p>
                    {job.permit.notes && (
                      <p className="mt-2 whitespace-pre-wrap text-foreground">
                        {job.permit.notes}
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-3 border-t pt-3">
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{t("Permit Fee", "Tarifa del permiso")}</span>
                    <strong>{money(job.manualDiscountSummary?.permit.total ?? job.permit.permitFeeSnapshot)}</strong>
                  </div>
                  {permitUsesPaymentPlan && (
                    <p className="text-xs text-muted-foreground">
                      {t("Included in the project payment schedule.", "Incluida en el plan de pagos del proyecto.")}
                    </p>
                  )}
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{t("City Fee", "Tasa municipal")}</span>
                    <strong>{job.permit.cityFee == null
                      ? t("Pending", "Pendiente")
                      : money(job.manualDiscountSummary?.city.total ?? job.permit.cityFee)}</strong>
                  </div>
                  {job.permit.cityFee == null && (
                    <p className="text-xs text-muted-foreground">
                      {t("The amount is entered when the permit is approved.", "El importe se indica al aprobar el permiso.")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("Appointments", "Citas")}</CardTitle>
              <CardDescription>
                {t("Remeasurement and installation schedules are tracked independently.", "La nueva medición y la instalación se programan por separado.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {job.appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="rounded-lg border p-3 text-sm"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Badge variant="secondary">
                      {installationAppointmentTypeLabel(appointment.type, locale)}
                    </Badge>
                    <Badge variant="outline">{installationAppointmentStatusLabel(appointment.status, locale)}</Badge>
                  </div>
                  <strong>
                    {new Date(appointment.startsAt).toLocaleString(locale === "es" ? "es-US" : "en-US")}
                  </strong>
                  {appointment.note && (
                    <p className="mt-2 text-muted-foreground">
                      {appointment.note}
                    </p>
                  )}
                  {appointment.responseNote && (
                    <p className="mt-1 text-muted-foreground">
                      {t("Response:", "Respuesta:")} {appointment.responseNote}
                    </p>
                  )}

                  {owner && appointment.status === "PROPOSED" && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <Textarea
                        value={appointmentResponseNotes[appointment.id] ?? ""}
                        onChange={(event) =>
                          setAppointmentResponseNotes((current) => ({
                            ...current,
                            [appointment.id]: event.target.value,
                          }))
                        }
                        placeholder={t("Optional response", "Respuesta opcional")}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 hover:text-red-800 focus-visible:border-red-400 focus-visible:ring-red-200"
                          disabled={busy}
                          onClick={() =>
                            void respondToAppointment(
                              appointment.id,
                              "REQUEST_RESCHEDULE",
                            )
                          }
                        >
                          {t("Request reschedule", "Solicitar otra fecha")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 focus-visible:border-emerald-400 focus-visible:ring-emerald-200"
                          disabled={busy}
                          onClick={() =>
                            void respondToAppointment(appointment.id, "ACCEPT")
                          }
                        >
                          {t("Accept schedule", "Aceptar la fecha")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {privileged &&
                canManageAppointmentScheduling &&
                blockingAppointment && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">
                      {blockingAppointment.status === "PROPOSED"
                        ? t("A date is already awaiting the project owner response.", "Hay una fecha propuesta pendiente de respuesta del titular del proyecto.")
                        : t("The current appointment has been accepted.", "El titular aceptó la cita actual.")}
                    </p>
                    <p className="mt-1">
                      {t("A new date can only be proposed after the project owner requests rescheduling.", "Podrás proponer otra fecha cuando el titular solicite cambiar la cita.")}
                    </p>
                  </div>
                )}
              {privileged &&
                canProposeAppointment &&
                (appointmentType !== "INSTALLATION" ||
                  deliveryOverridePaid) && (
                <>
                  <Label htmlFor="installation-appointment-start">
                    {t(
                      `${rescheduleRequested ? "New proposed" : "Proposed"} ${appointmentType === "REMEASUREMENT" ? "remeasurement" : "installation"} start`,
                      `${rescheduleRequested ? "Nueva fecha y hora" : "Fecha y hora"} de inicio para la ${appointmentType === "REMEASUREMENT" ? "nueva medición" : "instalación"}`,
                    )}
                  </Label>
                  <Input
                    id="installation-appointment-start"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(event) => setStartsAt(event.target.value)}
                  />
                  <Label htmlFor="installation-appointment-end">{t("Optional end", "Fecha y hora de fin (opcional)")}</Label>
                  <Input
                    id="installation-appointment-end"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(event) => setEndsAt(event.target.value)}
                  />
                  <Textarea
                    value={appointmentNote}
                    onChange={(event) => setAppointmentNote(event.target.value)}
                    placeholder={t("Appointment note", "Nota de la cita")}
                  />
                  <Button
                    className="w-full"
                    disabled={busy || !startsAt}
                    onClick={() =>
                      run(
                        () =>
                          proposeInstallationAppointment(job.id, {
                            type: appointmentType,
                            startsAt: new Date(startsAt).toISOString(),
                            endsAt: endsAt
                              ? new Date(endsAt).toISOString()
                              : undefined,
                            note: appointmentNote || undefined,
                          }),
                        appointmentType === "REMEASUREMENT"
                          ? t("Remeasurement date proposed.", "Se propuso una fecha para la nueva medición.")
                          : t("Installation date proposed.", "Se propuso una fecha para la instalación."),
                      )
                    }
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {t(
                      `Propose ${rescheduleRequested ? "new " : ""}${appointmentType === "REMEASUREMENT" ? "remeasurement" : "installation"} date`,
                      `Proponer ${rescheduleRequested ? "otra fecha" : "fecha"} para la ${appointmentType === "REMEASUREMENT" ? "nueva medición" : "instalación"}`,
                    )}
                  </Button>
                </>
              )}
              {privileged &&
                job.status === "SCHEDULED" &&
                orderReadyToStartInstallation && (
                  <div className="space-y-2">
                  {job.permit && job.permit.status !== "APPROVED" && <p id="installation-permit-blocked" className="text-sm text-amber-800">{t("The company-managed permit must be approved before installation can start.", "El permiso que tramita la empresa debe estar aprobado para iniciar la instalación.")}</p>}
                  <Button
                    className="w-full"
                    aria-describedby={job.permit && job.permit.status !== "APPROVED" ? "installation-permit-blocked" : undefined}
                    disabled={busy || Boolean(job.permit && job.permit.status !== "APPROVED")}
                    onClick={() =>
                      run(
                        () => startInstallation(job.id),
                        t("Installation started.", "Instalación iniciada."),
                      )
                    }
                  >
                    {t("Start installation", "Iniciar instalación")}
                  </Button>
                  </div>
                )}
              {privileged && job.status === "IN_PROGRESS" && (
                <Button
                  className="w-full"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => completeInstallation(job.id),
                      t("Installation marked Installed.", "Instalación marcada como completada."),
                    )
                  }
                >
                  {t("Mark Installed", "Marcar como instalada")}
                </Button>
              )}
            </CardContent>
          </Card>

          {privileged &&
            depositPaid > 0 &&
            installationPaid === 0 &&
            !["CANCELED", "IN_PROGRESS", "COMPLETED"].includes(job.status) && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle>{t("Cancel installation", "Cancelar instalación")}</CardTitle>
                  <CardDescription>
                    {t(
                      `The estimate or order will continue with material only. The ${money(depositPaid)} installation deposit remains non-refundable.`,
                      `La cotización o la orden seguirá solo con los materiales. El depósito de instalación de ${money(depositPaid)} no es reembolsable.`,
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={cancellationReason}
                    onChange={(event) =>
                      setCancellationReason(event.target.value)
                    }
                    placeholder={t("Cancellation reason", "Motivo de la cancelación")}
                  />
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={busy}
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    {t("Cancel installation", "Cancelar instalación")}
                  </Button>
                </CardContent>
              </Card>
            )}

          {quoteHistory.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("Version history", "Historial de versiones")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quoteHistory.map((quote) => (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <span>{t("Version", "Versión")} {quote.version}</span>
                    <span>{money(quote.total)}</span>
                    <Badge variant="outline">{installationQuoteStatusLabel(quote.status, locale)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      {admin && <PaymentScheduleView schedule={job.paymentSchedule} locale={locale} />}

      <DeleteConfirmationDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={cancelPaidInstallation}
        lang={locale}
        title={t("Cancel this installation?", "¿Cancelar esta instalación?")}
        description={t(
          `The ${money(depositPaid)} paid deposit will remain non-refundable. The estimate or order will continue with material only.`,
          `El depósito pagado de ${money(depositPaid)} no es reembolsable. La cotización o la orden seguirá solo con los materiales.`,
        )}
        cancelText={t("Cancel", "Volver")}
        confirmText={t("Cancel installation", "Cancelar instalación")}
      />

      {addedPieceEditor && (
        <PieceModal
          open
          onOpenChange={(open) => { if (!open && !busy) setAddedPieceEditor(null); }}
          locale={locale}
          title={addedPieceEditor.measurementId ? t("Edit added Piece", "Editar pieza agregada") : t("Add Piece to this revision", "Agregar pieza a esta revisión")}
          pieceKey={addedPieceEditor.key}
          initialData={revisionPieceForm(addedPieceEditor.input,
            job.estimate.user.role.name === "dealer" ? Number(job.estimate.pieces?.[0]?.dealerMarkup ?? 0) * 100 : 0)}
          index={0}
          startUnlocked
          lockQuantity={Boolean(addedPieceEditor.measurementId)}
          estimateId={job.estimateId}
          onCalculate={calculateAddedPiece}
          onSave={async (piece) => {
            setBusy(true);
            try {
              const updated = await saveInstallationAddedPiece(job.id, {
                measurementId: addedPieceEditor.measurementId, quoteId: latest?.id,
                piece: revisionPieceInput(piece, productsWithBrands),
              });
              setJob(updated);
              setAddedPieceEditor(null);
              toast.success(t("Piece saved in the same remeasurement revision. Confirm all units before submitting the quote.", "Pieza guardada en la revisión de la nueva medición. Confirma todas las unidades antes de enviar la cotización."));
            } catch (error) {
              toast.error(installationActionError(locale, error));
            } finally { setBusy(false); }
          }}
          onCancel={() => { if (!busy) setAddedPieceEditor(null); }}
          productsWithBrands={productsWithBrands} systemsWithConfigs={systemsWithConfigs}
          frameColors={frameColors} crystals={crystals} tints={tints} coatings={coatings}
          privacies={privacies} muntinPatterns={muntinPatterns} muntinTypes={muntinTypes}
          canUseCustomerPricing={job.estimate.user.role.name === "dealer"}
        />
      )}

      {replacement && (
        <PieceModal
          open
          onOpenChange={(open) => {
            if (!open) setReplacement(null);
          }}
          locale={locale}
          title={`${t("Replace", "Reemplazar")} ${replacement.piece.mark} · ${t("Unit", "Unidad")} ${replacement.measurement.unitIndex}`}
          pieceKey={`${replacement.measurement.id}-${replacement.piece.id}`}
          initialData={{
            ...pieceToForm(replacement.piece),
            mark:
              replacement.piece.qty > 1
                ? `${replacement.piece.mark}-${replacement.measurement.unitIndex}`
                : replacement.piece.mark,
            qty: 1,
          }}
          index={replacement.measurement.unitIndex - 1}
          onCalculate={calculateReplacement}
          startUnlocked
          onSave={async (piece) => {
            setBusy(true);
            try {
              const updated = await proposeInstallationMeasurementPiece(
                job.id,
                replacement.measurement.id,
                {
                  action: "REPLACE",
                  reason: replacement.reason,
                  note: replacement.note,
                  piece: pieceForPersistence(piece, productsWithBrands),
                },
              );
              setJob(updated);
              setReplacement(null);
              toast.success(
                t("Replacement added to the pending Estimate revision.", "Se agregó el reemplazo a la revisión pendiente de la cotización."),
              );
            } catch (error) {
              toast.error(installationActionError(locale, error));
            } finally {
              setBusy(false);
            }
          }}
          onCancel={() => setReplacement(null)}
          productsWithBrands={productsWithBrands}
          systemsWithConfigs={systemsWithConfigs}
          frameColors={frameColors}
          crystals={crystals}
          tints={tints}
          coatings={coatings}
          privacies={privacies}
          muntinPatterns={muntinPatterns}
          muntinTypes={muntinTypes}
          canUseCustomerPricing={job.estimate.user.role.name === "dealer"}
        />
      )}
    </div>
  );
}
