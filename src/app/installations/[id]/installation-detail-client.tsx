"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  InstallationMeasurement,
  InstallationPermitStatus,
  InstallationQuoteLine,
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
  addInstallationLine,
  addInstallationMeasurement,
  cancelInstallation,
  completeInstallation,
  decideInstallationQuoteAsAdmin,
  deleteInstallationLine,
  proposeInstallationAppointment,
  proposeInstallationMeasurementPiece,
  recalculateInstallationQuote,
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
import { paidBaseFor } from "@/lib/installation-flow";
import { PieceModal } from "@/components/estimates/piece-modal";
import type { PieceFormValues } from "@/components/estimates/types";
import { EstimateRevisionSummary } from "@/components/estimates/estimate-revision-summary";
import { AdditionalServiceFields } from "@/components/installations/additional-service-fields";
import {
  additionalServiceValidationError,
  additionalServiceValues,
  emptyAdditionalServiceDraft,
} from "@/lib/installation-additional-service";

const title = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const money = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0));

const numeric = (value: string | number | null | undefined) =>
  value == null ? "" : String(Number(value));

function additionalServiceLineSummary(line: InstallationQuoteLine) {
  const values: string[] = [];
  if (line.widthIn != null) values.push(`Width ${Number(line.widthIn)} in`);
  if (line.heightIn != null) {
    values.push(`Height ${Number(line.heightIn)} in`);
  }
  if (line.areaSqFt != null) {
    values.push(`Area ${Number(line.areaSqFt).toFixed(2)} sq ft`);
  }
  if (line.panelCount != null) values.push(`${line.panelCount} panels`);
  if (line.lengthIn != null) {
    values.push(`Length ${Number(line.lengthIn)} in`);
  }
  values.push(`Quantity ${line.occurrences}`);
  return values.join(" · ");
}

const CHANGE_REASONS: Array<{
  value: Exclude<EstimateRevisionChangeReason, "REMEASUREMENT">;
  label: string;
}> = [
  { value: "EGRESS", label: "Does not meet egress requirements" },
  { value: "DIMENSION_LIMITS", label: "Does not meet dimension limits" },
  { value: "STRUCTURAL_CONDITION", label: "Structural condition" },
  { value: "CUSTOMER_REQUEST", label: "Customer request" },
  { value: "OTHER", label: "Other" },
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
      piece.highBottomPercent == null
        ? null
        : Number(piece.highBottomPercent),
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
  const isLinear =
    products.find((product) => product.id === Number(piece.idProd))?.kind ===
    "LINEAR_MATERIAL";
  const text = (value: unknown) =>
    value == null || value === "" ? null : String(value);
  return {
    mark: piece.mark.trim(),
    idProd: Number(piece.idProd),
    idBrand: Number(piece.idBrand),
    idSyst: Number(piece.idSyst),
    idConf: Number(piece.idConf),
    idFC: Number(piece.idFC),
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
    idTint: isLinear ? null : Number(piece.idTint),
    idCoat: isLinear ? null : Number(piece.idCoat),
    idPrivacy: isLinear ? null : Number(piece.idPrivacy),
    screen: isLinear ? false : Boolean(piece.screen),
    highBottom: isLinear ? false : Boolean(piece.highBottom),
    idActiveOption:
      isLinear || !piece.idActiveOption
        ? null
        : Number(piece.idActiveOption),
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
    muntin: isLinear ? null : (piece.muntin ?? null),
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
    requiresLeftSideliteWidth: Boolean(
      sysConf?.requiresLeftSideliteWidth,
    ),
    requiresRightSideliteWidth: Boolean(
      sysConf?.requiresRightSideliteWidth,
    ),
    requiresLeftPanels: Boolean(sysConf?.requiresLeftPanels),
    requiresRightPanels: Boolean(sysConf?.requiresRightPanels),
    requiresPanelCount: Boolean(sysConf?.requiresPanelCount),
    requiresHorizontalHeights: Boolean(
      sysConf?.requiresHorizontalHeights,
    ),
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
): MeasurementDraft => ({
  label: measurement?.label ?? "",
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
  onSave,
  onReplace,
  onRemove,
  busy,
}: {
  measurement: InstallationMeasurement;
  piece: PieceWithRelations;
  sysConf?: SysConf;
  revisionItem?: EstimateRevisionItem;
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
  const [draft, setDraft] = useState(() => measurementDraft(measurement));
  const [reason, setReason] = useState<
    Exclude<EstimateRevisionChangeReason, "REMEASUREMENT"> | ""
  >(
    revisionItem?.reason && revisionItem.reason !== "REMEASUREMENT"
      ? revisionItem.reason
      : "",
  );
  const [reasonNote, setReasonNote] = useState(
    revisionItem?.reasonNote ?? "",
  );
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
    { key: "widthIn", label: "Width", step: "0.001", show: requirements.requiresWidth },
    { key: "heightIn", label: requirements.requiresWindowHeight ? "Open height" : requirements.requiresDoorHeight ? "Opening height" : "Height", step: "0.001", show: requirements.requiresHeight },
    { key: "heightLeftIn", label: "Height left", step: "0.001", show: requirements.requiresHeightLeft },
    { key: "heightRightIn", label: "Height right", step: "0.001", show: requirements.requiresHeightRight },
    { key: "legHeightIn", label: "Leg height", step: "0.001", show: requirements.requiresLegHeight },
    { key: "sashHeightIn", label: "Sash height", step: "0.001", show: requirements.requiresSashHeight },
    { key: "windowHeightIn", label: "Window height", step: "0.001", show: requirements.requiresWindowHeight },
    { key: "doorWidthIn", label: "Door width", step: "0.001", show: requirements.requiresDoorWidth },
    { key: "doorHeightIn", label: "Door height", step: "0.001", show: requirements.requiresDoorHeight },
    { key: "leftSideliteWidthIn", label: "Left sidelite width", step: "0.001", show: requirements.requiresLeftSideliteWidth },
    { key: "rightSideliteWidthIn", label: "Right sidelite width", step: "0.001", show: requirements.requiresRightSideliteWidth },
    { key: "leftPanels", label: "Left panels", step: "1", show: requirements.requiresLeftPanels },
    { key: "rightPanels", label: "Right panels", step: "1", show: requirements.requiresRightPanels },
    { key: "panelCount", label: "Panel count", step: "1", show: requirements.requiresPanelCount },
    { key: "lengthIn", label: "Length", step: "0.001", show: requirements.requiresLength },
  ];
  const originalSize = piece.width
    ? `${Number(piece.width)}${piece.height ? ` × ${Number(piece.height)}` : ""}`
    : "—";

  return (
    <>
    <details className="rounded-lg border bg-white" open={measurement.status === "PENDING"}>
      <summary className="cursor-pointer list-none p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="font-medium">
              {piece.mark} · {piece.prod.name} · {piece.syst.name} · {piece.conf.conf}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Unit {measurement.unitIndex} of {piece.qty} · Original {originalSize}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {revisionItem && (
              <Badge variant={revisionItem.action === "REMOVE" ? "destructive" : "outline"}>
                {title(revisionItem.action)}
              </Badge>
            )}
            <Badge variant={measurement.status === "COMPLETED" ? "default" : "secondary"}>
              {title(measurement.status)}
            </Badge>
          </div>
        </div>
      </summary>
      <div className="space-y-4 border-t p-4">
        <div className="space-y-2">
          <Label>Label</Label>
          <Input value={draft.label} onChange={(event) => setDraft((value) => ({ ...value, label: event.target.value }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {fields.filter((field) => field.show).map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs">{field.label}</Label>
              <Input type="number" min="0" step={field.step} value={draft[field.key]} onChange={(event) => setDraft((value) => ({ ...value, [field.key]: event.target.value }))} />
            </div>
          ))}
        </div>
        {requirements.requiresHorizontalHeights && (
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Horizontal heights</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setDraft((value) => ({ ...value, horizontalHeights: [...value.horizontalHeights, "18"] }))}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add height
              </Button>
            </div>
            {draft.horizontalHeights.map((height, index) => (
              <div key={index} className="flex gap-2">
                <Input type="number" min="0.001" step="0.001" value={height} onChange={(event) => setDraft((value) => ({ ...value, horizontalHeights: value.horizontalHeights.map((current, currentIndex) => currentIndex === index ? event.target.value : current) }))} />
                <Button type="button" size="icon" variant="ghost" onClick={() => setDraft((value) => ({ ...value, horizontalHeights: value.horizontalHeights.filter((_, currentIndex) => currentIndex !== index) }))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-1">
          <Label>Notes</Label>
          <Textarea value={draft.notes} onChange={(event) => setDraft((value) => ({ ...value, notes: event.target.value }))} />
        </div>
        {revisionItem?.action === "REPLACE" && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
            Replacement proposed: {revisionItem.calculatedSnapshot?.display?.productName} · {revisionItem.calculatedSnapshot?.display?.systemName} · {revisionItem.calculatedSnapshot?.display?.configName}
          </div>
        )}
        {revisionItem?.action === "REMOVE" && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            This unit is proposed for removal from the Estimate. Nothing changes until customer approval.
          </div>
        )}
        <div className="grid gap-3 rounded-md border border-amber-200 bg-amber-50/50 p-3 md:grid-cols-[240px_1fr]">
          <Select value={reason} onValueChange={(value) => setReason(value as Exclude<EstimateRevisionChangeReason, "REMEASUREMENT">)}>
            <SelectTrigger><SelectValue placeholder="Reason for replacement/removal" /></SelectTrigger>
            <SelectContent>{CHANGE_REASONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={reasonNote} onChange={(event) => setReasonNote(event.target.value)} placeholder="Reason details (required for Other)" />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => reason && onReplace(reason, reasonNote.trim() || undefined)} disabled={busy || !reason}>
            <Replace className="mr-2 h-4 w-4" /> Replace Piece
          </Button>
          <Button variant="destructive" onClick={() => setRemoveDialogOpen(true)} disabled={busy || !reason}>
            <XCircle className="mr-2 h-4 w-4" /> Unable to install
          </Button>
          <Button onClick={() => onSave(draft)} disabled={busy || !draft.label.trim()}>
            {measurement.status === "COMPLETED" ? "Update measured Piece" : "Confirm as measured"}
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
      title="Mark this unit as unable to install?"
      description={`This will propose removing ${piece.mark} · Unit ${measurement.unitIndex} from the Estimate. Nothing changes until the customer approves the revision.`}
      confirmText="Propose removal"
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
  const [job, setJob] = useState(initialJob);
  const [busy, setBusy] = useState(false);
  const [manualDraft, setManualDraft] = useState(measurementDraft());
  const [serviceId, setServiceId] = useState<string>("");
  const [serviceDraft, setServiceDraft] = useState(
    emptyAdditionalServiceDraft(),
  );
  const [quoteNotes, setQuoteNotes] = useState("");
  const [decisionComment, setDecisionComment] = useState("");
  const [permitStatus, setPermitStatus] = useState<InstallationPermitStatus>(
    job.permit?.status === "PAID" ? "SUBMITTED" : job.permit?.status ?? "SUBMITTED",
  );
  const [cityFee, setCityFee] = useState(numeric(job.permit?.cityFee));
  const [permitNotes, setPermitNotes] = useState(job.permit?.notes ?? "");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [appointmentNote, setAppointmentNote] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [replacement, setReplacement] = useState<{
    measurement: InstallationMeasurement;
    piece: PieceWithRelations;
    reason: Exclude<EstimateRevisionChangeReason, "REMEASUREMENT">;
    note?: string;
  } | null>(null);

  const privileged = userRole === "admin" || userRole === "operator";
  const admin = userRole === "admin";
  const owner = job.estimate.idUser === userId;
  const latest = job.quotes[0];
  const latestRevision = latest
    ? job.revisions?.find((revision) => revision.quoteId === latest.id)
    : job.revisions?.[0];
  const revisionItemByMeasurement = new Map(
    (latestRevision?.items ?? []).map((item) => [item.measurementId, item]),
  );
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
  const installationPaid = paidBaseFor(job, "INSTALLATION");
  const permitLocked = (job.payments ?? []).some(
    (payment) =>
      payment.type === "MATERIAL" &&
      (payment.status === "PAID" || Boolean(payment.stripeSessionId)),
  );
  const canRecordMeasurements =
    Number(job.depositAmountSnapshot) === 0 ||
    [
      "MEASUREMENT_SCHEDULED",
      "MEASUREMENT_PENDING",
      "QUOTE_DRAFT",
      "ADMIN_APPROVAL_PENDING",
      "CUSTOMER_APPROVAL_PENDING",
    ].includes(job.status);
  const showRemeasurementNotReady =
    !canRecordMeasurements &&
    [
      "REQUESTED",
      "DEPOSIT_PAYMENT_PENDING",
      "MEASUREMENT_SCHEDULING",
    ].includes(job.status);
  const appointmentType = [
    "MEASUREMENT_SCHEDULING",
    "MEASUREMENT_SCHEDULED",
  ].includes(job.status)
    ? "REMEASUREMENT"
    : "INSTALLATION";

  const run = async (action: () => Promise<InstallationJob>, success: string) => {
    setBusy(true);
    try {
      setJob(await action());
      toast.success(success);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addAdditionalService = async () => {
    const error = additionalServiceValidationError(
      selectedService,
      serviceDraft,
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
    }, "Additional service added.");
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
      toast.success("Installation canceled. The deposit remains non-refundable.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <BackLink href={returnHref} label="Back to Installations" />
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Installation · Estimate #{job.estimate.number}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.estimate.customerFirstName} {job.estimate.customerLastName} · Requested {new Date(job.requestedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="text-sm">{title(job.status)}</Badge>
          <Button variant="outline" asChild><Link href={job.estimate.order ? `/orders/${job.estimate.order.id}` : `/estimates/${job.estimateId}/edit`}>{job.estimate.order ? "Open order" : "Open estimate"}</Link></Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {privileged && showRemeasurementNotReady && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Remeasurement is not ready
                </CardTitle>
                <CardDescription>
                  Record measurements only after the deposit is paid and the
                  customer accepts the remeasurement date.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {privileged && canRecordMeasurements && (
            <Card>
              <CardHeader>
                <CardTitle>Field Measurements</CardTitle>
                <CardDescription>
                  Each physical unit is identified from its Estimate Piece. Only
                  the dimensions required by that System configuration are shown.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.measurements
                  .filter((measurement) => !measurement.isManual)
                  .map((measurement) => {
                    const piece =
                      measurement.pieceId == null
                        ? undefined
                        : pieceById.get(measurement.pieceId);
                    if (!piece) return null;
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
                        sysConf={sysConf}
                        revisionItem={revisionItemByMeasurement.get(
                          measurement.id,
                        )}
                        busy={busy}
                        onSave={(draft) =>
                          run(
                            () =>
                              updateInstallationMeasurement(
                                job.id,
                                measurement.id,
                                toMeasurementPayload(draft),
                              ),
                            "Measurement saved and Estimate revision updated.",
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
                            "Removal added to the pending Estimate revision.",
                          )
                        }
                      />
                    );
                  })}
                {job.measurements.some((measurement) => measurement.isManual) && (
                  <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    Manual installation-only openings: {job.measurements.filter((measurement) => measurement.isManual).map((measurement) => measurement.label).join(", ")}. These do not add material Pieces to the Estimate.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {privileged && canRecordMeasurements && (
            <Card>
              <CardHeader>
                <CardTitle>Add an opening not in the estimate</CardTitle>
                <CardDescription>
                  Add each physical component separately when needed, then attach
                  existing catalog services. No duplicate manual service is created.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1 sm:col-span-2"><Label>Label</Label><Input value={manualDraft.label} onChange={(event) => setManualDraft((value) => ({ ...value, label: event.target.value }))} placeholder="Existing opening / component" /></div>
                  {(["widthIn", "heightIn", "doorWidthIn", "doorHeightIn", "panelCount", "lengthIn"] as const).map((key) => (
                    <div key={key} className="space-y-1"><Label className="text-xs">{title(key.replace("In", ""))}</Label><Input type="number" min="0" step={key === "panelCount" ? "1" : "0.001"} value={manualDraft[key]} onChange={(event) => setManualDraft((value) => ({ ...value, [key]: event.target.value }))} /></div>
                  ))}
                </div>
                <Textarea value={manualDraft.notes} onChange={(event) => setManualDraft((value) => ({ ...value, notes: event.target.value }))} placeholder="Notes" />
                <div className="flex justify-end">
                  <Button disabled={busy || !manualDraft.label.trim()} onClick={() => run(async () => {
                    const result = await addInstallationMeasurement(job.id, toMeasurementPayload(manualDraft));
                    setManualDraft(measurementDraft());
                    return result;
                  }, "Manual opening added.")}><Plus className="mr-2 h-4 w-4" /> Add opening</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {latestRevision && (
            <EstimateRevisionSummary revision={latestRevision} />
          )}

          <Card className={latest?.needsRecalculation ? "border-amber-300" : undefined}>
            <CardHeader>
              <CardTitle>Quote {latest ? `v${latest.version}` : ""}</CardTitle>
              <CardDescription>
                Rates, metrics, profile, measurements, and adjustments are frozen in every version.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {latest?.needsRecalculation && (
                <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Measurements, Pieces, or services changed. The totals below
                    are from the previous calculation. Recalculate the quote
                    before submitting it.
                  </span>
                </div>
              )}
              {latest?.lines.length ? (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Service</th><th className="p-3">Origin</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Total</th><th className="p-3" /></tr></thead>
                    <tbody>
                      {latest.lines.map((line) => (
                        <tr key={line.id} className="border-t">
                          <td className="p-3">
                            <span className="font-medium">
                              {line.serviceNameSnapshot}
                            </span>
                            {line.componentLabel && (
                              <span className="block text-xs text-muted-foreground">
                                {line.componentLabel}
                              </span>
                            )}
                            {line.origin !== "AUTO" && (
                              <span className="block text-xs text-muted-foreground">
                                {additionalServiceLineSummary(line)}
                              </span>
                            )}
                            {line.description && (
                              <span className="block text-xs text-muted-foreground">
                                {line.description}
                              </span>
                            )}
                          </td>
                          <td className="p-3"><Badge variant="outline">{title(line.origin)}</Badge></td>
                          <td className="p-3 text-right">{money(line.rate)}</td>
                          <td className="p-3 text-right">{Number(line.billableQuantity).toFixed(2)} × {line.occurrences}</td>
                          <td className="p-3 text-right font-medium">{money(line.adjustedAmount)}</td>
                          <td className="p-3 text-right">
                            {line.origin !== "AUTO" && latest.status === "DRAFT" && (privileged || line.origin === "USER_SELECTED") && (
                              <Button size="icon" variant="ghost" disabled={busy} onClick={() => run(() => deleteInstallationLine(job.id, line.id), "Service removed.")}><Trash2 className="h-4 w-4" /></Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-sm text-muted-foreground">No quote lines yet.</p>}

              {latest && (
                <div className="ml-auto grid max-w-sm grid-cols-2 gap-2 rounded-lg bg-slate-50 p-4 text-sm">
                  <span className="text-muted-foreground">Base subtotal</span><span className="text-right">{money(latest.baseSubtotal)}</span>
                  <span className="text-muted-foreground">Profile ({latest.profileNameSnapshot})</span><span className="text-right">{Number(latest.profileAdjustmentPercent).toFixed(2)}%</span>
                  <span className="text-muted-foreground">Adjusted subtotal</span><span className="text-right">{money(latest.adjustedSubtotal)}</span>
                  {appliedServiceMinimums.map((minimum) => (
                    <div key={minimum.serviceId} className="col-span-2 grid grid-cols-2 gap-2">
                      <span className="text-muted-foreground">{minimum.serviceName} minimum ({money(minimum.minimumCharge)})</span>
                      <span className="text-right">{money(minimum.adjustment)}</span>
                    </div>
                  ))}
                  {Number(latest.minimumAdjustment) > 0 && <><span className="text-muted-foreground">Initial minimum adjustment</span><span className="text-right">{money(latest.minimumAdjustment)}</span></>}
                  <strong>Total</strong><strong className="text-right">{money(latest.total)}</strong>
                </div>
              )}
            </CardContent>
          </Card>

          {(serviceChoices.length > 0 && !["COMPLETED", "CANCELED"].includes(job.status)) && (
            <Card>
              <CardHeader>
                <CardTitle>Add additional service</CardTitle>
                <CardDescription>
                  Add work outside this estimate. It is priced from the manual
                  values below and is never linked to an estimate opening.
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
                    <SelectValue placeholder="Select additional service" />
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
                  placeholder="Description or field note (optional)"
                />
                <div className="flex justify-end">
                  <Button
                    disabled={
                      busy ||
                      Boolean(
                        additionalServiceValidationError(
                          selectedService,
                          serviceDraft,
                        ),
                      )
                    }
                    onClick={addAdditionalService}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add service
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {privileged &&
            latest?.status === "DRAFT" &&
            (Number(job.depositAmountSnapshot) === 0 ||
              job.status === "QUOTE_DRAFT") && (
            <Card>
              <CardHeader><CardTitle>Submit final quote</CardTitle><CardDescription>{latest.needsRecalculation ? "Pricing changes must be recalculated before submission." : "The quote is current. You can submit it directly for admin approval."}</CardDescription></CardHeader>
              <CardContent className="space-y-3"><Textarea value={quoteNotes} onChange={(event) => setQuoteNotes(event.target.value)} placeholder="Quote notes" /><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy || !latest.needsRecalculation} onClick={() => run(() => recalculateInstallationQuote(job.id), "Quote recalculated and ready to submit.")}><RefreshCw className="mr-2 h-4 w-4" /> Recalculate quote</Button><Button disabled={busy || latest.needsRecalculation} onClick={() => run(() => submitInstallationQuote(job.id, quoteNotes || undefined), "Quote submitted for admin approval.")}>Submit quote</Button></div></CardContent>
            </Card>
          )}

          {admin && latest?.status === "PENDING_ADMIN_APPROVAL" && (
            <Card className="border-amber-200"><CardHeader><CardTitle>Admin approval</CardTitle></CardHeader><CardContent className="space-y-3"><Textarea value={decisionComment} onChange={(event) => setDecisionComment(event.target.value)} placeholder="Approval or rejection comment" /><div className="flex justify-end gap-2"><Button variant="destructive" disabled={busy} onClick={() => run(() => decideInstallationQuoteAsAdmin(job.id, "REJECTED", decisionComment || undefined), "Quote returned to draft.")}>Reject</Button><Button disabled={busy} onClick={() => run(() => decideInstallationQuoteAsAdmin(job.id, "APPROVED", decisionComment || undefined), "Quote sent to customer.")}>Approve</Button></div></CardContent></Card>
          )}

          {owner && latest?.status === "PENDING_CUSTOMER_APPROVAL" && (
            <Card className="border-blue-200"><CardHeader><CardTitle>Customer approval is pending</CardTitle><CardDescription>Approval stays in the current financial record: Estimate before material payment, Order afterward.</CardDescription></CardHeader><CardContent><Button asChild className="w-full"><Link href={job.estimate.order ? `/orders/${job.estimate.order.id}` : `/estimates/${job.estimateId}/edit`}>{job.estimate.order ? "Open Order" : "Open Estimate"}</Link></Button></CardContent></Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Payment status</CardTitle><CardDescription>Read-only operational reference. Checkout stays in Estimate or Order.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {job.payments.length === 0 && <p className="text-sm text-muted-foreground">No payments created.</p>}
              {job.payments.map((payment) => (
                <div key={payment.id} className="rounded-lg border p-3 text-sm"><div className="flex justify-between gap-2"><strong>{title(payment.type)}{payment.type === "INSTALLATION" && payment.sequence > 1 ? ` · v${payment.sequence}` : ""}</strong><Badge variant={payment.status === "PAID" ? "default" : "secondary"}>{title(payment.status)}</Badge></div><div className="mt-2 flex justify-between text-muted-foreground"><span>Base {money(payment.baseAmount)}</span><span>Total {money(payment.amount)}</span></div></div>
              ))}
              {owner && <Button asChild className="w-full" variant="outline"><Link href={job.estimate.order ? `/orders/${job.estimate.order.id}` : `/estimates/${job.estimateId}/edit`}>Open financial view</Link></Button>}
            </CardContent>
          </Card>

          {job.permit && (
            <Card>
              <CardHeader><CardTitle>Permit</CardTitle><CardDescription>Permit Fee {money(job.permit.permitFeeSnapshot)} · {title(job.permit.status)}</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {job.permit.cityFee != null && <div className="flex justify-between text-sm"><span>City Fee</span><strong>{money(job.permit.cityFee)}</strong></div>}
                {privileged &&
                  job.permit.status !== "PAYMENT_PENDING" &&
                  !permitLocked && (
                    <>
                      <Select value={permitStatus} onValueChange={(value) => setPermitStatus(value as InstallationPermitStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SUBMITTED">Submitted</SelectItem><SelectItem value="CHANGES_REQUIRED">Changes required</SelectItem><SelectItem value="APPROVED">Approved</SelectItem><SelectItem value="REJECTED">Rejected</SelectItem></SelectContent></Select>
                      <Input type="number" min="0" step="0.01" value={cityFee} onChange={(event) => setCityFee(event.target.value)} placeholder="City Fee (required for approval)" />
                      <Textarea value={permitNotes} onChange={(event) => setPermitNotes(event.target.value)} placeholder="Permit notes" />
                      <Button className="w-full" disabled={busy} onClick={() => run(() => updateInstallationPermit(job.id, { status: permitStatus, cityFee: cityFee === "" ? undefined : Number(cityFee), notes: permitNotes || undefined }), "Permit updated.")}>Save permit</Button>
                    </>
                  )}
                {privileged && permitLocked && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                    <p>
                      Permit status and City Fee are locked because material
                      checkout has started.
                    </p>
                    {job.permit.notes && (
                      <p className="mt-2 whitespace-pre-wrap text-foreground">
                        {job.permit.notes}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Appointments</CardTitle><CardDescription>Remeasurement and installation schedules are tracked independently.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {job.appointments.map((appointment) => (
                <div key={appointment.id} className="rounded-lg border p-3 text-sm"><div className="mb-1 flex items-center justify-between gap-2"><Badge variant="secondary">{appointment.type === "REMEASUREMENT" ? "Remeasurement" : "Installation"}</Badge><Badge variant="outline">{title(appointment.status)}</Badge></div><strong>{new Date(appointment.startsAt).toLocaleString()}</strong>{appointment.note && <p className="mt-2 text-muted-foreground">{appointment.note}</p>}{appointment.responseNote && <p className="mt-1 text-muted-foreground">Response: {appointment.responseNote}</p>}</div>
              ))}
              {privileged && (["MEASUREMENT_SCHEDULING", "MEASUREMENT_SCHEDULED", "INSTALLATION_PAID", "SCHEDULING", "SCHEDULED"] as string[]).includes(job.status) && (
                <><Label>{appointmentType === "REMEASUREMENT" ? "Proposed remeasurement start" : "Proposed installation start"}</Label><Input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /><Label>Optional end</Label><Input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /><Textarea value={appointmentNote} onChange={(event) => setAppointmentNote(event.target.value)} placeholder="Appointment note" /><Button className="w-full" disabled={busy || !startsAt} onClick={() => run(() => proposeInstallationAppointment(job.id, { type: appointmentType, startsAt: new Date(startsAt).toISOString(), endsAt: endsAt ? new Date(endsAt).toISOString() : undefined, note: appointmentNote || undefined }), appointmentType === "REMEASUREMENT" ? "Remeasurement date proposed." : "Installation date proposed.")}><CalendarDays className="mr-2 h-4 w-4" /> Propose {appointmentType === "REMEASUREMENT" ? "remeasurement" : "installation"} date</Button></>
              )}
              {owner && job.appointments.some((appointment) => appointment.type === "INSTALLATION" && appointment.status === "PROPOSED") && job.estimate.order && (
                <Button asChild className="w-full" variant="outline"><Link href={`/orders/${job.estimate.order.id}`}>Respond from Order</Link></Button>
              )}
              {owner && job.appointments.some((appointment) => appointment.type === "REMEASUREMENT" && appointment.status === "PROPOSED") && !job.estimate.order && (
                <Button asChild className="w-full" variant="outline"><Link href={`/estimates/${job.estimateId}/edit`}>Respond from Estimate</Link></Button>
              )}
              {privileged && job.status === "SCHEDULED" && job.estimate.order?.status?.name === "Delivered" && <Button className="w-full" disabled={busy} onClick={() => run(() => startInstallation(job.id), "Installation started.")}>Start installation</Button>}
              {privileged && job.status === "IN_PROGRESS" && <Button className="w-full" disabled={busy} onClick={() => run(() => completeInstallation(job.id), "Installation marked Installed.")}>Mark Installed</Button>}
            </CardContent>
          </Card>

          {privileged && depositPaid > 0 && installationPaid === 0 && !["CANCELED", "IN_PROGRESS", "COMPLETED"].includes(job.status) && (
            <Card className="border-red-200">
              <CardHeader><CardTitle>Cancel installation</CardTitle><CardDescription>The estimate or order will continue with material only. The {money(depositPaid)} installation deposit remains non-refundable.</CardDescription></CardHeader>
              <CardContent className="space-y-3"><Textarea value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} placeholder="Cancellation reason" /><Button variant="destructive" className="w-full" disabled={busy} onClick={() => setCancelDialogOpen(true)}>Cancel installation</Button></CardContent>
            </Card>
          )}

          {job.quotes.length > 1 && (
            <Card><CardHeader><CardTitle>Version history</CardTitle></CardHeader><CardContent className="space-y-2">{job.quotes.map((quote) => <div key={quote.id} className="flex items-center justify-between rounded-md border p-3 text-sm"><span>Version {quote.version}</span><span>{money(quote.total)}</span><Badge variant="outline">{title(quote.status)}</Badge></div>)}</CardContent></Card>
          )}
        </aside>
      </div>

      <DeleteConfirmationDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={cancelPaidInstallation}
        title="Cancel this installation?"
        description={`The ${money(depositPaid)} paid deposit will remain non-refundable. The estimate or order will continue with material only.`}
        confirmText="Cancel installation"
      />

      {replacement && (
        <PieceModal
          open
          onOpenChange={(open) => {
            if (!open) setReplacement(null);
          }}
          title={`Replace ${replacement.piece.mark} · Unit ${replacement.measurement.unitIndex}`}
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
                "Replacement added to the pending Estimate revision.",
              );
            } catch (error) {
              toast.error((error as Error).message);
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
