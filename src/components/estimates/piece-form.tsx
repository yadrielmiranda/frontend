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
import {
  getPolicies,
  type PolicyListItem,
} from "@/app/api/dimension-policies.api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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

  dimensionMode?:
    | "STANDARD"
    | "ECO_WINDOWS_DOOR"
    | "ECO_NOVO_DOOR"
    | "WINDOW_WALL";

  requiresWidth?: boolean;
  requiresHeight?: boolean;
  requiresHeightLeft?: boolean;
  requiresHeightRight?: boolean;
  requiresLegHeight?: boolean;
  requiresSashHeight?: boolean;
  requiresDoorWidth?: boolean;
  requiresLeftSideliteWidth?: boolean;
  requiresRightSideliteWidth?: boolean;
  requiresLeftPanels?: boolean;
  requiresRightPanels?: boolean;
  requiresPanelCount?: boolean;
  requiresHorizontalHeights?: boolean;

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

  canUseCustomerPricing: boolean;
  startUnlocked?: boolean;
}

export function PieceForm({
  onSubmit,
  onCancel,
  initialData,
  index,
  startUnlocked = false,
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
      sashHeight: initialData.sashHeight ?? "",
      doorWidth: initialData.doorWidth ?? "",
      leftSideliteWidth: initialData.leftSideliteWidth ?? "",
      rightSideliteWidth: initialData.rightSideliteWidth ?? "",
      leftPanels: initialData.leftPanels ?? null,
      rightPanels: initialData.rightPanels ?? null,
      panelCount: initialData.panelCount ?? null,
      horizontalHeights: initialData.horizontalHeights ?? null,
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
      highBottom: initialData.highBottom ?? false,
      highBottomPercent: initialData.highBottomPercent ?? null,
    },
  });

  const [isLocked, setIsLocked] = useState(
    startUnlocked ? false : !!initialData.price && initialData.price > 0,
  );

  const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>(
    [],
  );

  const [hasPendingDealerMarkup, setHasPendingDealerMarkup] = useState(false);
  const [isMuntinOpen, setIsMuntinOpen] = useState(true);

  const [dimensionPolicies, setDimensionPolicies] = useState<PolicyListItem[]>(
    [],
  );
  const [isLoadingDimensionPolicies, setIsLoadingDimensionPolicies] =
    useState(false);

  const pieceValues = useWatch({ control });
  const { idProd, idConf, width, height, price } = pieceValues;
  const currentMuntin = pieceValues.muntin ?? null;

  const { productName, selectedProduct } = useMemo(() => {
    const product = idProd
      ? props.productsWithBrands.find((p) => p.id === Number(idProd))
      : undefined;

    return {
      productName: product?.name,
      selectedProduct: product ?? null,
    };
  }, [idProd, props.productsWithBrands]);

  const isLinearMaterial = selectedProduct?.kind === "LINEAR_MATERIAL";

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
        system.isActive === true &&
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

  const availableFrameColors = useMemo(() => {
    return (selectedSystem?.systemFrameColors ?? [])
      .map((item) => item.frameColor)
      .filter(Boolean);
  }, [selectedSystem]);

  useEffect(() => {
    if (!selectedSystem) return;
    if (isLinearMaterial) return;

    const currentCrystal = getValues("idCryst");

    // solo setear si está vacío o en 0
    if (!currentCrystal || currentCrystal === 0) {
      setValue("idCryst", Number(selectedSystem.defaultCrystalId) || 0, {
        shouldDirty: false,
      });
    }
  }, [systemId, selectedSystem, isLinearMaterial, getValues, setValue]);

  const availableSysConfs = useMemo<SystemConfigLink[]>(() => {
    return ((selectedSystem?.sysconfs ?? []) as SystemConfigLink[]).filter(
      (sc) => !!sc?.config,
    );
  }, [selectedSystem]);

  const systemCrystalOptions = useMemo(() => {
    return (selectedSystem?.systemCrystals ?? [])
      .map((item) => item.crystal)
      .filter((crystal): crystal is Crystal => !!crystal);
  }, [selectedSystem]);

  const availableConfigs = useMemo(() => {
    return availableSysConfs
      .map((sc) => sc.config)
      .filter((c): c is Config => Boolean(c) && c.isActive === true);
  }, [availableSysConfs]);

  const groupedConfigs = useMemo(() => {
    const uncategorized: Config[] = [];
    const groups = new Map<
      string,
      {
        key: string;
        name: string;
        sortOrder: number;
        configs: Config[];
      }
    >();

    for (const config of availableConfigs) {
      const category = config.category;

      if (!category?.id || !category.name) {
        uncategorized.push(config);
        continue;
      }

      const key = String(category.id);

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          name: category.name,
          sortOrder: Number(category.sortOrder ?? 0),
          configs: [],
        });
      }

      groups.get(key)!.configs.push(config);
    }

    const sortConfigs = (items: Config[]) =>
      [...items].sort((a, b) => a.conf.localeCompare(b.conf));

    return {
      hasCategories: groups.size > 0,
      uncategorized: sortConfigs(uncategorized),
      groups: Array.from(groups.values())
        .map((group) => ({
          ...group,
          configs: sortConfigs(group.configs),
        }))
        .sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return a.name.localeCompare(b.name);
        }),
    };
  }, [availableConfigs]);

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

  const defaultMuntinType = useMemo(
    () =>
      activeMuntinTypes.find((t) => t.isDefault) ??
      activeMuntinTypes[0] ??
      null,
    [activeMuntinTypes],
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

  const dimensionMode = selectedSysConf?.dimensionMode ?? "STANDARD";
  const isStandardDimensionMode = dimensionMode === "STANDARD";

  const dimensionRequirements = useMemo(() => {
    if (isLinearMaterial) {
      return {
        requiresWidth: !!selectedSysConf?.requiresWidth,
        requiresHeight: false,
        requiresHeightLeft: false,
        requiresHeightRight: false,
        requiresLegHeight: false,
        requiresSashHeight: false,

        requiresDoorWidth: false,
        requiresLeftSideliteWidth: false,
        requiresRightSideliteWidth: false,
        requiresLeftPanels: false,
        requiresRightPanels: false,
        requiresPanelCount: false,
        requiresHorizontalHeights: false,
      };
    }

    if (isStandardDimensionMode) {
      return {
        requiresWidth: !!selectedConfig?.requiresWidth,
        requiresHeight: !!selectedConfig?.requiresHeight,
        requiresHeightLeft: !!selectedConfig?.requiresHeightLeft,
        requiresHeightRight: !!selectedConfig?.requiresHeightRight,
        requiresLegHeight: !!selectedConfig?.requiresLegHeight,
        requiresSashHeight: !!selectedConfig?.requiresSashHeight,

        requiresDoorWidth: false,
        requiresLeftSideliteWidth: false,
        requiresRightSideliteWidth: false,
        requiresLeftPanels: false,
        requiresRightPanels: false,
        requiresPanelCount: false,
        requiresHorizontalHeights: false,
      };
    }

    return {
      requiresWidth: !!selectedSysConf?.requiresWidth,
      requiresHeight: !!selectedSysConf?.requiresHeight,
      requiresHeightLeft: !!selectedSysConf?.requiresHeightLeft,
      requiresHeightRight: !!selectedSysConf?.requiresHeightRight,
      requiresLegHeight: !!selectedSysConf?.requiresLegHeight,
      requiresSashHeight: false,

      requiresDoorWidth: !!selectedSysConf?.requiresDoorWidth,
      requiresLeftSideliteWidth: !!selectedSysConf?.requiresLeftSideliteWidth,
      requiresRightSideliteWidth: !!selectedSysConf?.requiresRightSideliteWidth,
      requiresLeftPanels: !!selectedSysConf?.requiresLeftPanels,
      requiresRightPanels: !!selectedSysConf?.requiresRightPanels,
      requiresPanelCount: !!selectedSysConf?.requiresPanelCount,
      requiresHorizontalHeights: !!selectedSysConf?.requiresHorizontalHeights,
    };
  }, [
    isStandardDimensionMode,
    selectedConfig,
    selectedSysConf,
    isLinearMaterial,
  ]);

  const screenAllowed = isLinearMaterial
    ? false
    : (selectedSysConf?.allowScreen ?? false);

  const highBottomAllowed = isLinearMaterial
    ? false
    : selectedSystem?.allowHighBottom === true;
  const requiresSashHeight = dimensionRequirements.requiresSashHeight === true;

  useEffect(() => {
    if (!requiresSashHeight && getValues("sashHeight")) {
      setValue("sashHeight", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [requiresSashHeight, getValues, setValue]);

  useEffect(() => {
    if (!highBottomAllowed) {
      if (getValues("highBottom")) {
        setValue("highBottom", false, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      if (getValues("highBottomPercent") != null) {
        setValue("highBottomPercent", null, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    }
  }, [highBottomAllowed, getValues, setValue]);

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

  const reinforcementRequired = availableReinforcementOptions.length > 0;

  const selectedReinforcementOptionId =
    Number(pieceValues.idReinforcementOption || 0) || null;

  const dimensionPolicyReinforcementId = reinforcementRequired
    ? selectedReinforcementOptionId
    : null;

  useEffect(() => {
    if (isLinearMaterial) {
      setDimensionPolicies([]);
      setIsLoadingDimensionPolicies(false);
      return;
    }

    const idSystem = Number(systemId || 0);
    const idConfig = Number(idConf || 0);

    if (!idSystem || !idConfig) {
      setDimensionPolicies([]);
      return;
    }

    let cancelled = false;

    async function loadPolicies() {
      try {
        setIsLoadingDimensionPolicies(true);

        const policies = await getPolicies({
          idSystem,
          idConfig,
          activeOnly: true,
        });

        if (!cancelled) {
          setDimensionPolicies(policies);
        }
      } catch (error) {
        if (!cancelled) {
          setDimensionPolicies([]);
          toast.error("Failed to load rated glass options.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDimensionPolicies(false);
        }
      }
    }

    loadPolicies();

    return () => {
      cancelled = true;
    };
  }, [systemId, idConf, isLinearMaterial]);

  const allowedCrystalIds = useMemo(() => {
    return new Set(
      dimensionPolicies
        .filter(
          (policy) =>
            (policy.idReinforcementOption ?? null) ===
            dimensionPolicyReinforcementId,
        )
        .map((policy) => policy.idCrystal),
    );
  }, [dimensionPolicies, dimensionPolicyReinforcementId]);

  const availableCrystals = useMemo(() => {
    if (isLinearMaterial) {
      return [];
    }

    if (!systemId || !idConf) {
      return systemCrystalOptions;
    }

    if (isLoadingDimensionPolicies) {
      return [];
    }

    if (reinforcementRequired && !selectedReinforcementOptionId) {
      return [];
    }

    return systemCrystalOptions.filter((crystal) =>
      allowedCrystalIds.has(crystal.id),
    );
  }, [
    systemId,
    idConf,
    systemCrystalOptions,
    isLoadingDimensionPolicies,
    reinforcementRequired,
    selectedReinforcementOptionId,
    allowedCrystalIds,
    isLinearMaterial,
  ]);

  useEffect(() => {
    if (!systemId || !idConf) return;
    if (isLocked) return;
    if (isLoadingDimensionPolicies) return;

    // comentario en español: si la configuración usa reinforcement,
    // no tocamos el crystal hasta que el usuario tenga un reinforcement seleccionado.
    if (reinforcementRequired && !selectedReinforcementOptionId) return;

    const currentCrystalId = Number(getValues("idCryst") || 0);

    if (availableCrystals.length === 0) {
      if (currentCrystalId) {
        setValue("idCryst", 0, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      return;
    }

    const currentStillAllowed = availableCrystals.some(
      (crystal) => crystal.id === currentCrystalId,
    );

    if (currentStillAllowed) return;

    const defaultCrystalId = Number(selectedSystem?.defaultCrystalId || 0);

    const defaultStillAllowed = availableCrystals.some(
      (crystal) => crystal.id === defaultCrystalId,
    );

    const nextCrystalId = defaultStillAllowed
      ? defaultCrystalId
      : availableCrystals[0]?.id || 0;

    setValue("idCryst", nextCrystalId, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [
    systemId,
    idConf,
    isLinearMaterial,
    reinforcementRequired,
    selectedReinforcementOptionId,
    availableCrystals,
    selectedSystem?.defaultCrystalId,
    isLocked,
    isLoadingDimensionPolicies,
    getValues,
    setValue,
  ]);

  const hasOptionsSection =
    !isLinearMaterial &&
    (highBottomAllowed ||
      screenAllowed ||
      availableActiveOptions.length > 0 ||
      availablePreparationOptions.length > 0 ||
      availableSillOptions.length > 0 ||
      availableReinforcementOptions.length > 0);

  const selectedPattern = useMemo(() => {
    const patternId = Number(pieceValues.muntin?.idPattern || 0);
    if (!patternId) return null;
    return activeMuntinPatterns.find((p) => p.id === patternId) ?? null;
  }, [pieceValues.muntin?.idPattern, activeMuntinPatterns]);

  const patternRequiresLites = selectedPattern?.requiresLites ?? false;

  useEffect(() => {
    if (!currentMuntin) return;
    if (!patternRequiresLites) return;
    if (!hasMuntinLayout) return;
    if (currentMuntin.idType) return;
    if (!defaultMuntinType?.id) return;

    setValue(
      "muntin",
      {
        idPattern: Number(currentMuntin.idPattern),
        idType: defaultMuntinType.id,
        panels: buildDefaultPanelsFromLayout(
          selectedConfig?.muntinLayout,
          currentMuntin.panels?.map((panel, index) => ({
            panelIndex: Number(panel.panelIndex ?? index + 1),
            panelLabel:
              panel.panelLabel ??
              `Panel ${Number(panel.panelIndex ?? index + 1)}`,
            panelCode: panel.panelCode,
            horizontalLites: Math.max(1, Number(panel.horizontalLites ?? 1)),
            verticalLites: Math.max(1, Number(panel.verticalLites ?? 1)),
          })) ?? [],
        ),
      },
      { shouldDirty: true },
    );
  }, [
    currentMuntin,
    patternRequiresLites,
    hasMuntinLayout,
    defaultMuntinType?.id,
    selectedConfig?.muntinLayout,
    setValue,
  ]);

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
      ...(!isLinearMaterial ? ["item-glass", "item-muntin"] : []),
      "item-details",
    ];

    setActiveAccordionItems((prev) => {
      const hadResultsOpen = prev.includes("item-results");
      if (hadResultsOpen || Number(initialData.price) > 0) {
        return [...defaultItems, "item-results"];
      }
      return defaultItems;
    });
  }, [hasOptionsSection, initialData.price, isLinearMaterial]);

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

    if (!selectedConfig) return;

    if (isLinearMaterial) {
      previousConfigIdRef.current = currentConfigId;

      setValue("screen", false, { shouldDirty: true });
      setValue("privacy", false, { shouldDirty: true });
      setValue("highBottom", false, { shouldDirty: true });
      setValue("highBottomPercent", null, { shouldDirty: true });

      setValue("idCryst", 0, { shouldDirty: true, shouldValidate: false });
      setValue("idTint", 0, { shouldDirty: true, shouldValidate: false });
      setValue("idCoat", 0, { shouldDirty: true, shouldValidate: false });

      setValue("muntin", null, { shouldDirty: true });
      setValue("idActiveOption", null, { shouldDirty: true });
      setValue("idPreparationOption", null, { shouldDirty: true });
      setValue("idSillOption", null, { shouldDirty: true });
      setValue("idReinforcementOption", null, { shouldDirty: true });

      return;
    }

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

    const fallbackPatternId =
      defaultFullViewPattern?.id ?? defaultMuntinPattern?.id;

    if (fallbackPatternId) {
      const syncedMuntin = syncMuntinWithConfigLayout(
        getValues("muntin"),
        selectedConfig,
        fallbackPatternId,
      );

      setValue("muntin", syncedMuntin, { shouldDirty: false });
    }

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
    isLinearMaterial,
    screenAllowed,
    hasMuntinLayout,
    defaultMuntinPattern?.id,
    defaultFullViewPattern?.id,
    availableActiveOptions,
    availablePreparationOptions,
    availableSillOptions,
    availableReinforcementOptions,
    selectedSysConf,
    availableFrameColors,
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
            ? (current?.idType ?? defaultMuntinType?.id ?? null)
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
        "qty",
      ];

      if (!isLinearMaterial) {
        fieldsToValidate.push("idCryst", "idTint", "idCoat");
      }

      if (!isLinearMaterial && reinforcementRequired) {
        fieldsToValidate.push("idReinforcementOption");
      }
      if (dimensionRequirements.requiresWidth) fieldsToValidate.push("width");
      if (dimensionRequirements.requiresHeight) fieldsToValidate.push("height");
      if (dimensionRequirements.requiresHeightLeft)
        fieldsToValidate.push("heightLeft");
      if (dimensionRequirements.requiresHeightRight)
        fieldsToValidate.push("heightRight");
      if (dimensionRequirements.requiresLegHeight)
        fieldsToValidate.push("legHeight");
      if (dimensionRequirements.requiresSashHeight)
        fieldsToValidate.push("sashHeight");

      if (dimensionRequirements.requiresDoorWidth)
        fieldsToValidate.push("doorWidth");
      if (dimensionRequirements.requiresLeftSideliteWidth)
        fieldsToValidate.push("leftSideliteWidth");
      if (dimensionRequirements.requiresRightSideliteWidth)
        fieldsToValidate.push("rightSideliteWidth");
      if (dimensionRequirements.requiresLeftPanels)
        fieldsToValidate.push("leftPanels");
      if (dimensionRequirements.requiresRightPanels)
        fieldsToValidate.push("rightPanels");
      if (dimensionRequirements.requiresPanelCount)
        fieldsToValidate.push("panelCount");

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

      const widthNorm = dimensionRequirements.requiresWidth
        ? normalizeInchesToEighthStep(currentValues.width, "Width", 1)
        : undefined;

      const heightNorm = dimensionRequirements.requiresHeight
        ? normalizeInchesToEighthStep(currentValues.height, "Height", 1)
        : undefined;

      const heightLeftNorm = dimensionRequirements.requiresHeightLeft
        ? normalizeInchesToEighthStep(
            currentValues.heightLeft,
            "Height Left",
            1,
          )
        : undefined;

      const heightRightNorm = dimensionRequirements.requiresHeightRight
        ? normalizeInchesToEighthStep(
            currentValues.heightRight,
            "Height Right",
            1,
          )
        : undefined;

      const legHeightNorm = dimensionRequirements.requiresLegHeight
        ? normalizeInchesToEighthStep(currentValues.legHeight, "Leg Height", 1)
        : undefined;

      const sashHeightNorm = dimensionRequirements.requiresSashHeight
        ? normalizeInchesToEighthStep(
            currentValues.sashHeight,
            "Sash Height",
            1,
          )
        : undefined;

      if (sashHeightNorm !== undefined) {
        if (sashHeightNorm < 19.625) {
          toast.error("Sash Height cannot be less than 19.625 inches.");
          return;
        }

        const totalHeightForSash =
          heightNorm !== undefined
            ? heightNorm
            : Number(currentValues.height || 0);

        if (!Number.isFinite(totalHeightForSash) || totalHeightForSash <= 0) {
          toast.error("Height is required to validate Sash Height.");
          return;
        }

        const maxSashHeight = totalHeightForSash / 2;

        if (sashHeightNorm > maxSashHeight) {
          toast.error(
            `Sash Height cannot be greater than half of the total height (${maxSashHeight.toFixed(3)} inches).`,
          );
          return;
        }
      }

      const doorWidthNorm = dimensionRequirements.requiresDoorWidth
        ? normalizeInchesToEighthStep(currentValues.doorWidth, "Door Width", 1)
        : undefined;

      const leftSideliteWidthNorm =
        dimensionRequirements.requiresLeftSideliteWidth
          ? normalizeInchesToEighthStep(
              currentValues.leftSideliteWidth,
              "Left Sidelite Width",
              1,
            )
          : undefined;

      const rightSideliteWidthNorm =
        dimensionRequirements.requiresRightSideliteWidth
          ? normalizeInchesToEighthStep(
              currentValues.rightSideliteWidth,
              "Right Sidelite Width",
              1,
            )
          : undefined;

      if (widthNorm !== undefined) setValue("width", String(widthNorm));
      if (heightNorm !== undefined) setValue("height", String(heightNorm));
      if (heightLeftNorm !== undefined)
        setValue("heightLeft", String(heightLeftNorm));
      if (heightRightNorm !== undefined)
        setValue("heightRight", String(heightRightNorm));
      if (legHeightNorm !== undefined)
        setValue("legHeight", String(legHeightNorm));
      if (sashHeightNorm !== undefined)
        setValue("sashHeight", String(sashHeightNorm));
      if (doorWidthNorm !== undefined) {
        setValue("doorWidth", String(doorWidthNorm));
      }

      if (leftSideliteWidthNorm !== undefined) {
        setValue("leftSideliteWidth", String(leftSideliteWidthNorm));
      }

      if (rightSideliteWidthNorm !== undefined) {
        setValue("rightSideliteWidth", String(rightSideliteWidthNorm));
      }

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
        sashHeight:
          sashHeightNorm !== undefined ? String(sashHeightNorm) : undefined,
        doorWidth:
          doorWidthNorm !== undefined ? String(doorWidthNorm) : undefined,
        leftSideliteWidth:
          leftSideliteWidthNorm !== undefined
            ? String(leftSideliteWidthNorm)
            : undefined,
        rightSideliteWidth:
          rightSideliteWidthNorm !== undefined
            ? String(rightSideliteWidthNorm)
            : undefined,
        leftPanels: dimensionRequirements.requiresLeftPanels
          ? Number(currentValues.leftPanels || 0)
          : undefined,
        rightPanels: dimensionRequirements.requiresRightPanels
          ? Number(currentValues.rightPanels || 0)
          : undefined,
        panelCount: dimensionRequirements.requiresPanelCount
          ? Number(currentValues.panelCount || 0)
          : undefined,
        horizontalHeights: dimensionRequirements.requiresHorizontalHeights
          ? (currentValues.horizontalHeights ?? [])
          : undefined,
        idCryst: isLinearMaterial ? null : Number(currentValues.idCryst),
        idTint: isLinearMaterial ? null : Number(currentValues.idTint),
        privacy: isLinearMaterial ? false : Boolean(currentValues.privacy),
        idCoat: isLinearMaterial ? null : Number(currentValues.idCoat),
        screen: isLinearMaterial ? false : Boolean(currentValues.screen),
        highBottom:
          !isLinearMaterial && highBottomAllowed
            ? currentValues.highBottom === true
            : false,

        idActiveOption: isLinearMaterial
          ? null
          : currentValues.idActiveOption
            ? Number(currentValues.idActiveOption)
            : undefined,
        idPreparationOption: isLinearMaterial
          ? null
          : currentValues.idPreparationOption
            ? Number(currentValues.idPreparationOption)
            : undefined,
        idSillOption: isLinearMaterial
          ? null
          : currentValues.idSillOption
            ? Number(currentValues.idSillOption)
            : undefined,
        idReinforcementOption: isLinearMaterial
          ? null
          : currentValues.idReinforcementOption
            ? Number(currentValues.idReinforcementOption)
            : undefined,

        muntin: isLinearMaterial ? null : (currentValues.muntin ?? null),
        qty: Number(currentValues.qty),
        dealerMarkup: props.canUseCustomerPricing
          ? Number(currentValues.dealerMarkup || 0)
          : undefined,
      };

      if (!isLinearMaterial) {
        const idCrystForPreview = Number(pieceDtoToSend.idCryst);

        if (!Number.isFinite(idCrystForPreview) || idCrystForPreview <= 0) {
          toast.error("Please select a valid glass type.");
          return;
        }

        const precheck = await validatePiece({
          idSyst: pieceDtoToSend.idSyst,
          idConf: pieceDtoToSend.idConf,
          idCryst: idCrystForPreview,
          idReinforcementOption: pieceDtoToSend.idReinforcementOption ?? null,

          width: widthNorm,
          height: heightNorm ?? Number(currentValues.height || 0),
          heightLeft: heightLeftNorm,
          heightRight: heightRightNorm,
          legHeight: legHeightNorm,

          doorWidth: doorWidthNorm,
          leftSideliteWidth: leftSideliteWidthNorm,
          rightSideliteWidth: rightSideliteWidthNorm,
          leftPanels: pieceDtoToSend.leftPanels ?? undefined,
          rightPanels: pieceDtoToSend.rightPanels ?? undefined,
          panelCount: pieceDtoToSend.panelCount ?? undefined,
          horizontalHeights: pieceDtoToSend.horizontalHeights ?? undefined,
        });

        if (!precheck.ok) {
          if (precheck.reason === "NOT_RATED") {
            toast.error(
              precheck.note ||
                "No dimension policy exists for this System + Config + Crystal combination.",
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
                precheck.note
                  ? `${precheck.note}. Minimum allowed size: W=${sW}, H=${sH}.`
                  : `Please review the dimensions. Minimum allowed size: W=${sW}, H=${sH}.`,
              );
            } else {
              const maxW = precheck.suggestion?.maxWidthIn ?? null;
              const maxH = precheck.suggestion?.maxHeightIn ?? null;
              const sW = maxW != null ? `${maxW}″` : "—";
              const sH = maxH != null ? `${maxH}″` : "—";

              toast.error(
                precheck.note
                  ? `${precheck.note}. Maximum allowed size: W=${sW}, H=${sH}.`
                  : `Please review the dimensions. Maximum allowed size: W=${sW}, H=${sH}.`,
              );
            }
          } else {
            toast.error("Dimension validation failed.");
          }

          return;
        }
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
      setValue("highBottom", calculated.highBottom === true, {
        shouldDirty: true,
      });

      setValue("highBottomPercent", calculated.highBottomPercent ?? null, {
        shouldDirty: true,
      });
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

      if (props.canUseCustomerPricing) {
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
    if (!props.canUseCustomerPricing) return;

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
                            setValue("idCryst", 0);
                            setValue("idReinforcementOption", null);
                            setValue("highBottom", false);
                            setValue("highBottomPercent", null);
                            setValue("sashHeight", "");
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
                            setValue("idCryst", 0);
                            setValue("idReinforcementOption", null);
                            setValue("highBottom", false);
                            setValue("highBottomPercent", null);
                            setValue("sashHeight", "");
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
                            setValue("idReinforcementOption", null);
                            setValue("highBottom", false);
                            setValue("highBottomPercent", null);
                            setValue("sashHeight", "");

                            // mantener color actual si ya existe
                            const currentColor = getValues("idFC");

                            // solo usar default del estimate si la pieza aún no tiene color
                            if (!currentColor || currentColor === 0) {
                              const inheritedDefaultColor =
                                Number(initialData.idFC) || 0;

                              if (inheritedDefaultColor > 0) {
                                setValue("idFC", inheritedDefaultColor, {
                                  shouldDirty: false,
                                  shouldValidate: true,
                                });
                              }
                            }

                            if (isLinearMaterial) {
                              setValue("idCryst", 0);
                            } else {
                              setValue(
                                "idCryst",
                                Number(nextSystem?.defaultCrystalId) || 0,
                              );
                            }
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
                          onValueChange={(v) => {
                            field.onChange(Number(v));
                            setValue("idReinforcementOption", null);
                            setValue("sashHeight", "");
                          }}
                          value={String(field.value || "0")}
                        >
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Select configuration" />
                          </SelectTrigger>
                          <SelectContent>
                            {!groupedConfigs.hasCategories ? (
                              availableConfigs.map((config) => (
                                <SelectItem
                                  key={config.id}
                                  value={String(config.id)}
                                >
                                  {config.conf}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                {groupedConfigs.uncategorized.map((config) => (
                                  <SelectItem
                                    key={config.id}
                                    value={String(config.id)}
                                  >
                                    {config.conf}
                                  </SelectItem>
                                ))}

                                {groupedConfigs.groups.map((group) => (
                                  <SelectGroup key={group.key}>
                                    <SelectLabel className="font-bold text-slate-900">
                                      {group.name}
                                    </SelectLabel>

                                    {group.configs.map((config) => (
                                      <SelectItem
                                        key={config.id}
                                        value={String(config.id)}
                                      >
                                        {config.conf}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                ))}
                              </>
                            )}
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
                          value={
                            field.value && field.value > 0
                              ? String(field.value)
                              : undefined
                          }
                        >
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Select frame color" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFrameColors.map((fc) => (
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
                    {highBottomAllowed && (
                      <div className="flex flex-col gap-2">
                        <Controller
                          name="highBottom"
                          control={control}
                          render={({ field }) => (
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`highBottom-${index}`}
                                checked={field.value === true}
                                onCheckedChange={(v) =>
                                  field.onChange(v === true)
                                }
                                disabled={isLocked}
                                className="h-5 w-5 border-2 border-slate-400 data-[state=checked]:bg-slate-900 data-[state=checked]:text-white"
                              />

                              <Label
                                htmlFor={`highBottom-${index}`}
                                className="cursor-pointer select-none text-sm"
                              >
                                High Bottom
                              </Label>
                            </div>
                          )}
                        />

                        <p className="text-xs text-muted-foreground">
                          Applies High Bottom to this piece.
                        </p>
                      </div>
                    )}
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
                                key={`${idConf}-${field.name}-${field.value ?? "empty"}`}
                                value={
                                  field.value == null
                                    ? undefined
                                    : String(field.value)
                                }
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
                                key={`${idConf}-${field.name}-${field.value ?? "empty"}`}
                                value={
                                  field.value == null
                                    ? undefined
                                    : String(field.value)
                                }
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
                                key={`${idConf}-${field.name}-${field.value ?? "empty"}`}
                                value={
                                  field.value == null
                                    ? undefined
                                    : String(field.value)
                                }
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
                                onValueChange={(v) => {
                                  field.onChange(Number(v));

                                  setValue("idReinforcementOption", Number(v), {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });

                                  setValue("idCryst", 0, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                }}
                                key={`${idConf}-${field.name}-${field.value ?? "empty"}`}
                                value={
                                  field.value == null
                                    ? undefined
                                    : String(field.value)
                                }
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
                        {dimensionRequirements.requiresWidth && (
                          <div className="w-[320px]">
                            <Label className={fieldLabelClass}>
                              {isStandardDimensionMode
                                ? "Width (inches)"
                                : "Opening Width (inches)"}
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

                        {dimensionRequirements.requiresHeight && (
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

                        {dimensionRequirements.requiresSashHeight && (
                          <div className="w-[320px]">
                            <Label className={fieldLabelClass}>
                              Sash Height (inches)
                            </Label>
                            <Input
                              className={inputClass}
                              autoComplete="off"
                              type="text"
                              disabled={isLocked}
                              {...register("sashHeight", {
                                required: "Sash Height is required",
                              })}
                              onBlur={(e) => {
                                const raw = e.target.value;
                                if (!raw) return;
                                try {
                                  const v = normalizeInchesToEighthStep(
                                    raw,
                                    "Sash Height",
                                    1,
                                  );
                                  setValue("sashHeight", String(v), {
                                    shouldValidate: true,
                                  });
                                } catch (err) {
                                  if (err instanceof DimensionParseError) {
                                    toast.error(err.message);
                                  }
                                }
                              }}
                            />
                            {errors.sashHeight && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors.sashHeight.message}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              Min 19.625″. Cannot exceed half of total height.
                            </p>
                          </div>
                        )}

                        {dimensionRequirements.requiresHeightLeft && (
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

                        {dimensionRequirements.requiresHeightRight && (
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

                        {dimensionRequirements.requiresLegHeight && (
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

                        {dimensionRequirements.requiresDoorWidth && (
                          <div className="w-[320px]">
                            <Label className={fieldLabelClass}>
                              Door Width (inches)
                            </Label>
                            <Input
                              className={inputClass}
                              autoComplete="off"
                              type="text"
                              disabled={isLocked}
                              {...register("doorWidth", {
                                required: "Door Width is required",
                              })}
                              onBlur={(e) => {
                                const raw = e.target.value;
                                if (!raw) return;
                                try {
                                  const v = normalizeInchesToEighthStep(
                                    raw,
                                    "Door Width",
                                    1,
                                  );
                                  setValue("doorWidth", String(v), {
                                    shouldValidate: true,
                                  });
                                } catch (err) {
                                  if (err instanceof DimensionParseError) {
                                    toast.error(err.message);
                                  }
                                }
                              }}
                            />
                            {errors.doorWidth && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors.doorWidth.message}
                              </p>
                            )}
                          </div>
                        )}

                        {dimensionRequirements.requiresLeftSideliteWidth && (
                          <div className="w-[320px]">
                            <Label className={fieldLabelClass}>
                              Left Sidelite Width (inches)
                            </Label>
                            <Input
                              className={inputClass}
                              autoComplete="off"
                              type="text"
                              disabled={isLocked}
                              {...register("leftSideliteWidth", {
                                required: "Left Sidelite Width is required",
                              })}
                              onBlur={(e) => {
                                const raw = e.target.value;
                                if (!raw) return;
                                try {
                                  const v = normalizeInchesToEighthStep(
                                    raw,
                                    "Left Sidelite Width",
                                    1,
                                  );
                                  setValue("leftSideliteWidth", String(v), {
                                    shouldValidate: true,
                                  });
                                } catch (err) {
                                  if (err instanceof DimensionParseError) {
                                    toast.error(err.message);
                                  }
                                }
                              }}
                            />
                            {errors.leftSideliteWidth && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors.leftSideliteWidth.message}
                              </p>
                            )}
                          </div>
                        )}

                        {dimensionRequirements.requiresRightSideliteWidth && (
                          <div className="w-[320px]">
                            <Label className={fieldLabelClass}>
                              Right Sidelite Width (inches)
                            </Label>
                            <Input
                              className={inputClass}
                              autoComplete="off"
                              type="text"
                              disabled={isLocked}
                              {...register("rightSideliteWidth", {
                                required: "Right Sidelite Width is required",
                              })}
                              onBlur={(e) => {
                                const raw = e.target.value;
                                if (!raw) return;
                                try {
                                  const v = normalizeInchesToEighthStep(
                                    raw,
                                    "Right Sidelite Width",
                                    1,
                                  );
                                  setValue("rightSideliteWidth", String(v), {
                                    shouldValidate: true,
                                  });
                                } catch (err) {
                                  if (err instanceof DimensionParseError) {
                                    toast.error(err.message);
                                  }
                                }
                              }}
                            />
                            {errors.rightSideliteWidth && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors.rightSideliteWidth.message}
                              </p>
                            )}
                          </div>
                        )}

                        {dimensionRequirements.requiresLeftPanels && (
                          <div className="w-[320px]">
                            <Label className={fieldLabelClass}>
                              Left Panels
                            </Label>
                            <Input
                              className={inputClass}
                              type="number"
                              min={1}
                              disabled={isLocked}
                              {...register("leftPanels", {
                                required: "Left Panels is required",
                                valueAsNumber: true,
                                min: { value: 1, message: "Min value is 1" },
                              })}
                            />
                            {errors.leftPanels && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors.leftPanels.message}
                              </p>
                            )}
                          </div>
                        )}

                        {dimensionRequirements.requiresRightPanels && (
                          <div className="w-[320px]">
                            <Label className={fieldLabelClass}>
                              Right Panels
                            </Label>
                            <Input
                              className={inputClass}
                              type="number"
                              min={1}
                              disabled={isLocked}
                              {...register("rightPanels", {
                                required: "Right Panels is required",
                                valueAsNumber: true,
                                min: { value: 1, message: "Min value is 1" },
                              })}
                            />
                            {errors.rightPanels && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors.rightPanels.message}
                              </p>
                            )}
                          </div>
                        )}

                        {dimensionRequirements.requiresPanelCount && (
                          <div className="w-[320px]">
                            <Label className={fieldLabelClass}>
                              Panel Count
                            </Label>
                            <Input
                              className={inputClass}
                              type="number"
                              min={1}
                              disabled={isLocked}
                              {...register("panelCount", {
                                required: "Panel Count is required",
                                valueAsNumber: true,
                                min: { value: 1, message: "Min value is 1" },
                              })}
                            />
                            {errors.panelCount && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors.panelCount.message}
                              </p>
                            )}
                          </div>
                        )}

                        {!Object.values(dimensionRequirements).some(
                          Boolean,
                        ) && (
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

            {!isLinearMaterial && (
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
                              !idConf ||
                              isLoadingDimensionPolicies ||
                              (reinforcementRequired &&
                                !selectedReinforcementOptionId) ||
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
                        <p className="mt-1 text-xs text-red-500">
                          Type required
                        </p>
                      )}
                      {!errors.idCryst &&
                        systemId &&
                        idConf &&
                        reinforcementRequired &&
                        !selectedReinforcementOptionId && (
                          <p className="mt-1 text-xs text-amber-600">
                            Select a Reinforcement option first.
                          </p>
                        )}

                      {!errors.idCryst &&
                        systemId &&
                        idConf &&
                        !isLoadingDimensionPolicies &&
                        (!reinforcementRequired ||
                          selectedReinforcementOptionId) &&
                        availableCrystals.length === 0 && (
                          <p className="mt-1 text-xs text-red-500">
                            {reinforcementRequired
                              ? "No rated glass is available for this System + Config + Reinforcement."
                              : "No rated glass is available for this System + Config."}
                          </p>
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
                        <p className="mt-1 text-xs text-red-500">
                          Tint required
                        </p>
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
                              onCheckedChange={(v) =>
                                field.onChange(Boolean(v))
                              }
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
            )}

            {!isLinearMaterial && (
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
                                value={
                                  currentMuntin?.idType
                                    ? String(currentMuntin.idType)
                                    : undefined
                                }
                                onValueChange={handleMuntinTypeChange}
                              >
                                <SelectTrigger className={selectTriggerClass}>
                                  <SelectValue placeholder="Select type..." />
                                </SelectTrigger>
                                <SelectContent>
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
            )}

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

                    {props.canUseCustomerPricing && (
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
