"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  Loader2,
  Pencil,
  Calculator,
  AlertTriangle,
  ChevronDownIcon,
} from "lucide-react";

import { calculatePiece, validatePiece } from "@/app/api/estimates.api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DialogFooter } from "@/components/ui/dialog";

import type {
  ProductWithBrands,
  SystemWithConfigs,
  FrameColor,
  Crystal,
  Tint,
  Coating,
  Config,
  CalculatePiecePayload,
  PieceMuntin,
  MuntinPattern,
  MuntinType,
  ConfigMuntinLayoutItem,
} from "@/lib/types";

import { PieceDiagram } from "@/components/piece-diagram";
import {
  normalizeInchesToEighthStep,
  DimensionParseError,
  formatPsf,
} from "@/lib/dimensions";
import { roundMoney } from "@/lib/formatters";

import type { PieceFormValues } from "./types";

type NamedOption = {
  id: number;
  name: string;
};

type SystemConfigLink = {
  idSystem: number;
  idConfig: number;
  allowScreen: boolean;
  config: Config;

  defaultActiveOptionId?: number | null;
  defaultPreparationOptionId?: number | null;
  defaultSillOptionId?: number | null;
  defaultReinforcementOptionId?: number | null;

  activeOptions?: { optionId: number; option: NamedOption }[];
  preparationOptions?: { optionId: number; option: NamedOption }[];
  sillOptions?: { optionId: number; option: NamedOption }[];
  reinforcementOptions?: { optionId: number; option: NamedOption }[];
};

function buildDefaultPanelsFromLayout(
  layout: ConfigMuntinLayoutItem[] | null | undefined,
  existingPanels?: PieceMuntin["panels"] | null,
): PieceMuntin["panels"] {
  if (!Array.isArray(layout) || layout.length === 0) return [];

  return layout.map((layoutPanel) => {
    const existing = existingPanels?.find(
      (p) => p.panelIndex === layoutPanel.panelIndex,
    );

    return {
      panelIndex: layoutPanel.panelIndex,
      panelLabel: layoutPanel.panelLabel,
      panelCode: layoutPanel.panelCode,
      horizontalLites: Math.max(1, Number(existing?.horizontalLites ?? 1)),
      verticalLites: Math.max(1, Number(existing?.verticalLites ?? 1)),
    };
  });
}

function buildDefaultMuntinFromConfig(
  config: Config | null | undefined,
  fallbackPatternId: number,
  existing?: PieceMuntin | null,
): PieceMuntin | null {
  if (!config || !fallbackPatternId) return null;

  const hasLayout =
    Array.isArray(config.muntinLayout) && config.muntinLayout.length > 0;

  return {
    idPattern: existing?.idPattern ?? fallbackPatternId,
    idType: hasLayout ? (existing?.idType ?? null) : null,
    panels: buildDefaultPanelsFromLayout(config.muntinLayout, existing?.panels),
  };
}

function syncMuntinWithConfigLayout(
  existing: PieceMuntin | null | undefined,
  config: Config | null | undefined,
  fallbackPatternId: number,
): PieceMuntin | null {
  if (!config || !fallbackPatternId) return null;

  const hasLayout =
    Array.isArray(config.muntinLayout) && config.muntinLayout.length > 0;

  return {
    idPattern: existing?.idPattern || fallbackPatternId,
    idType: hasLayout ? (existing?.idType ?? null) : null,
    panels: buildDefaultPanelsFromLayout(config.muntinLayout, existing?.panels),
  };
}

export interface PieceFormProps {
  initialData: PieceFormValues;
  onSubmit: (data: PieceFormValues) => void;
  onCancel: () => void;
  index: number;

  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];
  muntinPatterns: MuntinPattern[];
  muntinTypes: MuntinType[];

  isDealer: boolean;
}

export function PieceForm({
  onSubmit,
  onCancel,
  initialData,
  index,
  ...props
}: PieceFormProps) {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<PieceFormValues>({
    defaultValues: {
      ...initialData,
      width: initialData.width ?? "",
      height: initialData.height ?? "",
      heightLeft: initialData.heightLeft ?? "",
      heightRight: initialData.heightRight ?? "",
      legHeight: initialData.legHeight ?? "",
      muntin: initialData.muntin ?? null,
      rate: initialData.rate ?? 0,
      price: initialData.price ?? 0,
      subtotal: initialData.subtotal ?? 0,
      dealerMarkup: initialData.dealerMarkup ?? 0,
      total: initialData.total ?? 0,
      netProfitD: initialData.netProfitD ?? 0,
      customerPrice: initialData.customerPrice ?? 0,
      customerSubtotal: initialData.customerSubtotal ?? 0,
      dpPosPsf: initialData.dpPosPsf ?? null,
      dpNegPsf: initialData.dpNegPsf ?? null,
    },
  });

  const [isLocked, setIsLocked] = useState(
    !!initialData.price && initialData.price > 0,
  );

  const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>(
    [],
  );

  const [hasPendingDealerMarkup, setHasPendingDealerMarkup] = useState(false);
  const [isMuntinOpen, setIsMuntinOpen] = useState(true);

  const pieceValues = useWatch({ control });
  const { idProd, idConf, width, height, price } = pieceValues;
  const currentMuntin = pieceValues.muntin ?? null;

  const { productName } = useMemo(() => {
    const product = idProd
      ? props.productsWithBrands.find((p) => p.id === Number(idProd))
      : undefined;
    return { productName: product?.name };
  }, [idProd, props.productsWithBrands]);

  const [brandId, systemId] = useWatch({
    control,
    name: ["idBrand", "idSyst"],
  });

  const availableBrands = useMemo(() => {
    if (!idProd) return [];
    const selectedProduct = props.productsWithBrands.find(
      (p) => p.id === Number(idProd),
    );
    return selectedProduct
      ? selectedProduct.brandProducts.map((bp) => bp.brand)
      : [];
  }, [idProd, props.productsWithBrands]);

  const availableSystems = useMemo(() => {
    if (!idProd || !brandId) return [];
    return props.systemsWithConfigs.filter(
      (system) =>
        system.idProduct === Number(idProd) &&
        system.idBrand === Number(brandId),
    );
  }, [idProd, brandId, props.systemsWithConfigs]);

  const selectedSystem = useMemo(() => {
    if (!systemId) return null;

    return (
      props.systemsWithConfigs.find((s) => s.id === Number(systemId)) ?? null
    );
  }, [systemId, props.systemsWithConfigs]);

  useEffect(() => {
    if (!selectedSystem) return;

    const currentCrystal = getValues("idCryst");

    // ✅ solo setear si está vacío o en 0
    if (!currentCrystal || currentCrystal === 0) {
      setValue("idCryst", Number(selectedSystem.defaultCrystalId) || 0, {
        shouldDirty: false,
      });
    }
  }, [systemId]); 

  const availableSysConfs = useMemo<SystemConfigLink[]>(() => {
    return ((selectedSystem?.sysconfs ?? []) as SystemConfigLink[]).filter(
      (sc) => !!sc?.config,
    );
  }, [selectedSystem]);

  const availableCrystals = useMemo(() => {
    return (selectedSystem?.systemCrystals ?? [])
      .map((item) => item.crystal)
      .filter((crystal): crystal is Crystal => !!crystal);
  }, [selectedSystem]);

  const availableConfigs = useMemo(() => {
    return availableSysConfs
      .map((sc) => sc.config)
      .filter((c): c is Config => !!c);
  }, [availableSysConfs]);

  const selectedConfig = useMemo(() => {
    if (!idConf) return null;
    return availableConfigs.find((c) => c.id === Number(idConf)) ?? null;
  }, [idConf, availableConfigs]);

  const hasMuntinLayout = useMemo(() => {
    return (
      Array.isArray(selectedConfig?.muntinLayout) &&
      selectedConfig.muntinLayout.length > 0
    );
  }, [selectedConfig]);

  const activeMuntinPatterns = useMemo(() => {
    const active = props.muntinPatterns.filter((p) => p.isActive);

    if (hasMuntinLayout) return active;

    return active.filter((p) => !p.requiresLites);
  }, [props.muntinPatterns, hasMuntinLayout]);

  const activeMuntinTypes = useMemo(
    () => props.muntinTypes.filter((t) => t.isActive),
    [props.muntinTypes],
  );

  const defaultMuntinPattern = useMemo(
    () => activeMuntinPatterns.find((p) => p.isDefault) ?? null,
    [activeMuntinPatterns],
  );

  const defaultFullViewPattern = useMemo(
    () =>
      props.muntinPatterns.find(
        (p) => p.isActive && !p.requiresLites && p.isDefault,
      ) ??
      props.muntinPatterns.find((p) => p.isActive && !p.requiresLites) ??
      null,
    [props.muntinPatterns],
  );

  const selectedSysConf = useMemo(() => {
    if (!idConf) return null;
    return (
      availableSysConfs.find((sc) => sc.config?.id === Number(idConf)) ?? null
    );
  }, [idConf, availableSysConfs]);

  const screenAllowed = selectedSysConf?.allowScreen ?? false;

  const availableActiveOptions = useMemo(
    () =>
      (selectedSysConf?.activeOptions ?? [])
        .map((item) => item.option)
        .filter(Boolean),
    [selectedSysConf],
  );

  const availablePreparationOptions = useMemo(
    () =>
      (selectedSysConf?.preparationOptions ?? [])
        .map((item) => item.option)
        .filter(Boolean),
    [selectedSysConf],
  );

  const availableSillOptions = useMemo(
    () =>
      (selectedSysConf?.sillOptions ?? [])
        .map((item) => item.option)
        .filter(Boolean),
    [selectedSysConf],
  );

  const availableReinforcementOptions = useMemo(
    () =>
      (selectedSysConf?.reinforcementOptions ?? [])
        .map((item) => item.option)
        .filter(Boolean),
    [selectedSysConf],
  );

  const hasOptionsSection =
    screenAllowed ||
    availableActiveOptions.length > 0 ||
    availablePreparationOptions.length > 0 ||
    availableSillOptions.length > 0 ||
    availableReinforcementOptions.length > 0;

  const selectedPattern = useMemo(() => {
    const patternId = Number(pieceValues.muntin?.idPattern || 0);
    if (!patternId) return null;
    return activeMuntinPatterns.find((p) => p.id === patternId) ?? null;
  }, [pieceValues.muntin?.idPattern, activeMuntinPatterns]);

  const patternRequiresLites = selectedPattern?.requiresLites ?? false;

  useEffect(() => {
    if (!currentMuntin) return;
    if (hasMuntinLayout) return;
    if (!defaultFullViewPattern) return;

    const currentPattern = props.muntinPatterns.find(
      (p) => p.id === Number(currentMuntin.idPattern),
    );

    if (currentPattern?.requiresLites) {
      setValue(
        "muntin",
        {
          idPattern: defaultFullViewPattern.id,
          idType: null,
          panels: [],
        },
        { shouldDirty: true },
      );
    }
  }, [
    currentMuntin,
    hasMuntinLayout,
    defaultFullViewPattern,
    props.muntinPatterns,
    setValue,
  ]);

  const { configuration } = useMemo(() => {
    return { configuration: selectedConfig?.conf };
  }, [selectedConfig]);

  const dealerMarkupField = register("dealerMarkup", {
    valueAsNumber: true,
    min: 0,
  });

  const previousConfigIdRef = useRef<number>(Number(initialData.idConf || 0));

  useEffect(() => {
    const defaultItems = [
      "item-frame",
      ...(hasOptionsSection ? ["item-options"] : []),
      "item-size",
      "item-glass",
      "item-muntin",
      "item-details",
    ];

    setActiveAccordionItems((prev) => {
      const hadResultsOpen = prev.includes("item-results");
      if (hadResultsOpen || Number(initialData.price) > 0) {
        return [...defaultItems, "item-results"];
      }
      return defaultItems;
    });
  }, [hasOptionsSection, initialData.price]);

  useEffect(() => {
    const currentConfigId = Number(idConf || 0);

    if (!currentConfigId) {
      previousConfigIdRef.current = 0;

      if (getValues("screen")) {
        setValue("screen", false, { shouldDirty: true });
      }

      setValue("muntin", null, { shouldDirty: false });
      setValue("idActiveOption", null, { shouldDirty: false });
      setValue("idPreparationOption", null, { shouldDirty: false });
      setValue("idSillOption", null, { shouldDirty: false });
      setValue("idReinforcementOption", null, { shouldDirty: false });
      return;
    }

    if (!selectedConfig || !defaultMuntinPattern?.id) return;

    if (previousConfigIdRef.current === currentConfigId) {
      if (!screenAllowed && getValues("screen")) {
        setValue("screen", false, { shouldDirty: false });
      }

      if (availableActiveOptions.length === 0 && getValues("idActiveOption")) {
        setValue("idActiveOption", null, { shouldDirty: false });
      }

      if (
        availablePreparationOptions.length === 0 &&
        getValues("idPreparationOption")
      ) {
        setValue("idPreparationOption", null, { shouldDirty: false });
      }

      if (availableSillOptions.length === 0 && getValues("idSillOption")) {
        setValue("idSillOption", null, { shouldDirty: false });
      }

      if (
        availableReinforcementOptions.length === 0 &&
        getValues("idReinforcementOption")
      ) {
        setValue("idReinforcementOption", null, { shouldDirty: false });
      }
      return;
    }

    const fallbackPatternId = hasMuntinLayout
      ? defaultMuntinPattern.id
      : (defaultFullViewPattern?.id ?? defaultMuntinPattern.id);

    const syncedMuntin = syncMuntinWithConfigLayout(
      getValues("muntin"),
      selectedConfig,
      fallbackPatternId,
    );

    setValue("muntin", syncedMuntin, { shouldDirty: false });

    previousConfigIdRef.current = currentConfigId;

    setValue("screen", screenAllowed, { shouldDirty: true });

    setValue("idActiveOption", selectedSysConf?.defaultActiveOptionId ?? null, {
      shouldDirty: true,
    });

    setValue(
      "idPreparationOption",
      selectedSysConf?.defaultPreparationOptionId ?? null,
      { shouldDirty: true },
    );

    setValue("idSillOption", selectedSysConf?.defaultSillOptionId ?? null, {
      shouldDirty: true,
    });

    setValue(
      "idReinforcementOption",
      selectedSysConf?.defaultReinforcementOptionId ?? null,
      { shouldDirty: true },
    );
  }, [
    idConf,
    selectedConfig,
    screenAllowed,
    hasMuntinLayout,
    defaultMuntinPattern?.id,
    defaultFullViewPattern?.id,
    availableActiveOptions,
    availablePreparationOptions,
    availableSillOptions,
    availableReinforcementOptions,
    selectedSysConf,
    getValues,
    setValue,
  ]);

  const handleMuntinPatternChange = (patternIdValue: string) => {
    const patternId = Number(patternIdValue);
    const pattern = activeMuntinPatterns.find((p) => p.id === patternId);

    if (!pattern) return;

    const current = getValues("muntin");

    const nextPanels =
      pattern.requiresLites && hasMuntinLayout
        ? buildDefaultPanelsFromLayout(
            selectedConfig?.muntinLayout,
            current?.panels,
          )
        : [];

    setValue(
      "muntin",
      {
        idPattern: pattern.id,
        idType:
          pattern.requiresLites && hasMuntinLayout
            ? (current?.idType ?? null)
            : null,
        panels: nextPanels,
      },
      { shouldDirty: true },
    );
  };

  const handleMuntinTypeChange = (typeIdValue: string) => {
    const typeId = Number(typeIdValue);
    const current = getValues("muntin");

    if (!current) return;

    setValue(
      "muntin",
      {
        ...current,
        idType: typeId > 0 ? typeId : null,
      },
      { shouldDirty: true },
    );
  };

  const handleMuntinPanelChange = (
    panelIndex: number,
    axis: "horizontalLites" | "verticalLites",
    value: string,
  ) => {
    const numericValue = Math.max(1, Number(value || 1));

    const current = getValues("muntin");
    if (!current) return;

    const nextPanels = current.panels.map((panel) =>
      panel.panelIndex === panelIndex
        ? {
            ...panel,
            [axis]: numericValue,
          }
        : panel,
    );

    setValue(
      "muntin",
      {
        ...current,
        panels: nextPanels,
      },
      { shouldDirty: true },
    );
  };

  const handleCalculate = async () => {
    try {
      const fieldsToValidate: (keyof PieceFormValues)[] = [
        "idProd",
        "idBrand",
        "idSyst",
        "idConf",
        "idFC",
        "idCryst",
        "idTint",
        "idCoat",
        "qty",
      ];

      if (selectedConfig?.requiresWidth) fieldsToValidate.push("width");
      if (selectedConfig?.requiresHeight) fieldsToValidate.push("height");
      if (selectedConfig?.requiresHeightLeft)
        fieldsToValidate.push("heightLeft");
      if (selectedConfig?.requiresHeightRight)
        fieldsToValidate.push("heightRight");
      if (selectedConfig?.requiresLegHeight) fieldsToValidate.push("legHeight");

      const isValid = await trigger(fieldsToValidate);

      if (!isValid) {
        toast.error("Please complete the required fields before calculating.");
        return;
      }

      const currentValues = getValues();

      if (!selectedConfig) {
        toast.error("Please select a configuration first.");
        return;
      }

      const widthNorm = selectedConfig.requiresWidth
        ? normalizeInchesToEighthStep(currentValues.width, "Width", 1)
        : undefined;

      const heightNorm = selectedConfig.requiresHeight
        ? normalizeInchesToEighthStep(currentValues.height, "Height", 1)
        : undefined;

      const heightLeftNorm = selectedConfig.requiresHeightLeft
        ? normalizeInchesToEighthStep(
            currentValues.heightLeft,
            "Height Left",
            1,
          )
        : undefined;

      const heightRightNorm = selectedConfig.requiresHeightRight
        ? normalizeInchesToEighthStep(
            currentValues.heightRight,
            "Height Right",
            1,
          )
        : undefined;

      const legHeightNorm = selectedConfig.requiresLegHeight
        ? normalizeInchesToEighthStep(currentValues.legHeight, "Leg Height", 1)
        : undefined;

      if (widthNorm !== undefined) setValue("width", String(widthNorm));
      if (heightNorm !== undefined) setValue("height", String(heightNorm));
      if (heightLeftNorm !== undefined)
        setValue("heightLeft", String(heightLeftNorm));
      if (heightRightNorm !== undefined)
        setValue("heightRight", String(heightRightNorm));
      if (legHeightNorm !== undefined)
        setValue("legHeight", String(legHeightNorm));

      const pieceDtoToSend: CalculatePiecePayload = {
        mark: currentValues.mark ?? "",
        idProd: Number(currentValues.idProd),
        idBrand: Number(currentValues.idBrand),
        idSyst: Number(currentValues.idSyst),
        idConf: Number(currentValues.idConf),
        idFC: Number(currentValues.idFC),
        width: widthNorm !== undefined ? String(widthNorm) : undefined,
        height: heightNorm !== undefined ? String(heightNorm) : undefined,
        heightLeft:
          heightLeftNorm !== undefined ? String(heightLeftNorm) : undefined,
        heightRight:
          heightRightNorm !== undefined ? String(heightRightNorm) : undefined,
        legHeight:
          legHeightNorm !== undefined ? String(legHeightNorm) : undefined,
        idCryst: Number(currentValues.idCryst),
        idTint: Number(currentValues.idTint),
        privacy: currentValues.privacy,
        idCoat: Number(currentValues.idCoat),
        screen: currentValues.screen,

        idActiveOption: currentValues.idActiveOption
          ? Number(currentValues.idActiveOption)
          : undefined,
        idPreparationOption: currentValues.idPreparationOption
          ? Number(currentValues.idPreparationOption)
          : undefined,
        idSillOption: currentValues.idSillOption
          ? Number(currentValues.idSillOption)
          : undefined,
        idReinforcementOption: currentValues.idReinforcementOption
          ? Number(currentValues.idReinforcementOption)
          : undefined,

        muntin: currentValues.muntin ?? null,
        qty: Number(currentValues.qty),
        dealerMarkup: props.isDealer
          ? Number(currentValues.dealerMarkup || 0)
          : undefined,
      };

      const precheck = await validatePiece({
        idSyst: pieceDtoToSend.idSyst,
        idConf: pieceDtoToSend.idConf,
        idCryst: pieceDtoToSend.idCryst,
        width: widthNorm ?? 0,
        height: heightNorm ?? 0,
        heightLeft: heightLeftNorm,
        heightRight: heightRightNorm,
        legHeight: legHeightNorm,
      });

      if (!precheck.ok) {
        if (precheck.reason === "NOT_RATED") {
          toast.error(
            "No hay política de dimensiones para esta combinación (System + Config + Crystal).",
          );
        } else if (precheck.reason === "OVERSIZE") {
          const belowMin = precheck.belowMinimum;
          if (belowMin) {
            const minW =
              precheck.suggestion?.minWidthIn ??
              precheck.suggestion?.maxWidthIn ??
              null;
            const minH =
              precheck.suggestion?.minHeightIn ??
              precheck.suggestion?.maxHeightIn ??
              null;
            const sW = minW != null ? `${minW}″` : "—";
            const sH = minH != null ? `${minH}″` : "—";
            toast.error(
              `Revise las dimensiones. Tamaño mínimo permitido: W=${sW}, H=${sH}.`,
            );
          } else {
            const maxW = precheck.suggestion?.maxWidthIn ?? null;
            const maxH = precheck.suggestion?.maxHeightIn ?? null;
            const sW = maxW != null ? `${maxW}″` : "—";
            const sH = maxH != null ? `${maxH}″` : "—";
            toast.error(
              `Revise las dimensiones. Tamaño máximo permitido: W=${sW}, H=${sH}.`,
            );
          }
        } else {
          toast.error("Validación de dimensiones falló.");
        }
        return;
      }

      const calculated = await calculatePiece(pieceDtoToSend);

      const unitPrice = roundMoney(Number(calculated.price) || 0);
      const lineSubtotal = roundMoney(Number(calculated.subtotal) || 0);
      const dealerProfitLine = roundMoney(Number(calculated.netProfitD) || 0);
      const customerSubtotalLine = roundMoney(
        Number(calculated.customerSubtotal) || 0,
      );
      const customerUnitPrice = roundMoney(
        Number(calculated.customerPrice) || 0,
      );

      setValue("price", unitPrice);
      setValue("subtotal", lineSubtotal);
      setValue("netProfitD", dealerProfitLine);
      setValue("customerSubtotal", customerSubtotalLine);
      setValue("customerPrice", customerUnitPrice);
      setValue("total", customerSubtotalLine);
      setValue("muntin", calculated.muntin ?? null, { shouldDirty: true });

      const dpPos =
        calculated.dpPosPsf === null || calculated.dpPosPsf === undefined
          ? null
          : Number(calculated.dpPosPsf);

      const dpNeg =
        calculated.dpNegPsf === null || calculated.dpNegPsf === undefined
          ? null
          : Number(calculated.dpNegPsf);

      setValue("dpPosPsf", dpPos);
      setValue("dpNegPsf", dpNeg);

      if (props.isDealer) {
        setValue("dealerMarkup", Number(currentValues.dealerMarkup || 0));
      }

      setIsLocked(true);
      if (!activeAccordionItems.includes("item-results")) {
        setActiveAccordionItems((prev) => [...prev, "item-results"]);
      }

      setHasPendingDealerMarkup(false);
      toast.success("Piece calculated successfully.");
    } catch (error) {
      toast.error((error as Error).message ?? "Error during calculation");
    }
  };

  const handleUnlock = () => {
    setIsLocked(false);
    setActiveAccordionItems((prev) =>
      prev.filter((item) => item !== "item-results"),
    );
  };

  const recalcDealerTotals = () => {
    if (!props.isDealer) return;

    const v = getValues();
    const qtyN = Number(v.qty) || 0;
    const markupPercent = (Number(v.dealerMarkup) || 0) / 100;

    const baseLine = roundMoney(Number(v.subtotal) || 0);

    const dealerProfitLine = roundMoney(baseLine * markupPercent);
    const customerLine = roundMoney(baseLine + dealerProfitLine);

    const customerUnit = qtyN > 0 ? roundMoney(customerLine / qtyN) : 0;

    setValue("netProfitD", dealerProfitLine, { shouldDirty: true });
    setValue("total", customerLine, { shouldDirty: true });
    setValue("customerSubtotal", customerLine, { shouldDirty: true });
    setValue("customerPrice", customerUnit, { shouldDirty: true });

    setHasPendingDealerMarkup(false);
  };

  const dpPlusText =
    pieceValues.dpPosPsf == null ? "—" : formatPsf(pieceValues.dpPosPsf, 1);
  const dpMinusText =
    pieceValues.dpNegPsf == null ? "—" : formatPsf(pieceValues.dpNegPsf, 1);

  const currentMuntinPanels = useMemo(
    () =>
      (currentMuntin?.panels ?? []).map((panel, index) => ({
        panelIndex: panel.panelIndex ?? index + 1,
        panelLabel: panel.panelLabel ?? `Panel ${index + 1}`,
        panelCode: panel.panelCode,
        horizontalLites: panel.horizontalLites ?? 1,
        verticalLites: panel.verticalLites ?? 1,
      })),
    [currentMuntin?.panels],
  );

  const fieldLabelClass = "mb-2 block text-sm font-semibold text-slate-800";

  const selectTriggerClass =
    "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm justify-between";

  const inputClass =
    "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-none";

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-8 p-1">
        <div className="min-w-0">
          <Accordion
            type="multiple"
            value={activeAccordionItems}
            onValueChange={setActiveAccordionItems}
            className="w-full"
          >
            <AccordionItem value="item-frame">
              <AccordionTrigger className="font-semibold text-base">
                Frame
              </AccordionTrigger>

              <AccordionContent>
                <div
                  className={`grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 ${
                    isLocked ? "opacity-70" : ""
                  }`}
                >
                  <div>
                    <Label className={fieldLabelClass}>Product</Label>
                    <Controller
                      name="idProd"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <Select
                          disabled={isLocked}
                          onValueChange={(v) => {
                            field.onChange(Number(v));
                            setValue("idBrand", 0);
                            setValue("idSyst", 0);
                            setValue("idConf", 0);
                          }}
                          value={String(field.value || "0")}
                        >
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {props.productsWithBrands.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.idProd && (
                      <p className="mt-1 text-xs text-red-500">
                        Product required
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className={fieldLabelClass}>Brand</Label>
                    <Controller
                      name="idBrand"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <Select
                          disabled={isLocked || !idProd}
                          onValueChange={(v) => {
                            field.onChange(Number(v));
                            setValue("idSyst", 0);
                            setValue("idConf", 0);
                          }}
                          value={String(field.value || "0")}
                        >
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableBrands.map((b) => (
                              <SelectItem key={b.id} value={String(b.id)}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.idBrand && (
                      <p className="mt-1 text-xs text-red-500">
                        Brand required
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className={fieldLabelClass}>System</Label>
                    <Controller
                      name="idSyst"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <Select
                          disabled={isLocked || !brandId}
                          onValueChange={(v) => {
                            const nextSystemId = Number(v);
                            const nextSystem = props.systemsWithConfigs.find(
                              (s) => s.id === nextSystemId,
                            );

                            field.onChange(nextSystemId);
                            setValue("idConf", 0);
                            setValue(
                              "idCryst",
                              Number(nextSystem?.defaultCrystalId) || 0,
                            );
                          }}
                          value={String(field.value || "0")}
                        >
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Select system" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSystems.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.idSyst && (
                      <p className="mt-1 text-xs text-red-500">
                        System required
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className={fieldLabelClass}>Configuration</Label>
                    <Controller
                      name="idConf"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <Select
                          disabled={isLocked || !systemId}
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={String(field.value || "0")}
                        >
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Select configuration" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableConfigs.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.conf}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.idConf && (
                      <p className="mt-1 text-xs text-red-500">
                        Config required
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className={fieldLabelClass}>Frame Color</Label>
                    <Controller
                      name="idFC"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <Select
                          disabled={isLocked}
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={String(field.value || "0")}
                        >
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Select frame color" />
                          </SelectTrigger>
                          <SelectContent>
                            {props.frameColors.map((fc) => (
                              <SelectItem key={fc.id} value={String(fc.id)}>
                                {fc.color}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.idFC && (
                      <p className="mt-1 text-xs text-red-500">
                        Color required
                      </p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {hasOptionsSection && (
              <AccordionItem value="item-options">
                <AccordionTrigger className="font-semibold text-base">
                  Options
                </AccordionTrigger>
                <AccordionContent>
                  <div
                    className={`space-y-4 pt-4 ${isLocked ? "opacity-70" : ""}`}
                  >
                    {screenAllowed && (
                      <div className="flex flex-col gap-2">
                        <Controller
                          name="screen"
                          control={control}
                          render={({ field }) => (
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`screen-${index}`}
                                checked={!!field.value}
                                onCheckedChange={(v) =>
                                  field.onChange(Boolean(v))
                                }
                                disabled={isLocked}
                                className="h-5 w-5 border-2 border-slate-400 data-[state=checked]:bg-slate-900 data-[state=checked]:text-white"
                              />
                              <Label
                                htmlFor={`screen-${index}`}
                                className="cursor-pointer select-none text-sm"
                              >
                                Screen
                              </Label>
                            </div>
                          )}
                        />

                        <p className="text-xs text-muted-foreground">
                          Screen is allowed for this configuration and is
                          selected by default.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableActiveOptions.length > 0 && (
                        <div>
                          <Label>Active</Label>
                          <Controller
                            name="idActiveOption"
                            control={control}
                            rules={{ required: "Active option is required" }}
                            render={({ field }) => (
                              <Select
                                disabled={isLocked}
                                onValueChange={(v) => field.onChange(Number(v))}
                                value={field.value ? String(field.value) : ""}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select active..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableActiveOptions.map((opt) => (
                                    <SelectItem
                                      key={opt.id}
                                      value={String(opt.id)}
                                    >
                                      {opt.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.idActiveOption && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.idActiveOption.message}
                            </p>
                          )}
                        </div>
                      )}

                      {availablePreparationOptions.length > 0 && (
                        <div>
                          <Label>Preparation</Label>
                          <Controller
                            name="idPreparationOption"
                            control={control}
                            rules={{
                              required: "Preparation option is required",
                            }}
                            render={({ field }) => (
                              <Select
                                disabled={isLocked}
                                onValueChange={(v) => field.onChange(Number(v))}
                                value={field.value ? String(field.value) : ""}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select preparation..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availablePreparationOptions.map((opt) => (
                                    <SelectItem
                                      key={opt.id}
                                      value={String(opt.id)}
                                    >
                                      {opt.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.idPreparationOption && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.idPreparationOption.message}
                            </p>
                          )}
                        </div>
                      )}

                      {availableSillOptions.length > 0 && (
                        <div>
                          <Label>Sill</Label>
                          <Controller
                            name="idSillOption"
                            control={control}
                            rules={{ required: "Sill option is required" }}
                            render={({ field }) => (
                              <Select
                                disabled={isLocked}
                                onValueChange={(v) => field.onChange(Number(v))}
                                value={field.value ? String(field.value) : ""}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select sill..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableSillOptions.map((opt) => (
                                    <SelectItem
                                      key={opt.id}
                                      value={String(opt.id)}
                                    >
                                      {opt.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.idSillOption && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.idSillOption.message}
                            </p>
                          )}
                        </div>
                      )}

                      {availableReinforcementOptions.length > 0 && (
                        <div>
                          <Label>Reinforcement</Label>
                          <Controller
                            name="idReinforcementOption"
                            control={control}
                            rules={{
                              required: "Reinforcement option is required",
                            }}
                            render={({ field }) => (
                              <Select
                                disabled={isLocked}
                                onValueChange={(v) => field.onChange(Number(v))}
                                value={field.value ? String(field.value) : ""}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select reinforcement..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableReinforcementOptions.map((opt) => (
                                    <SelectItem
                                      key={opt.id}
                                      value={String(opt.id)}
                                    >
                                      {opt.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.idReinforcementOption && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.idReinforcementOption.message}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            <AccordionItem value="item-size">
              <AccordionTrigger className="font-semibold text-base">
                Size
              </AccordionTrigger>
              <AccordionContent>
                <div className={`pt-4 ${isLocked ? "opacity-70" : ""}`}>
                  {!idConf && (
                    <p className="text-sm text-muted-foreground">
                      Select a configuration to see required dimensions.
                    </p>
                  )}

                  {idConf && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                      <div className="flex flex-wrap gap-4">
                        {selectedConfig?.requiresWidth && (
                          <div className="w-[320px]">
                            <Label className={fieldLabelClass}>
                              Width (inches)
                            </Label>
                            <Input
                              className={inputClass}
                              autoComplete="off"
                              type="text"
                              disabled={isLocked}
                              {...register("width", {
                                required: "Width is required",
                              })}
                              onBlur={(e) => {
                                const raw = e.target.value;
                                if (!raw) return;
                                try {
                                  const v = normalizeInchesToEighthStep(
                                    raw,
                                    "Width",
                                    1,
                                  );
                                  setValue("width", String(v), {
                                    shouldValidate: true,
                                  });
                                } catch (err) {
                                  if (err instanceof DimensionParseError) {
                                    toast.error(err.message);
                                  }
                                }
                              }}
                            />
                            {errors.width && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors.width.message}
                              </p>
                            )}
                          </div>
                        )}

                        {selectedConfig?.requiresHeight && (
                          <div className="w-[320px]">
                            <Label className={fieldLabelClass}>
                              Height (inches)
                            </Label>
                            <Input
                              className={inputClass}
                              autoComplete="off"
                              type="text"
                              disabled={isLocked}
                              {...register("height", {
                                required: "Height is required",
                              })}
                              onBlur={(e) => {
                                const raw = e.target.value;
                                if (!raw) return;
                                try {
                                  const v = normalizeInchesToEighthStep(
                                    raw,
                                    "Height",
                                    1,
                                  );
                                  setValue("height", String(v), {
                                    shouldValidate: true,
                                  });
                                } catch (err) {
                                  if (err instanceof DimensionParseError) {
                                    toast.error(err.message);
                                  }
                                }
                              }}
                            />
                            {errors.height && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors.height.message}
                              </p>
                            )}
                          </div>
                        )}

                        {selectedConfig?.requiresHeightLeft && (
                          <div className="w-[320px]">
                            <Label className={fieldLabelClass}>
                              Height Left (inches)
                            </Label>
                            <Input
                              className={inputClass}
                              autoComplete="off"
                              type="text"
                              disabled={isLocked}
                              {...register("heightLeft", {
                                required: "Height Left is required",
                              })}
                              onBlur={(e) => {
                                const raw = e.target.value;
                                if (!raw) return;
                                try {
                                  const v = normalizeInchesToEighthStep(
                                    raw,
                                    "Height Left",
                                    1,
                                  );
                                  setValue("heightLeft", String(v), {
                                    shouldValidate: true,
                                  });
                                } catch (err) {
                                  if (err instanceof DimensionParseError) {
                                    toast.error(err.message);
                                  }
                                }
                              }}
                            />
                            {errors.heightLeft && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors.heightLeft.message}
                              </p>
                            )}
                          </div>
                        )}

                        {selectedConfig?.requiresHeightRight && (
                          <div className="w-[320px]">
                            <Label className={fieldLabelClass}>
                              Height Right (inches)
                            </Label>
                            <Input
                              className={inputClass}
                              autoComplete="off"
                              type="text"
                              disabled={isLocked}
                              {...register("heightRight", {
                                required: "Height Right is required",
                              })}
                              onBlur={(e) => {
                                const raw = e.target.value;
                                if (!raw) return;
                                try {
                                  const v = normalizeInchesToEighthStep(
                                    raw,
                                    "Height Right",
                                    1,
                                  );
                                  setValue("heightRight", String(v), {
                                    shouldValidate: true,
                                  });
                                } catch (err) {
                                  if (err instanceof DimensionParseError) {
                                    toast.error(err.message);
                                  }
                                }
                              }}
                            />
                            {errors.heightRight && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors.heightRight.message}
                              </p>
                            )}
                          </div>
                        )}

                        {selectedConfig?.requiresLegHeight && (
                          <div className="w-[320px]">
                            <Label className={fieldLabelClass}>
                              Leg Height (inches)
                            </Label>
                            <Input
                              className={inputClass}
                              autoComplete="off"
                              type="text"
                              disabled={isLocked}
                              {...register("legHeight", {
                                required: "Leg Height is required",
                              })}
                              onBlur={(e) => {
                                const raw = e.target.value;
                                if (!raw) return;
                                try {
                                  const v = normalizeInchesToEighthStep(
                                    raw,
                                    "Leg Height",
                                    1,
                                  );
                                  setValue("legHeight", String(v), {
                                    shouldValidate: true,
                                  });
                                } catch (err) {
                                  if (err instanceof DimensionParseError) {
                                    toast.error(err.message);
                                  }
                                }
                              }}
                            />
                            {errors.legHeight && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors.legHeight.message}
                              </p>
                            )}
                          </div>
                        )}

                        {!selectedConfig?.requiresWidth &&
                          !selectedConfig?.requiresHeight &&
                          !selectedConfig?.requiresHeightLeft &&
                          !selectedConfig?.requiresHeightRight &&
                          !selectedConfig?.requiresLegHeight && (
                            <p className="text-sm text-muted-foreground">
                              This configuration does not require specific
                              dimensions for calculation.
                            </p>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-glass">
              <AccordionTrigger className="font-semibold text-base">
                Glass
              </AccordionTrigger>
              <AccordionContent>
                <div
                  className={`grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 ${
                    isLocked ? "opacity-70" : ""
                  }`}
                >
                  <div>
                    <Label className={fieldLabelClass}>Type</Label>
                    <Controller
                      name="idCryst"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <Select
                          disabled={
                            isLocked ||
                            !systemId ||
                            availableCrystals.length === 0
                          }
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={String(field.value || "0")}
                        >
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Select glass type" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCrystals.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.glass}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.idCryst && (
                      <p className="mt-1 text-xs text-red-500">Type required</p>
                    )}
                  </div>

                  <div>
                    <Label className={fieldLabelClass}>Tint</Label>
                    <Controller
                      name="idTint"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <Select
                          disabled={isLocked}
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={String(field.value || "0")}
                        >
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Select tint" />
                          </SelectTrigger>
                          <SelectContent>
                            {props.tints.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.color}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.idTint && (
                      <p className="mt-1 text-xs text-red-500">Tint required</p>
                    )}
                  </div>

                  <div>
                    <Label className={fieldLabelClass}>Coating</Label>
                    <Controller
                      name="idCoat"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <Select
                          disabled={isLocked}
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={String(field.value || "0")}
                        >
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Select coating" />
                          </SelectTrigger>
                          <SelectContent>
                            {props.coatings.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.idCoat && (
                      <p className="mt-1 text-xs text-red-500">
                        Coating required
                      </p>
                    )}
                  </div>

                  <div className="flex items-end">
                    <Controller
                      name="privacy"
                      control={control}
                      render={({ field }) => (
                        <div className="inline-flex h-11 items-center gap-3 rounded-md px-1">
                          <Checkbox
                            id={`privacy-${index}`}
                            checked={!!field.value}
                            onCheckedChange={(v) => field.onChange(Boolean(v))}
                            disabled={isLocked}
                            className="h-4 w-4 border-2 border-slate-500 data-[state=checked]:bg-slate-900 data-[state=checked]:text-white"
                          />
                          <Label
                            htmlFor={`privacy-${index}`}
                            className="cursor-pointer text-sm font-medium text-slate-800"
                          >
                            Privacy
                          </Label>
                        </div>
                      )}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <div className="border-b last:border-b-0">
              <button
                type="button"
                onClick={() => setIsMuntinOpen((prev) => !prev)}
                className="focus-visible:border-ring focus-visible:ring-ring/50 flex w-full items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-semibold outline-none hover:underline focus-visible:ring-[3px]"
              >
                <span className="text-base font-semibold">Muntin</span>

                <ChevronDownIcon
                  className={`text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 ${
                    isMuntinOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isMuntinOpen && (
                <div className="pb-4 text-sm">
                  {!selectedConfig ? (
                    <p className="text-sm text-muted-foreground pt-2">
                      Select a configuration first to configure muntin.
                    </p>
                  ) : !currentMuntin ? (
                    <p className="text-sm text-muted-foreground pt-2">
                      Muntin will be initialized automatically for this
                      configuration.
                    </p>
                  ) : (
                    <div
                      className={`space-y-4 pt-3 ${isLocked ? "opacity-70" : ""}`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <Label className={fieldLabelClass}>Pattern</Label>
                          <Select
                            disabled={isLocked}
                            value={String(currentMuntin.idPattern || "")}
                            onValueChange={handleMuntinPatternChange}
                          >
                            <SelectTrigger className={selectTriggerClass}>
                              <SelectValue placeholder="Select pattern..." />
                            </SelectTrigger>
                            <SelectContent>
                              {activeMuntinPatterns.map((pattern) => (
                                <SelectItem
                                  key={pattern.id}
                                  value={String(pattern.id)}
                                >
                                  {pattern.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {patternRequiresLites && hasMuntinLayout && (
                          <div>
                            <Label className={fieldLabelClass}>Type</Label>
                            <Select
                              disabled={isLocked}
                              value={String(currentMuntin?.idType ?? 0)}
                              onValueChange={handleMuntinTypeChange}
                            >
                              <SelectTrigger className={selectTriggerClass}>
                                <SelectValue placeholder="Select type..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">None</SelectItem>
                                {activeMuntinTypes.map((type) => (
                                  <SelectItem
                                    key={type.id}
                                    value={String(type.id)}
                                  >
                                    {type.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {!patternRequiresLites ? (
                        <div className="rounded-md border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600">
                          This pattern does not use lites. Full view will be
                          shown.
                        </div>
                      ) : !hasMuntinLayout ? (
                        <div className="rounded-md border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600">
                          This configuration supports Full View only.
                        </div>
                      ) : currentMuntinPanels.length === 0 ? (
                        <div className="rounded-md border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600">
                          This configuration does not define a muntin panel
                          layout.
                        </div>
                      ) : (
                        <div className="rounded-md border border-slate-200 overflow-hidden">
                          <div className="grid grid-cols-3 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                            <div>Panel</div>
                            <div>Horizontal</div>
                            <div>Vertical</div>
                          </div>

                          <div className="divide-y divide-slate-200 bg-white">
                            {currentMuntinPanels.map((panel) => (
                              <div
                                key={panel.panelIndex}
                                className="grid grid-cols-3 gap-4 px-4 py-3 items-center"
                              >
                                <div className="font-medium text-slate-700">
                                  {panel.panelLabel}
                                </div>

                                <Input
                                  className={inputClass}
                                  type="number"
                                  min={1}
                                  disabled={isLocked}
                                  value={panel.horizontalLites}
                                  onChange={(e) =>
                                    handleMuntinPanelChange(
                                      panel.panelIndex,
                                      "horizontalLites",
                                      e.target.value,
                                    )
                                  }
                                />

                                <Input
                                  className={inputClass}
                                  type="number"
                                  min={1}
                                  disabled={isLocked}
                                  value={panel.verticalLites}
                                  onChange={(e) =>
                                    handleMuntinPanelChange(
                                      panel.panelIndex,
                                      "verticalLites",
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <AccordionItem value="item-details">
              <AccordionTrigger className="font-semibold text-base">
                Details & Qty
              </AccordionTrigger>
              <AccordionContent>
                <div
                  className={`grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 ${
                    isLocked ? "opacity-70" : ""
                  }`}
                >
                  <div>
                    <Label>Mark</Label>
                    <Input disabled={isLocked} {...register("mark")} />
                    {errors.mark && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.mark.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      disabled={isLocked}
                      {...register("qty", {
                        required: "Qty is required",
                        valueAsNumber: true,
                        min: { value: 1, message: "Min qty is 1" },
                      })}
                    />
                    {errors.qty && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.qty.message}
                      </p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {Number(price || 0) > 0 && (
              <AccordionItem value="item-results">
                <AccordionTrigger className="font-semibold text-base text-green-700">
                  Results
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-4 bg-green-50 border-t space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-4 text-sm">
                      <div>
                        <span className="font-semibold mr-2">
                          Your Price (Unit):
                        </span>
                        <strong className="font-mono text-base">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(pieceValues.price || 0)}
                        </strong>
                      </div>
                      <div>
                        <span className="font-semibold mr-2">
                          Your Price (Line):
                        </span>
                        <strong className="font-mono text-base">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(pieceValues.subtotal || 0)}
                        </strong>
                      </div>
                    </div>

                    <div className="bg-white border rounded-md p-3">
                      <div className="text-xs font-semibold text-gray-600 mb-2">
                        Design Pressures
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">DP +:</span>
                          <span className="font-mono font-semibold">
                            {dpPlusText}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">DP -:</span>
                          <span className="font-mono font-semibold">
                            {dpMinusText}
                          </span>
                        </div>
                      </div>
                    </div>

                    {props.isDealer && (
                      <div className="border-t border-green-200 pt-4 space-y-3">
                        <h4 className="font-semibold text-gray-600">
                          Dealer Pricing
                        </h4>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`dealerMarkup-${index}`}
                              className="flex-shrink-0"
                            >
                              Dealer Markup (%)
                            </Label>
                            <Input
                              id={`dealerMarkup-${index}`}
                              type="number"
                              step="1"
                              className="w-24"
                              {...dealerMarkupField}
                              onChange={(e) => {
                                dealerMarkupField.onChange(e);
                                setHasPendingDealerMarkup(true);
                              }}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={recalcDealerTotals}
                            >
                              <Calculator className="h-4 w-4 mr-1" />
                              Apply Markup
                            </Button>
                            {hasPendingDealerMarkup && (
                              <span className="flex items-center gap-1 text-xs text-amber-600">
                                <AlertTriangle className="h-3 w-3" />
                                Changes not applied
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                          <span>Customer Price (Unit):</span>
                          <strong className="font-mono text-base">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(pieceValues.customerPrice || 0)}
                          </strong>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                          <span>Customer Subtotal (Line):</span>
                          <strong className="font-mono text-base">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(pieceValues.customerSubtotal || 0)}
                          </strong>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                          <span>Your Net Profit (Line):</span>
                          <strong className="font-mono text-base text-green-700">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(pieceValues.netProfitD || 0)}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>

        <div className="hidden xl:block">
          <div className="sticky top-8">
            <Label className="text-center block mb-2 font-semibold text-gray-600">
              Preview
            </Label>
            <div className="p-4 border rounded-lg bg-slate-50 min-h-[400px] flex items-center justify-center">
              <PieceDiagram
                width={Number(width) || 0}
                height={Number(height) || 0}
                productName={productName}
                configuration={configuration}
              />
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="mt-8">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>

        {isLocked ? (
          <Button type="button" variant="secondary" onClick={handleUnlock}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={handleCalculate}>
            <Calculator className="mr-2 h-4 w-4" /> Calculate
          </Button>
        )}

        <Button
          type="submit"
          variant="green"
          disabled={!isLocked || isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Piece
        </Button>
      </DialogFooter>
    </form>
  );
}
