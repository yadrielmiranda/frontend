"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  addEstimatePiece,
  applyBulkPieceAttribute,
  applyGeneralDealerMarkup,
  deleteEstimatePiece,
  updateEstimateHeader,
  updateEstimatePiece,
  type ApplyBulkPieceAttributeData,
} from "@/app/api/estimates.api";
import type {
  CreatePieceData,
  EstimateWithRelations,
  UpdateEstimateHeaderData,
} from "@/lib/types";

import { Button } from "@/components/ui/button";
import { roundMoney } from "@/lib/formatters";
import { useAuth } from "@/contexts/AuthContext";

import type {
  EstimateFormProps,
  EstimateFormValues,
  PieceFormValues,
} from "./types";

import { ColorUpdateAlertDialog } from "./color-update-alert-dialog";
import { EstimateDetailsLeft } from "./estimate-details-left";
import { EstimateTotalsCard } from "./estimate-totals-card";
import { PiecesBreakdownBar } from "./pieces-breakdown-bar";
import { PiecesDealerTable } from "./pieces-dealer-table";
import { PiecesClientList } from "./pieces-client-list";
import { PieceModal } from "./piece-modal";
import { CustomerDetailsCard } from "./customer-details-card";
import { lookupZip } from "@/app/api/geo.api";
import { normalizeUSZip, isValidUSZip } from "@/lib/validators-zip";
import { canSetCustomerOnEstimate } from "@/lib/rbac";

function mapPieceMuntinToForm(
  piece: EstimateWithRelations["pieces"][number],
): PieceFormValues["muntin"] {
  const pm = piece.pieceMuntin;
  if (!pm) return null;

  return {
    idPattern: Number(pm.patternId),
    idType: pm.typeId != null ? Number(pm.typeId) : null,
    panels: Array.isArray(pm.panels)
      ? pm.panels.map((panel, index) => ({
          panelIndex: Number(panel.panelIndex),
          panelLabel:
            panel.panelLabel ??
            panel.panelCode ??
            `Panel ${Number(panel.panelIndex ?? index + 1)}`,
          panelCode: panel.panelCode ?? undefined,
          horizontalLites: Number(panel.horizontalLites || 1),
          verticalLites: Number(panel.verticalLites || 1),
        }))
      : [],
  };
}

function mapEstimatePieceToForm(
  piece: EstimateWithRelations["pieces"][number],
): PieceFormValues {
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

    leftPanels:
      piece.leftPanels === null || piece.leftPanels === undefined
        ? null
        : Number(piece.leftPanels),

    rightPanels:
      piece.rightPanels === null || piece.rightPanels === undefined
        ? null
        : Number(piece.rightPanels),

    panelCount:
      piece.panelCount === null || piece.panelCount === undefined
        ? null
        : Number(piece.panelCount),

    horizontalHeights: Array.isArray(piece.horizontalHeights)
      ? piece.horizontalHeights.map((value) => Number(value))
      : null,

    rate: Number(piece.rate) || 0,
    price: Number(piece.price) || 0,
    subtotal: Number(piece.subtotal) || 0,

    // comentario en español:
    // el backend guarda dealerMarkup como fracción decimal.
    // El formulario lo muestra como porcentaje.
    dealerMarkup: (Number(piece.dealerMarkup) || 0) * 100,

    total: Number(piece.customerSubtotal) || 0,
    netProfitD: Number(piece.netProfitD) || 0,
    customerPrice: Number(piece.customerPrice) || 0,
    customerSubtotal: Number(piece.customerSubtotal) || 0,

    dpPosPsf:
      piece.dpPosPsf === null || piece.dpPosPsf === undefined
        ? null
        : Number(piece.dpPosPsf),

    dpNegPsf:
      piece.dpNegPsf === null || piece.dpNegPsf === undefined
        ? null
        : Number(piece.dpNegPsf),

    highBottom: piece.highBottom ?? false,

    highBottomPercent:
      piece.highBottomPercent === null || piece.highBottomPercent === undefined
        ? null
        : Number(piece.highBottomPercent),

    muntin: mapPieceMuntinToForm(piece),

    idActiveOption: piece.idActiveOption ?? null,
    idPreparationOption: piece.idPreparationOption ?? null,
    idSillOption: piece.idSillOption ?? null,
    idReinforcementOption: piece.idReinforcementOption ?? null,
  };
}

const ESTIMATE_HEADER_FIELDS: Array<keyof EstimateFormValues> = [
  "name",
  "customerFirstName",
  "customerLastName",
  "customerEmail",
  "customerPhone",
  "customerStreet",
  "customerCity",
  "customerState",
  "customerPostalCode",
  "customerTaxRate",
];

export function EstimateForm({
  estimate,
  taxRate,
  productsWithBrands,
  systemsWithConfigs,
  frameColors,
  globalFrameColors,
  crystals,
  tints,
  coatings,
  muntinPatterns,
  muntinTypes,
}: EstimateFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const role = user?.role?.name ?? null;

  const canUseCustomerPricing = canSetCustomerOnEstimate(role);
  const isTaxExempt = !!user?.isTaxExempt;
  const isEditMode = !!estimate;

  const [isPieceModalOpen, setIsPieceModalOpen] = useState(false);
  const [editingPieceIndex, setEditingPieceIndex] = useState<number | null>(
    null,
  );

  const [duplicatingPieceData, setDuplicatingPieceData] =
    useState<PieceFormValues | null>(null);

  const isApplyingGeneralMarkupRef = useRef(false);
  const isDeletingPieceRef = useRef(false);

  const isApplyingBulkAttributeRef = useRef(false);

  const [isApplyingBulkAttribute, setIsApplyingBulkAttribute] = useState(false);

  const headerAutosaveReadyRef = useRef(false);

  const headerAutosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const lastSavedHeaderRef = useRef("");

  const headerSaveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const [isExiting, setIsExiting] = useState(false);

  const [showColorUpdateAlert, setShowColorUpdateAlert] = useState(false);
  const [pendingColorId, setPendingColorId] = useState<number | null>(null);
  const previousColorIdRef = useRef<number>(0);

  const [showTintUpdateAlert, setShowTintUpdateAlert] = useState(false);
  const [pendingTintId, setPendingTintId] = useState<number | null>(null);
  const previousTintIdRef = useRef<number>(0);

  const [showCoatingUpdateAlert, setShowCoatingUpdateAlert] = useState(false);
  const [pendingCoatingId, setPendingCoatingId] = useState<number | null>(null);
  const previousCoatingIdRef = useRef<number>(0);

  const {
    register,
    control,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<EstimateFormValues>({
    defaultValues: isEditMode
      ? {
          name: estimate!.name,
          customerFirstName: estimate!.customerFirstName ?? "",
          customerLastName: estimate!.customerLastName ?? "",
          customerEmail: estimate!.customerEmail ?? "",
          customerPhone: estimate!.customerPhone ?? "",
          customerStreet: estimate!.customerStreet ?? "",
          customerCity: estimate!.customerCity ?? "",
          customerState: estimate!.customerState ?? "",
          customerPostalCode: estimate!.customerPostalCode ?? "",
          generalDealerMarkup: 0,
          customerTaxRate: roundMoney(
            Number(estimate!.customerTaxRate || 0) * 100,
            2,
          ),
          pieces: estimate!.pieces.map(mapEstimatePieceToForm),
          defaultFrameColorId: 0,
          defaultTintId: 0,
          defaultCoatingId: 0,
        }
      : {
          name: "",
          customerFirstName: "",
          customerLastName: "",
          customerEmail: "",
          customerPhone: "",
          customerStreet: "",
          customerCity: "",
          customerState: "",
          customerPostalCode: "",
          generalDealerMarkup: 0,
          customerTaxRate: 0,
          pieces: [],
          defaultFrameColorId: 0,
          defaultTintId: 0,
          defaultCoatingId: 0,
        },
  });

  const zip = useWatch({ control, name: "customerPostalCode" });
  const defaultFrameColorId = useWatch({
    control,
    name: "defaultFrameColorId",
  });

  const defaultTintId = useWatch({
    control,
    name: "defaultTintId",
  });

  const defaultCoatingId = useWatch({
    control,
    name: "defaultCoatingId",
  });

  const watchedHeaderValues = useWatch({
    control,
    name: [
      "name",
      "customerFirstName",
      "customerLastName",
      "customerEmail",
      "customerPhone",
      "customerStreet",
      "customerCity",
      "customerState",
      "customerPostalCode",
      "customerTaxRate",
    ],
  });

  const headerSnapshot = useMemo(
    () =>
      JSON.stringify({
        canUseCustomerPricing,
        values: watchedHeaderValues,
      }),
    [canUseCustomerPricing, watchedHeaderValues],
  );

  useEffect(() => {
    const zip5 = normalizeUSZip(zip);
    if (!isValidUSZip(zip5)) return;

    lookupZip(zip5)
      .then((res) => {
        if (!res) return;
        setValue("customerCity", res.city, { shouldDirty: true });
        setValue("customerState", res.state, { shouldDirty: true });
      })
      .catch(() => {});
  }, [zip, setValue]);

  const buildEstimateHeaderPayload =
    useCallback((): UpdateEstimateHeaderData => {
      const values = getValues();

      const customerHeader = canUseCustomerPricing
        ? {
            customerFirstName: values.customerFirstName?.trim() || null,

            customerLastName: values.customerLastName?.trim() || null,

            customerEmail: values.customerEmail?.trim() || null,

            customerPhone: values.customerPhone?.trim() || null,

            customerStreet: values.customerStreet?.trim() || null,

            customerCity: values.customerCity?.trim() || null,

            customerState: values.customerState?.trim() || null,

            customerPostalCode: values.customerPostalCode?.trim() || null,
          }
        : {};

      return {
        name: values.name.trim(),

        customerTaxRate: canUseCustomerPricing
          ? (Number(values.customerTaxRate) || 0) / 100
          : 0,

        ...customerHeader,
      };
    }, [canUseCustomerPricing, getValues]);

  const saveEstimateHeader = useCallback(async (): Promise<boolean> => {
    if (!estimate?.id) {
      return true;
    }

    const saveTask = headerSaveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const isValid = await trigger(ESTIMATE_HEADER_FIELDS);

        if (!isValid) {
          return false;
        }

        const payload = buildEstimateHeaderPayload();
        const serializedPayload = JSON.stringify(payload);

        if (serializedPayload === lastSavedHeaderRef.current) {
          return true;
        }

        try {
          await updateEstimateHeader(estimate.id, payload);

          lastSavedHeaderRef.current = serializedPayload;

          return true;
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to save the Estimate details.",
          );

          return false;
        }
      });

    headerSaveQueueRef.current = saveTask.then(
      () => undefined,
      () => undefined,
    );

    return saveTask;
  }, [estimate?.id, trigger, buildEstimateHeaderPayload]);

  useEffect(() => {
    if (!estimate?.id) {
      return;
    }

    if (!headerAutosaveReadyRef.current) {
      headerAutosaveReadyRef.current = true;

      lastSavedHeaderRef.current = JSON.stringify(buildEstimateHeaderPayload());

      return;
    }

    if (headerAutosaveTimeoutRef.current) {
      clearTimeout(headerAutosaveTimeoutRef.current);
    }

    headerAutosaveTimeoutRef.current = setTimeout(() => {
      void saveEstimateHeader();
    }, 600);

    return () => {
      if (headerAutosaveTimeoutRef.current) {
        clearTimeout(headerAutosaveTimeoutRef.current);
      }
    };
  }, [
    estimate?.id,
    headerSnapshot,
    buildEstimateHeaderPayload,
    saveEstimateHeader,
  ]);

  const handleExit = async () => {
    if (isExiting) {
      return;
    }

    setIsExiting(true);

    if (headerAutosaveTimeoutRef.current) {
      clearTimeout(headerAutosaveTimeoutRef.current);
      headerAutosaveTimeoutRef.current = null;
    }

    const headerWasSaved = await saveEstimateHeader();

    if (!headerWasSaved) {
      setIsExiting(false);
      return;
    }

    router.push("/estimates");
  };

  const { fields, append, remove, update, replace } = useFieldArray({
    control,
    name: "pieces",
  });

  const watchedPieces = useWatch({ control, name: "pieces" });
  const customerTaxRatePercent = useWatch({ control, name: "customerTaxRate" });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const handleDefaultColorChange = (colorIdStr: string) => {
    const newColorId = Number(colorIdStr);
    const currentColorId = getValues("defaultFrameColorId");

    if (newColorId === 0) {
      setValue("defaultFrameColorId", 0, { shouldDirty: true });
      return;
    }

    if (fields.length > 0 && newColorId !== currentColorId) {
      previousColorIdRef.current = currentColorId;
      setPendingColorId(newColorId);
      setShowColorUpdateAlert(true);
    } else {
      setValue("defaultFrameColorId", newColorId, { shouldDirty: true });
    }
  };

  const handleDefaultTintChange = (tintIdStr: string) => {
    const newTintId = Number(tintIdStr);
    const currentTintId = getValues("defaultTintId");

    if (newTintId === 0) {
      setValue("defaultTintId", 0, { shouldDirty: true });
      return;
    }

    if (fields.length > 0 && newTintId !== currentTintId) {
      previousTintIdRef.current = currentTintId;
      setPendingTintId(newTintId);
      setShowTintUpdateAlert(true);
    } else {
      setValue("defaultTintId", newTintId, { shouldDirty: true });
    }
  };

  const handleDefaultCoatingChange = (coatingIdStr: string) => {
    const newCoatingId = Number(coatingIdStr);
    const currentCoatingId = getValues("defaultCoatingId");

    if (newCoatingId === 0) {
      setValue("defaultCoatingId", 0, { shouldDirty: true });
      return;
    }

    if (fields.length > 0 && newCoatingId !== currentCoatingId) {
      previousCoatingIdRef.current = currentCoatingId;
      setPendingCoatingId(newCoatingId);
      setShowCoatingUpdateAlert(true);
    } else {
      setValue("defaultCoatingId", newCoatingId, { shouldDirty: true });
    }
  };

  const handleApplyBulkPieceAttribute = async (
    changes: ApplyBulkPieceAttributeData,
    successMessage: string,
  ): Promise<boolean> => {
    if (isApplyingBulkAttributeRef.current) {
      return false;
    }

    if (!estimate?.id) {
      toast.error("The Estimate must be created before updating its pieces.");

      return false;
    }

    if (!fields.length) {
      toast.error("Add at least one Piece before applying this update.");

      return false;
    }

    isApplyingBulkAttributeRef.current = true;
    setIsApplyingBulkAttribute(true);

    try {
      // Guardamos primero cualquier cambio pendiente del encabezado,
      // especialmente Customer Sales Tax.
      if (headerAutosaveTimeoutRef.current) {
        clearTimeout(headerAutosaveTimeoutRef.current);
        headerAutosaveTimeoutRef.current = null;
      }

      const headerWasSaved = await saveEstimateHeader();

      if (!headerWasSaved) {
        return false;
      }

      const updatedEstimate = await applyBulkPieceAttribute(
        estimate.id,
        changes,
      );

      // La respuesta del backend vuelve a ser la fuente de verdad.
      replace(updatedEstimate.pieces.map(mapEstimatePieceToForm));

      toast.success(successMessage);

      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update the Pieces.",
      );

      return false;
    } finally {
      isApplyingBulkAttributeRef.current = false;
      setIsApplyingBulkAttribute(false);
    }
  };

  const updateAllPiecesColor = async (): Promise<void> => {
    if (pendingColorId === null) return;

    const applied = await handleApplyBulkPieceAttribute(
      {
        idFC: pendingColorId,
      },
      "Frame Color updated and saved for all Pieces.",
    );

    if (!applied) return;

    setValue("defaultFrameColorId", pendingColorId, {
      shouldDirty: true,
    });

    setShowColorUpdateAlert(false);
    setPendingColorId(null);
  };

  const updateAllPiecesTint = async (): Promise<void> => {
    if (pendingTintId === null) return;

    const applied = await handleApplyBulkPieceAttribute(
      {
        idTint: pendingTintId,
      },
      "Tint updated and saved for all applicable Pieces.",
    );

    if (!applied) return;

    setValue("defaultTintId", pendingTintId, {
      shouldDirty: true,
    });

    setShowTintUpdateAlert(false);
    setPendingTintId(null);
  };

  const updateAllPiecesCoating = async (): Promise<void> => {
    if (pendingCoatingId === null) return;

    const applied = await handleApplyBulkPieceAttribute(
      {
        idCoat: pendingCoatingId,
      },
      "Coating updated and saved for all applicable Pieces.",
    );

    if (!applied) return;

    setValue("defaultCoatingId", pendingCoatingId, {
      shouldDirty: true,
    });

    setShowCoatingUpdateAlert(false);
    setPendingCoatingId(null);
  };

  const setNewColorForFuturePieces = () => {
    if (pendingColorId === null) return;
    setValue("defaultFrameColorId", pendingColorId, { shouldDirty: true });
    setShowColorUpdateAlert(false);
    setPendingColorId(null);
  };

  const setNewTintForFuturePieces = () => {
    if (pendingTintId === null) return;
    setValue("defaultTintId", pendingTintId, { shouldDirty: true });
    setShowTintUpdateAlert(false);
    setPendingTintId(null);
  };

  const setNewCoatingForFuturePieces = () => {
    if (pendingCoatingId === null) return;
    setValue("defaultCoatingId", pendingCoatingId, { shouldDirty: true });
    setShowCoatingUpdateAlert(false);
    setPendingCoatingId(null);
  };

  const handleCancelColorChange = () => {
    setValue("defaultFrameColorId", previousColorIdRef.current);
    setShowColorUpdateAlert(false);
    setPendingColorId(null);
  };

  const handleCancelTintChange = () => {
    setValue("defaultTintId", previousTintIdRef.current);
    setShowTintUpdateAlert(false);
    setPendingTintId(null);
  };

  const handleCancelCoatingChange = () => {
    setValue("defaultCoatingId", previousCoatingIdRef.current);
    setShowCoatingUpdateAlert(false);
    setPendingCoatingId(null);
  };

  const handleApplyGeneralMarkup = async () => {
    if (!canUseCustomerPricing) return;
    if (isApplyingGeneralMarkupRef.current) return;

    if (!estimate?.id) {
      toast.error("The Estimate must be created before applying markup.");
      return;
    }

    const generalMarkup = Number(getValues("generalDealerMarkup"));

    const pieces = getValues("pieces");

    if (!Number.isFinite(generalMarkup) || generalMarkup < 0) {
      toast.error("General Dealer Markup must be zero or greater.");
      return;
    }

    if (!pieces.length) {
      toast.error("Add at least one piece before applying the markup.");
      return;
    }

    isApplyingGeneralMarkupRef.current = true;

    try {
      // Guardamos primero cualquier cambio pendiente del encabezado,
      // especialmente Customer Sales Tax.
      if (headerAutosaveTimeoutRef.current) {
        clearTimeout(headerAutosaveTimeoutRef.current);
        headerAutosaveTimeoutRef.current = null;
      }

      const headerWasSaved = await saveEstimateHeader();

      if (!headerWasSaved) {
        return;
      }

      const updatedEstimate = await applyGeneralDealerMarkup(
        estimate.id,
        generalMarkup,
      );

      // La respuesta del backend es la nueva fuente de verdad.
      replace(updatedEstimate.pieces.map(mapEstimatePieceToForm));

      toast.success("General Dealer Markup applied and saved successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to apply General Dealer Markup.",
      );
    } finally {
      isApplyingGeneralMarkupRef.current = false;
    }
  };

  const summary = useMemo(() => {
    if (!watchedPieces || watchedPieces.length === 0) {
      return {
        totalUnits: 0,
        subtotal: 0,
        taxAmount: 0,
        totalPayable: 0,
        dealerTotal: 0,
        dealerProfit: 0,
        dealerTaxAmount: 0,
        dealerGrandTotal: 0,
        pieceBreakdown: {} as Record<string, number>,
      };
    }

    const breakdown: Record<string, number> = {};

    const totals = watchedPieces.reduce(
      (acc, piece) => {
        if (!piece || !piece.idProd || Number(piece.idProd) <= 0) return acc;

        const qty = Number(piece.qty) || 0;

        const unitPrice = roundMoney(Number(piece.price) || 0);
        const lineFactorySubtotal = roundMoney(unitPrice * qty);

        const lineDealerTotal = roundMoney(
          Number(piece.total) || lineFactorySubtotal,
        );

        acc.totalUnits += qty;
        acc.subtotal = roundMoney(acc.subtotal + lineFactorySubtotal);
        acc.dealerTotal = roundMoney(acc.dealerTotal + lineDealerTotal);

        const productIdNumber = Number(piece.idProd);
        const product = productsWithBrands.find(
          (p) => p.id === productIdNumber,
        );
        if (product) {
          breakdown[product.name] = (breakdown[product.name] || 0) + qty;
        }

        return acc;
      },
      { totalUnits: 0, subtotal: 0, dealerTotal: 0 },
    );

    const effectiveTaxRate = isTaxExempt ? 0 : taxRate;
    const factoryTaxAmount = roundMoney(totals.subtotal * effectiveTaxRate);
    const factoryTotalPayable = roundMoney(totals.subtotal + factoryTaxAmount);

    const customerTaxRateDec = roundMoney(
      (Number(customerTaxRatePercent) || 0) / 100,
      4,
    );
    const dealerTaxAmount = roundMoney(totals.dealerTotal * customerTaxRateDec);
    const dealerGrandTotal = roundMoney(totals.dealerTotal + dealerTaxAmount);

    const dealerProfit = roundMoney(totals.dealerTotal - totals.subtotal);

    return {
      totalUnits: totals.totalUnits,
      subtotal: roundMoney(totals.subtotal),
      taxAmount: factoryTaxAmount,
      totalPayable: factoryTotalPayable,
      dealerTotal: roundMoney(totals.dealerTotal),
      dealerTaxAmount,
      dealerGrandTotal,
      dealerProfit,
      pieceBreakdown: breakdown,
    };
  }, [
    watchedPieces,
    productsWithBrands,
    taxRate,
    customerTaxRatePercent,
    isTaxExempt,
  ]);

  const mapPieceForPersistence = (piece: PieceFormValues): CreatePieceData => {
    const product = productsWithBrands.find(
      (item) => item.id === Number(piece.idProd),
    );

    const isLinearMaterial = product?.kind === "LINEAR_MATERIAL";

    return {
      mark: piece.mark ?? "",

      idProd: Number(piece.idProd),
      idBrand: Number(piece.idBrand),
      idSyst: Number(piece.idSyst),
      idConf: Number(piece.idConf),
      idFC: Number(piece.idFC),

      width: piece.width ? String(piece.width) : null,
      height: piece.height ? String(piece.height) : null,
      heightLeft: piece.heightLeft ? String(piece.heightLeft) : null,
      heightRight: piece.heightRight ? String(piece.heightRight) : null,
      legHeight: piece.legHeight ? String(piece.legHeight) : null,
      sashHeight: piece.sashHeight ? String(piece.sashHeight) : null,
      windowHeight: piece.windowHeight ? String(piece.windowHeight) : null,

      doorWidth: piece.doorWidth ? String(piece.doorWidth) : null,
      doorHeight: piece.doorHeight ? String(piece.doorHeight) : null,

      leftSideliteWidth: piece.leftSideliteWidth
        ? String(piece.leftSideliteWidth)
        : null,

      rightSideliteWidth: piece.rightSideliteWidth
        ? String(piece.rightSideliteWidth)
        : null,

      leftPanels:
        piece.leftPanels === null || piece.leftPanels === undefined
          ? null
          : Number(piece.leftPanels),

      rightPanels:
        piece.rightPanels === null || piece.rightPanels === undefined
          ? null
          : Number(piece.rightPanels),

      panelCount:
        piece.panelCount === null || piece.panelCount === undefined
          ? null
          : Number(piece.panelCount),

      horizontalHeights: Array.isArray(piece.horizontalHeights)
        ? piece.horizontalHeights.map((value) => Number(value))
        : null,

      idCryst: isLinearMaterial ? null : Number(piece.idCryst),
      idTint: isLinearMaterial ? null : Number(piece.idTint),
      privacy: isLinearMaterial ? false : Boolean(piece.privacy),
      idCoat: isLinearMaterial ? null : Number(piece.idCoat),
      screen: isLinearMaterial ? false : Boolean(piece.screen),
      highBottom: isLinearMaterial ? false : piece.highBottom === true,

      idActiveOption: isLinearMaterial
        ? null
        : piece.idActiveOption
          ? Number(piece.idActiveOption)
          : null,

      idPreparationOption: isLinearMaterial
        ? null
        : piece.idPreparationOption
          ? Number(piece.idPreparationOption)
          : null,

      idSillOption: isLinearMaterial
        ? null
        : piece.idSillOption
          ? Number(piece.idSillOption)
          : null,

      idReinforcementOption: isLinearMaterial
        ? null
        : piece.idReinforcementOption
          ? Number(piece.idReinforcementOption)
          : null,

      muntin: isLinearMaterial ? null : (piece.muntin ?? null),

      qty: Number(piece.qty),

      dealerMarkup: canUseCustomerPricing ? Number(piece.dealerMarkup || 0) : 0,
    };
  };

  const handleAddNewPiece = () => {
    setEditingPieceIndex(null);
    setDuplicatingPieceData(null);
    setIsPieceModalOpen(true);
  };

  const handleEditPiece = (index: number) => {
    setEditingPieceIndex(index);
    setIsPieceModalOpen(true);
  };

  const handleDuplicatePiece = (index: number) => {
    const pieceToDuplicate = getValues(`pieces.${index}`);

    const newPiece: PieceFormValues = {
      ...pieceToDuplicate,
      id: undefined,
      mark: "",
      rate: 0,
      price: 0,
      subtotal: 0,
      total: 0,
      netProfitD: 0,
      customerPrice: 0,
      customerSubtotal: 0,
      dpPosPsf: null,
      dpNegPsf: null,
      highBottom: pieceToDuplicate.highBottom ?? false,
      highBottomPercent: null,
    };

    setEditingPieceIndex(null);
    setDuplicatingPieceData(newPiece);
    setIsPieceModalOpen(true);

    toast.info("Piece duplicated. Please enter a new mark and recalculate.");
  };

  const handleSavePiece = async (data: PieceFormValues): Promise<void> => {
    // mantenemos el fallback local mientras exista algún uso antiguo
    // de EstimateForm sin un Estimate persistido.
    if (!estimate?.id) {
      if (editingPieceIndex !== null) {
        update(editingPieceIndex, data);
      } else {
        append(data);
      }

      setIsPieceModalOpen(false);
      setEditingPieceIndex(null);
      setDuplicatingPieceData(null);
      return;
    }

    try {
      const payload = mapPieceForPersistence(data);

      let updatedEstimate: EstimateWithRelations;

      if (editingPieceIndex !== null) {
        const currentPiece = getValues(`pieces.${editingPieceIndex}`);

        const pieceId = Number(currentPiece?.id ?? data.id ?? 0);

        if (!pieceId) {
          toast.error("The persisted Piece could not be identified.");
          return;
        }

        updatedEstimate = await updateEstimatePiece(
          estimate.id,
          pieceId,
          payload,
        );

        toast.success("Piece updated successfully.");
      } else {
        updatedEstimate = await addEstimatePiece(estimate.id, payload);

        toast.success("Piece added successfully.");
      }

      // reemplazamos las piezas locales con la fuente de verdad
      // devuelta por el backend.
      replace(updatedEstimate.pieces.map(mapEstimatePieceToForm));

      setIsPieceModalOpen(false);
      setEditingPieceIndex(null);
      setDuplicatingPieceData(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save the Piece.",
      );

      // no cerramos el modal cuando falla el backend.
    }
  };

  const handleRemovePiece = async (index: number): Promise<void> => {
    if (isDeletingPieceRef.current) return;

    const currentPiece = getValues(`pieces.${index}`);

    if (!currentPiece) {
      toast.error("The Piece could not be found.");
      return;
    }
    // fallback para cualquier flujo antiguo no persistido.
    if (!estimate?.id || !currentPiece.id) {
      remove(index);
      return;
    }

    isDeletingPieceRef.current = true;

    try {
      const updatedEstimate = await deleteEstimatePiece(
        estimate.id,
        Number(currentPiece.id),
      );

      replace(updatedEstimate.pieces.map(mapEstimatePieceToForm));

      toast.success("Piece deleted successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete the Piece.",
      );
    } finally {
      isDeletingPieceRef.current = false;
    }
  };

  const editingPieceData = useMemo<PieceFormValues>(() => {
    if (
      editingPieceIndex !== null &&
      watchedPieces &&
      watchedPieces[editingPieceIndex]
    ) {
      return getValues(`pieces.${editingPieceIndex}`);
    }

    if (duplicatingPieceData) {
      return duplicatingPieceData;
    }

    return {
      mark: "",
      idProd: 0,
      idBrand: 0,
      idSyst: 0,
      idConf: 0,
      idFC: Number(defaultFrameColorId) || 0,
      idTint: Number(defaultTintId) || 0,
      idCoat: Number(defaultCoatingId) || 0,
      width: "",
      height: "",
      heightLeft: "",
      heightRight: "",
      legHeight: "",
      sashHeight: "",
      idCryst: 0,
      privacy: false,
      screen: false,
      highBottom: false,
      highBottomPercent: null,

      idActiveOption: null,
      idPreparationOption: null,
      idSillOption: null,
      idReinforcementOption: null,

      muntin: null,
      qty: 1,
      rate: 0,
      price: 0,
      subtotal: 0,
      dealerMarkup: getValues("generalDealerMarkup") || 0,
      total: 0,
      netProfitD: 0,
      customerPrice: 0,
      customerSubtotal: 0,
      dpPosPsf: null,
      dpNegPsf: null,
    };
  }, [
    editingPieceIndex,
    duplicatingPieceData,
    getValues,
    watchedPieces,
    defaultFrameColorId,
    defaultTintId,
    defaultCoatingId,
  ]);

  const systemsForPieceModal = useMemo(() => {
    const editingSystemId =
      editingPieceIndex !== null ? Number(editingPieceData.idSyst) : null;

    const editingConfigId =
      editingPieceIndex !== null ? Number(editingPieceData.idConf) : null;

    return systemsWithConfigs
      .map((system) => {
        const selectableSysconfs = system.sysconfs.filter((sysConf) => {
          const isSelectable = sysConf.isSelectableInEstimate === true;

          // Una configuración desactivada no puede agregarse como pieza nueva,
          // pero continúa disponible al editar una pieza histórica existente.
          const isCurrentEditingConfig =
            editingSystemId === system.id &&
            editingConfigId === sysConf.idConfig;

          return isSelectable || isCurrentEditingConfig;
        });

        const selectableDefaultConfigId =
          system.defaultConfigId != null &&
          selectableSysconfs.some(
            (sysConf) => sysConf.idConfig === system.defaultConfigId,
          )
            ? system.defaultConfigId
            : (selectableSysconfs[0]?.idConfig ?? null);

        return {
          ...system,
          defaultConfigId: selectableDefaultConfigId,
          sysconfs: selectableSysconfs,
        };
      })
      .filter((system) => system.sysconfs.length > 0);
  }, [
    systemsWithConfigs,
    editingPieceIndex,
    editingPieceData.idSyst,
    editingPieceData.idConf,
  ]);

  const modalTitle =
    editingPieceIndex !== null
      ? `Edit Piece - ${editingPieceData.mark || `#${editingPieceIndex + 1}`}`
      : "Add New Piece";

  const pieceKey = editingPieceIndex ?? "new";
  const pieceIndex = editingPieceIndex ?? fields.length;

  return (
    <>
      <div className="space-y-8">
        <div className="p-6 border rounded-lg bg-slate-50">
          <h3 className="text-xl font-semibold mb-6">Estimate Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <EstimateDetailsLeft
              isEditMode={isEditMode}
              estimateNumber={estimate?.number}
              canUseCustomerPricing={canUseCustomerPricing}
              nameError={errors.name?.message}
              nameRegister={register("name", {
                required: "The name is required",
              })}
              defaultFrameColorId={getValues("defaultFrameColorId")}
              frameColors={globalFrameColors}
              onDefaultColorChange={handleDefaultColorChange}
              defaultTintId={getValues("defaultTintId")}
              defaultCoatingId={getValues("defaultCoatingId")}
              tints={tints}
              coatings={coatings}
              onDefaultTintChange={handleDefaultTintChange}
              onDefaultCoatingChange={handleDefaultCoatingChange}
              generalDealerMarkupRegister={register("generalDealerMarkup", {
                valueAsNumber: true,
                min: 0,
              })}
              onApplyGeneralMarkup={handleApplyGeneralMarkup}
              customerTaxRateRegister={register("customerTaxRate", {
                valueAsNumber: true,
                min: 0,
              })}
              onCustomerTaxBlur={(value) => {
                const v = roundMoney(Number(value) || 0, 2);
                setValue("customerTaxRate", v, { shouldDirty: true });
              }}
            />

            <EstimateTotalsCard
              canUseCustomerPricing={canUseCustomerPricing}
              taxRate={taxRate}
              isTaxExempt={isTaxExempt}
              customerTaxRatePercent={Number(customerTaxRatePercent) || 0}
              summary={summary}
              formatCurrency={formatCurrency}
            />
          </div>

          {canUseCustomerPricing && (
            <div className="mt-6">
              <CustomerDetailsCard
                register={register}
                control={control}
                errors={errors}
              />
            </div>
          )}

          <PiecesBreakdownBar
            totalUnits={summary.totalUnits}
            pieceBreakdown={summary.pieceBreakdown}
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Pieces</h3>
            <Button type="button" variant="green" onClick={handleAddNewPiece}>
              + Add Piece
            </Button>
          </div>

          {canUseCustomerPricing ? (
            <PiecesDealerTable
              fields={fields as any}
              watchedPieces={watchedPieces}
              productsWithBrands={productsWithBrands}
              systemsWithConfigs={systemsWithConfigs}
              frameColors={frameColors}
              crystals={crystals}
              tints={tints}
              coatings={coatings}
              muntinPatterns={muntinPatterns}
              muntinTypes={muntinTypes}
              formatCurrency={formatCurrency}
              onDuplicate={handleDuplicatePiece}
              onEdit={handleEditPiece}
              onRemove={handleRemovePiece}
            />
          ) : (
            <PiecesClientList
              fields={fields as any}
              watchedPieces={watchedPieces}
              productsWithBrands={productsWithBrands}
              systemsWithConfigs={systemsWithConfigs}
              frameColors={frameColors}
              crystals={crystals}
              tints={tints}
              coatings={coatings}
              muntinPatterns={muntinPatterns}
              muntinTypes={muntinTypes}
              formatCurrency={formatCurrency}
              onDuplicate={handleDuplicatePiece}
              onEdit={handleEditPiece}
              onRemove={handleRemovePiece}
            />
          )}
        </div>

        <div className="flex justify-end mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleExit()}
            disabled={isExiting}
          >
            {isExiting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}

            {isExiting ? "Saving..." : "Exit"}
          </Button>
        </div>
      </div>

      <PieceModal
        open={isPieceModalOpen}
        onOpenChange={(open) => {
          setIsPieceModalOpen(open);
          if (!open) {
            setEditingPieceIndex(null);
            setDuplicatingPieceData(null);
          }
        }}
        title={modalTitle}
        pieceKey={pieceKey}
        initialData={editingPieceData}
        index={pieceIndex}
        startUnlocked={editingPieceIndex !== null}
        onSave={handleSavePiece}
        onCancel={() => {
          setIsPieceModalOpen(false);
          setEditingPieceIndex(null);
          setDuplicatingPieceData(null);
        }}
        productsWithBrands={productsWithBrands}
        systemsWithConfigs={systemsForPieceModal}
        frameColors={frameColors}
        crystals={crystals}
        tints={tints}
        coatings={coatings}
        muntinPatterns={muntinPatterns}
        muntinTypes={muntinTypes}
        canUseCustomerPricing={canUseCustomerPricing}
      />

      <ColorUpdateAlertDialog
        open={showColorUpdateAlert}
        onOpenChange={setShowColorUpdateAlert}
        onCancel={handleCancelColorChange}
        onNewPiecesOnly={setNewColorForFuturePieces}
        onUpdateAll={updateAllPiecesColor}
        isUpdating={isApplyingBulkAttribute}
      />

      <ColorUpdateAlertDialog
        open={showTintUpdateAlert}
        onOpenChange={setShowTintUpdateAlert}
        title="Update Tint?"
        description="You have changed the default tint. Do you want to apply this new tint to all existing pieces in this estimate?"
        onCancel={handleCancelTintChange}
        onNewPiecesOnly={setNewTintForFuturePieces}
        onUpdateAll={updateAllPiecesTint}
        isUpdating={isApplyingBulkAttribute}
      />

      <ColorUpdateAlertDialog
        open={showCoatingUpdateAlert}
        onOpenChange={setShowCoatingUpdateAlert}
        title="Update Coating?"
        description="You have changed the default coating. Do you want to apply this new coating to all existing pieces in this estimate?"
        onCancel={handleCancelCoatingChange}
        onNewPiecesOnly={setNewCoatingForFuturePieces}
        onUpdateAll={updateAllPiecesCoating}
        isUpdating={isApplyingBulkAttribute}
      />
    </>
  );
}
