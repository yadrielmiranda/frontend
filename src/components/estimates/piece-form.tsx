"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  Loader2,
  Pencil,
  Calculator,
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
  Privacy,
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
  isSelectableInEstimate: boolean;
  sortOrder: number;
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
  requiresDoorWidth?: boolean;
  requiresDoorHeight?: boolean;
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

type PieceDimensionRequirements = {
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
};

const STRING_DIMENSION_FIELDS = [
  ["width", "requiresWidth"],
  ["height", "requiresHeight"],
  ["heightLeft", "requiresHeightLeft"],
  ["heightRight", "requiresHeightRight"],
  ["legHeight", "requiresLegHeight"],
  ["sashHeight", "requiresSashHeight"],
  ["windowHeight", "requiresWindowHeight"],
  ["doorWidth", "requiresDoorWidth"],
  ["doorHeight", "requiresDoorHeight"],
  ["leftSideliteWidth", "requiresLeftSideliteWidth"],
  ["rightSideliteWidth", "requiresRightSideliteWidth"],
] as const;

const NUMBER_DIMENSION_FIELDS = [
  ["leftPanels", "requiresLeftPanels"],
  ["rightPanels", "requiresRightPanels"],
  ["panelCount", "requiresPanelCount"],
] as const;

function withoutInactiveDimensions(
  values: PieceFormValues,
  requirements: PieceDimensionRequirements,
): PieceFormValues {
  return {
    ...values,
    width: requirements.requiresWidth ? values.width : null,
    height: requirements.requiresHeight ? values.height : null,
    heightLeft: requirements.requiresHeightLeft ? values.heightLeft : null,
    heightRight: requirements.requiresHeightRight ? values.heightRight : null,
    legHeight: requirements.requiresLegHeight ? values.legHeight : null,
    sashHeight: requirements.requiresSashHeight ? values.sashHeight : null,
    windowHeight: requirements.requiresWindowHeight
      ? values.windowHeight
      : null,
    doorWidth: requirements.requiresDoorWidth ? values.doorWidth : null,
    doorHeight: requirements.requiresDoorHeight ? values.doorHeight : null,
    leftSideliteWidth: requirements.requiresLeftSideliteWidth
      ? values.leftSideliteWidth
      : null,
    rightSideliteWidth: requirements.requiresRightSideliteWidth
      ? values.rightSideliteWidth
      : null,
    leftPanels: requirements.requiresLeftPanels ? values.leftPanels : null,
    rightPanels: requirements.requiresRightPanels ? values.rightPanels : null,
    panelCount: requirements.requiresPanelCount ? values.panelCount : null,
    horizontalHeights: requirements.requiresHorizontalHeights
      ? values.horizontalHeights
      : null,
  };
}

const MIN_HORIZONTAL_HEIGHT_IN = 18;

function PieceSectionHeader({ title }: { title: string }) {
  return (
    <div className="my-1 flex items-center justify-between rounded-md border border-slate-200 border-l-4 border-l-blue-400 bg-slate-50 px-3 py-0.5">
      <span className="text-base font-semibold text-slate-900">{title}</span>

      <AccordionTrigger
        aria-label={`Show or hide ${title}`}
        title={`Show or hide ${title}`}
        className="h-8 w-8 flex-none items-center justify-center gap-0 rounded-md p-0 text-slate-600 hover:bg-blue-100 hover:no-underline focus-visible:border-blue-400 focus-visible:ring-blue-200 [&>svg]:size-5 [&>svg]:translate-y-0"
      />
    </div>
  );
}

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

function ColorSelectOption({
  label,
  hexCode,
}: {
  label: string;
  hexCode: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="size-4 shrink-0 rounded-sm border border-slate-300 shadow-sm"
        style={{ backgroundColor: hexCode }}
      />
      <span className="truncate">{label}</span>
    </span>
  );
}

export interface PieceFormProps {
  initialData: PieceFormValues;
  onSubmit: (data: PieceFormValues) => void | Promise<void>;
  onCancel: () => void;
  index: number;

  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
  frameColors: FrameColor[];
  crystals: Crystal[];
  tints: Tint[];
  coatings: Coating[];
  privacies: Privacy[];
  muntinPatterns: MuntinPattern[];
  muntinTypes: MuntinType[];

  canUseCustomerPricing: boolean;
  estimateId?: number;
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
      windowHeight: initialData.windowHeight ?? "",
      doorWidth: initialData.doorWidth ?? "",
      doorHeight: initialData.doorHeight ?? "",
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
  const [dimensionPolicies, setDimensionPolicies] = useState<PolicyListItem[]>(
    [],
  );
  const [isLoadingDimensionPolicies, setIsLoadingDimensionPolicies] =
    useState(false);

  const pieceValues = useWatch({ control });
  const { idProd, idConf, width, height, price } = pieceValues;
  const currentMuntin = pieceValues.muntin ?? null;

  const selectedProduct = useMemo(() => {
    if (!idProd) {
      return null;
    }

    return (
      props.productsWithBrands.find(
        (product) => product.id === Number(idProd),
      ) ?? null
    );
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

    if (!selectedProduct) return [];

    return selectedProduct.brandProducts
      .map((bp) => bp.brand)
      .filter((brand) =>
        props.systemsWithConfigs.some(
          (system) =>
            system.isActive === true &&
            system.idProduct === Number(idProd) &&
            system.idBrand === brand.id,
        ),
      );
  }, [idProd, props.productsWithBrands, props.systemsWithConfigs]);

  const availableSystems = useMemo(() => {
    if (!idProd || !brandId) return [];

    return props.systemsWithConfigs
      .filter(
        (system) =>
          system.isActive === true &&
          system.idProduct === Number(idProd) &&
          system.idBrand === Number(brandId),
      )
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.name.localeCompare(right.name) ||
          left.id - right.id,
      );
  }, [idProd, brandId, props.systemsWithConfigs]);

  const selectedSystem = useMemo(() => {
    if (!systemId) return null;

    return (
      props.systemsWithConfigs.find((s) => s.id === Number(systemId)) ?? null
    );
  }, [systemId, props.systemsWithConfigs]);

  const availableFrameColors = useMemo(() => {
    return [...(selectedSystem?.systemFrameColors ?? [])]
      .sort(
        (left, right) =>
          (left.sortOrder ?? 0) - (right.sortOrder ?? 0) ||
          left.frameColor.color.localeCompare(right.frameColor.color) ||
          left.idFrameColor - right.idFrameColor,
      )
      .map((item) => item.frameColor)
      .filter(Boolean);
  }, [selectedSystem]);

  const availableTints = useMemo(() => {
    const selectedBrandId = Number(brandId || 0);
    if (!selectedBrandId || isLinearMaterial) return [];

    return props.tints
      .filter(
        (tint) =>
          tint.isActive === true &&
          (tint.brandTints ?? []).some(
            (association) => association.idBrand === selectedBrandId,
          ),
      )
      .sort((left, right) => {
        const leftAssociation = (left.brandTints ?? []).find(
          (association) => association.idBrand === selectedBrandId,
        );
        const rightAssociation = (right.brandTints ?? []).find(
          (association) => association.idBrand === selectedBrandId,
        );

        return (
          (leftAssociation?.sortOrder ?? Number.MAX_SAFE_INTEGER) -
            (rightAssociation?.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
          left.color.localeCompare(right.color) ||
          left.id - right.id
        );
      });
  }, [brandId, isLinearMaterial, props.tints]);

  const availableCoatings = useMemo(() => {
    const selectedBrandId = Number(brandId || 0);
    if (!selectedBrandId || isLinearMaterial) return [];

    return props.coatings
      .filter(
        (coating) =>
          coating.isActive === true &&
          (coating.brandCoatings ?? []).some(
            (association) => association.idBrand === selectedBrandId,
          ),
      )
      .sort((left, right) => {
        const leftAssociation = (left.brandCoatings ?? []).find(
          (association) => association.idBrand === selectedBrandId,
        );
        const rightAssociation = (right.brandCoatings ?? []).find(
          (association) => association.idBrand === selectedBrandId,
        );

        return (
          (leftAssociation?.sortOrder ?? Number.MAX_SAFE_INTEGER) -
            (rightAssociation?.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
          left.name.localeCompare(right.name) ||
          left.id - right.id
        );
      });
  }, [brandId, isLinearMaterial, props.coatings]);

  const availablePrivacies = useMemo(() => {
    const selectedBrandId = Number(brandId || 0);
    if (!selectedBrandId || isLinearMaterial) return [];

    return props.privacies
      .filter(
        (privacy) =>
          privacy.isActive === true &&
          (privacy.brandPrivacies ?? []).some(
            (association) => association.idBrand === selectedBrandId,
          ),
      )
      .sort((left, right) => {
        const leftAssociation = (left.brandPrivacies ?? []).find(
          (association) => association.idBrand === selectedBrandId,
        );
        const rightAssociation = (right.brandPrivacies ?? []).find(
          (association) => association.idBrand === selectedBrandId,
        );

        return (
          (leftAssociation?.sortOrder ?? Number.MAX_SAFE_INTEGER) -
            (rightAssociation?.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
          left.name.localeCompare(right.name) ||
          left.id - right.id
        );
      });
  }, [brandId, isLinearMaterial, props.privacies]);

  useEffect(() => {
    const selectedBrandId = Number(brandId || 0);
    if (!selectedBrandId || isLinearMaterial) return;

    const currentTintId = Number(getValues("idTint") || 0);
    const currentTintIsAvailable = availableTints.some(
      (tint) => tint.id === currentTintId,
    );

    if (!currentTintIsAvailable) {
      const defaultTint = availableTints.find((tint) =>
        (tint.brandTints ?? []).some(
          (association) =>
            association.idBrand === selectedBrandId && association.isDefault,
        ),
      );

      setValue("idTint", defaultTint?.id ?? 0, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    const currentCoatingId = Number(getValues("idCoat") || 0);
    const currentCoatingIsAvailable = availableCoatings.some(
      (coating) => coating.id === currentCoatingId,
    );

    if (!currentCoatingIsAvailable) {
      const defaultCoating = availableCoatings.find((coating) =>
        (coating.brandCoatings ?? []).some(
          (association) =>
            association.idBrand === selectedBrandId && association.isDefault,
        ),
      );

      setValue("idCoat", defaultCoating?.id ?? 0, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    const currentPrivacyId = Number(getValues("idPrivacy") || 0);
    const currentPrivacyIsAvailable = availablePrivacies.some(
      (privacy) => privacy.id === currentPrivacyId,
    );

    if (!currentPrivacyIsAvailable) {
      const defaultPrivacy = availablePrivacies.find((privacy) =>
        (privacy.brandPrivacies ?? []).some(
          (association) =>
            association.idBrand === selectedBrandId && association.isDefault,
        ),
      );

      setValue("idPrivacy", defaultPrivacy?.id ?? 0, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [
    brandId,
    isLinearMaterial,
    availableTints,
    availableCoatings,
    availablePrivacies,
    getValues,
    setValue,
  ]);

  const selectedFrameColorHex =
    availableFrameColors.find(
      (frameColor) => frameColor.id === Number(pieceValues.idFC),
    )?.hexCode ?? null;

  const selectedTintHex =
    props.tints.find((tint) => tint.id === Number(pieceValues.idTint))
      ?.hexCode ?? null;

  const selectedCoating =
    props.coatings.find(
      (coating) => coating.id === Number(pieceValues.idCoat),
    ) ?? null;

  const selectedCoatingAssociation = selectedCoating?.brandCoatings?.find(
    (association) => association.idBrand === Number(brandId || 0),
  );

  const hasCoating = selectedCoatingAssociation?.surchargeEnabled === true;

  const selectedPrivacy =
    props.privacies.find(
      (privacy) => privacy.id === Number(pieceValues.idPrivacy),
    ) ?? null;

  const selectedPrivacyAssociation = selectedPrivacy?.brandPrivacies?.find(
    (association) => association.idBrand === Number(brandId || 0),
  );

  const hasPrivacy = selectedPrivacyAssociation?.surchargeEnabled === true;

  const availableSysConfs = useMemo<SystemConfigLink[]>(() => {
    return [
      ...((selectedSystem?.sysconfs ?? []) as SystemConfigLink[]).filter(
        (sc) => !!sc?.config,
      ),
    ].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return a.config.conf.localeCompare(b.config.conf);
    });
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

  useEffect(() => {
    if (!selectedSystem) return;

    const currentConfigId = Number(idConf || 0);

    const currentConfigIsAvailable =
      currentConfigId > 0 &&
      availableSysConfs.some(
        (sysConf) =>
          sysConf.idConfig === currentConfigId &&
          sysConf.config?.isActive === true,
      );

    // Conserva una configuración válida existente,
    // especialmente cuando se edita una pieza.
    if (currentConfigIsAvailable) return;

    const defaultConfigId = Number(selectedSystem.defaultConfigId || 0);

    const defaultConfigIsAvailable =
      defaultConfigId > 0 &&
      availableSysConfs.some(
        (sysConf) =>
          sysConf.idConfig === defaultConfigId &&
          sysConf.config?.isActive === true,
      );

    const nextConfigId = defaultConfigIsAvailable ? defaultConfigId : 0;

    if (currentConfigId === nextConfigId) return;

    setValue("idConf", nextConfigId, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [systemId, idConf, selectedSystem, availableSysConfs, setValue]);

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

    const orderByConfigId = new Map(
      availableSysConfs.map((sysConf) => [sysConf.idConfig, sysConf.sortOrder]),
    );

    const sortConfigs = (items: Config[]) =>
      [...items].sort((a, b) => {
        const orderA = orderByConfigId.get(a.id) ?? Number.MAX_SAFE_INTEGER;

        const orderB = orderByConfigId.get(b.id) ?? Number.MAX_SAFE_INTEGER;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.conf.localeCompare(b.conf);
      });

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
  }, [availableConfigs, availableSysConfs]);

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

  const selectedConfigUnavailable =
    selectedSysConf?.isSelectableInEstimate === false;

  const dimensionMode = selectedSysConf?.dimensionMode ?? "STANDARD";
  const isStandardDimensionMode = dimensionMode === "STANDARD";

  const fixedPanelCount = useMemo(() => {
    if (selectedConfig?.fixedPanelCount == null) return null;

    const value = Number(selectedConfig.fixedPanelCount);

    return Number.isInteger(value) && value >= 1 ? value : null;
  }, [selectedConfig?.fixedPanelCount]);

  const dimensionRequirements = useMemo<PieceDimensionRequirements>(() => {
    if (isLinearMaterial) {
      return {
        requiresWidth: !!selectedSysConf?.requiresWidth,
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
        requiresWindowHeight: !!selectedConfig?.requiresWindowHeight,

        requiresDoorWidth: false,
        requiresDoorHeight: false,
        requiresLeftSideliteWidth: false,
        requiresRightSideliteWidth: false,
        requiresLeftPanels: false,
        requiresRightPanels: false,
        requiresPanelCount:
          fixedPanelCount !== null || !!selectedSysConf?.requiresPanelCount,
        requiresHorizontalHeights: false,
      };
    }

    return {
      requiresWidth: !!selectedSysConf?.requiresWidth,
      requiresHeight: !!selectedSysConf?.requiresHeight,
      requiresHeightLeft: !!selectedSysConf?.requiresHeightLeft,
      requiresHeightRight: !!selectedSysConf?.requiresHeightRight,

      // Estos tres campos pertenecen exclusivamente a Config + STANDARD.
      requiresLegHeight: false,
      requiresSashHeight: false,
      requiresWindowHeight: false,

      requiresDoorWidth: !!selectedSysConf?.requiresDoorWidth,
      requiresDoorHeight: !!selectedSysConf?.requiresDoorHeight,
      requiresLeftSideliteWidth: !!selectedSysConf?.requiresLeftSideliteWidth,
      requiresRightSideliteWidth: !!selectedSysConf?.requiresRightSideliteWidth,
      requiresLeftPanels: !!selectedSysConf?.requiresLeftPanels,
      requiresRightPanels: !!selectedSysConf?.requiresRightPanels,
      requiresPanelCount:
        fixedPanelCount !== null || !!selectedSysConf?.requiresPanelCount,
      requiresHorizontalHeights: !!selectedSysConf?.requiresHorizontalHeights,
    };
  }, [
    isStandardDimensionMode,
    selectedConfig,
    selectedSysConf,
    isLinearMaterial,
    fixedPanelCount,
  ]);

  const requiresManualPanelCount =
    dimensionRequirements.requiresPanelCount && fixedPanelCount === null;

  const screenAllowed = isLinearMaterial
    ? false
    : (selectedSysConf?.allowScreen ?? false);

  const highBottomAllowed = isLinearMaterial
    ? false
    : selectedSystem?.allowHighBottom === true;
  const requiresSashHeight = dimensionRequirements.requiresSashHeight === true;

  const requiresWindowHeight =
    dimensionRequirements.requiresWindowHeight === true;

  const widthLabel = dimensionRequirements.requiresDoorWidth
    ? "Opening Width"
    : "Width";

  const heightLabel = requiresWindowHeight
    ? "Open Height"
    : dimensionRequirements.requiresDoorHeight
      ? "Opening Height"
      : "Height";

  useEffect(() => {
    if (!selectedConfig || !selectedSysConf) return;

    if (fixedPanelCount !== null) {
      const currentPanelCount = Number(getValues("panelCount"));

      if (currentPanelCount !== fixedPanelCount) {
        setValue("panelCount", fixedPanelCount, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    }

    for (const [field, requirement] of STRING_DIMENSION_FIELDS) {
      const current = getValues(field);

      if (
        !dimensionRequirements[requirement] &&
        current !== "" &&
        current != null
      ) {
        setValue(field, "", {
          shouldDirty: true,
          shouldValidate: false,
        });
      }
    }

    for (const [field, requirement] of NUMBER_DIMENSION_FIELDS) {
      const current = getValues(field);

      if (!dimensionRequirements[requirement] && current != null) {
        setValue(field, null, {
          shouldDirty: true,
          shouldValidate: false,
        });
      }
    }

    const currentHorizontalHeights = getValues("horizontalHeights");

    if (
      !dimensionRequirements.requiresHorizontalHeights &&
      currentHorizontalHeights != null
    ) {
      setValue("horizontalHeights", null, {
        shouldDirty: true,
        shouldValidate: false,
      });
    }
  }, [
    selectedConfig,
    selectedSysConf,
    dimensionRequirements,
    fixedPanelCount,
    getValues,
    setValue,
  ]);

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

  const selectedActiveOptionId = Number(pieceValues.idActiveOption);
  const selectedActiveOption = availableActiveOptions.find(
    (option) => option.id === selectedActiveOptionId,
  );
  const selectedActiveOptionName = selectedActiveOption?.name ?? null;

  const selectedPreparationOptionName =
    availablePreparationOptions.find(
      (option) =>
        Number(option.id) === Number(pieceValues.idPreparationOption),
    )?.name ?? null;

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

  const selectedCrystalId = Number(pieceValues.idCryst || 0);

  const selectedCrystalUnavailable =
    !isLinearMaterial &&
    Boolean(systemId) &&
    Boolean(idConf) &&
    selectedCrystalId > 0 &&
    !isLoadingDimensionPolicies &&
    (!reinforcementRequired || Boolean(selectedReinforcementOptionId)) &&
    !availableCrystals.some((crystal) => crystal.id === selectedCrystalId);

  const crystalSelectOptions = useMemo(() => {
    if (!selectedCrystalUnavailable) {
      return availableCrystals;
    }

    const selectedCrystal =
      systemCrystalOptions.find(
        (crystal) => crystal.id === selectedCrystalId,
      ) ?? props.crystals.find((crystal) => crystal.id === selectedCrystalId);

    if (!selectedCrystal) {
      return availableCrystals;
    }

    return [
      selectedCrystal,
      ...availableCrystals.filter(
        (crystal) => crystal.id !== selectedCrystalId,
      ),
    ];
  }, [
    selectedCrystalUnavailable,
    selectedCrystalId,
    systemCrystalOptions,
    availableCrystals,
    props.crystals,
  ]);

  useEffect(() => {
    if (!systemId || !idConf) return;
    if (isLocked) return;
    if (isLoadingDimensionPolicies) return;

    // comentario en español: si la configuración usa reinforcement,
    // no tocamos el crystal hasta que el usuario tenga un reinforcement seleccionado.
    if (reinforcementRequired && !selectedReinforcementOptionId) return;

    const currentCrystalId = Number(getValues("idCryst") || 0);

    // Conserva una selección existente aunque temporalmente no esté disponible.
    // El usuario tendrá que escoger manualmente otra opción para recalcular.
    if (currentCrystalId > 0) {
      return;
    }

    if (availableCrystals.length === 0) {
      return;
    }

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

  const dealerMarkupField = register("dealerMarkup", {
    valueAsNumber: true,
    min: 0,
  });

  const previousSysConfKeyRef = useRef(
    Number(initialData.idSyst || 0) && Number(initialData.idConf || 0)
      ? `${Number(initialData.idSyst)}:${Number(initialData.idConf)}`
      : "",
  );

  useEffect(() => {
    const defaultItems = [
      "item-frame",
      "item-details-size",
      ...(hasOptionsSection || !isLinearMaterial ? ["item-options"] : []),
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
    const currentSystemId = Number(systemId || 0);
    const currentConfigId = Number(idConf || 0);

    const currentSysConfKey =
      currentSystemId && currentConfigId
        ? `${currentSystemId}:${currentConfigId}`
        : "";

    if (!currentConfigId) {
      previousSysConfKeyRef.current = "";

      setValue("panelCount", null, {
        shouldDirty: true,
        shouldValidate: false,
      });

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
      previousSysConfKeyRef.current = currentSysConfKey;

      setValue("panelCount", null, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue("screen", false, { shouldDirty: true });
      setValue("highBottom", false, { shouldDirty: true });
      setValue("highBottomPercent", null, { shouldDirty: true });

      setValue("idCryst", 0, { shouldDirty: true, shouldValidate: false });
      setValue("idTint", 0, { shouldDirty: true, shouldValidate: false });
      setValue("idCoat", 0, { shouldDirty: true, shouldValidate: false });
      setValue("idPrivacy", 0, { shouldDirty: true, shouldValidate: false });

      setValue("muntin", null, { shouldDirty: true });
      setValue("idActiveOption", null, { shouldDirty: true });
      setValue("idPreparationOption", null, { shouldDirty: true });
      setValue("idSillOption", null, { shouldDirty: true });
      setValue("idReinforcementOption", null, { shouldDirty: true });

      return;
    }

    if (previousSysConfKeyRef.current === currentSysConfKey) {
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

    previousSysConfKeyRef.current = currentSysConfKey;

    setValue("panelCount", fixedPanelCount, {
      shouldDirty: true,
      shouldValidate: false,
    });
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
    systemId,
    idConf,
    selectedConfig,
    fixedPanelCount,
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
      if (selectedConfigUnavailable) {
        toast.error(
          "The selected configuration is currently unavailable in estimates.",
        );
        return;
      }
      if (!isLinearMaterial && selectedCrystalUnavailable) {
        toast.error(
          "The selected glass is currently unavailable. Select another glass before recalculating.",
        );
        return;
      }
      const fieldsToValidate: (keyof PieceFormValues)[] = [
        "idProd",
        "idBrand",
        "idSyst",
        "idConf",
        "idFC",
        "qty",
      ];

      if (!isLinearMaterial) {
        fieldsToValidate.push("idCryst", "idTint", "idCoat", "idPrivacy");
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
      if (dimensionRequirements.requiresSashHeight) {
        fieldsToValidate.push("sashHeight");
      }

      if (dimensionRequirements.requiresWindowHeight) {
        fieldsToValidate.push("windowHeight");
      }

      if (dimensionRequirements.requiresDoorWidth) {
        fieldsToValidate.push("doorWidth");
      }
      if (dimensionRequirements.requiresDoorHeight)
        fieldsToValidate.push("doorHeight");
      if (dimensionRequirements.requiresLeftSideliteWidth)
        fieldsToValidate.push("leftSideliteWidth");
      if (dimensionRequirements.requiresRightSideliteWidth)
        fieldsToValidate.push("rightSideliteWidth");
      if (dimensionRequirements.requiresLeftPanels)
        fieldsToValidate.push("leftPanels");
      if (dimensionRequirements.requiresRightPanels)
        fieldsToValidate.push("rightPanels");
      if (requiresManualPanelCount) fieldsToValidate.push("panelCount");

      const isValid = await trigger(fieldsToValidate);

      if (!isValid) {
        toast.error("Please complete the required fields before calculating.");
        return;
      }

      const currentValues = withoutInactiveDimensions(
        getValues(),
        dimensionRequirements,
      );

      if (!selectedConfig) {
        toast.error("Please select a configuration first.");
        return;
      }

      const widthNorm = dimensionRequirements.requiresWidth
        ? normalizeInchesToEighthStep(currentValues.width, widthLabel, 1)
        : undefined;

      const heightNorm = dimensionRequirements.requiresHeight
        ? normalizeInchesToEighthStep(currentValues.height, heightLabel, 1)
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

      const windowHeightNorm = dimensionRequirements.requiresWindowHeight
        ? normalizeInchesToEighthStep(
            currentValues.windowHeight,
            "Window Height",
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
          toast.error(`${heightLabel} is required to validate Sash Height.`);
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

      // Window Height validation
      if (windowHeightNorm !== undefined) {
        const openHeightForWindow =
          heightNorm !== undefined
            ? heightNorm
            : Number(currentValues.height || 0);

        if (!Number.isFinite(openHeightForWindow) || openHeightForWindow <= 0) {
          toast.error("Open Height is required to validate Window Height.");
          return;
        }

        if (windowHeightNorm >= openHeightForWindow) {
          toast.error("Window Height must be less than Open Height.");
          return;
        }
      }

      const doorWidthNorm = dimensionRequirements.requiresDoorWidth
        ? normalizeInchesToEighthStep(currentValues.doorWidth, "Door Width", 1)
        : undefined;

      const doorHeightNorm = dimensionRequirements.requiresDoorHeight
        ? normalizeInchesToEighthStep(
            currentValues.doorHeight,
            "Door Height",
            1,
          )
        : undefined;

      if (doorHeightNorm !== undefined) {
        const openingHeightForDoor =
          heightNorm !== undefined
            ? heightNorm
            : Number(currentValues.height || 0);

        if (
          !Number.isFinite(openingHeightForDoor) ||
          openingHeightForDoor <= 0
        ) {
          toast.error(`${heightLabel} is required to validate Door Height.`);
          return;
        }

        if (doorHeightNorm > openingHeightForDoor) {
          toast.error(`Door Height cannot be greater than ${heightLabel}.`);
          return;
        }
      }

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

      const horizontalHeightsNorm =
        dimensionRequirements.requiresHorizontalHeights
          ? (Array.isArray(currentValues.horizontalHeights)
              ? currentValues.horizontalHeights
              : []
            ).map((value, idx) =>
              normalizeInchesToEighthStep(
                String(value),
                `Horizontal Height ${idx + 1}`,
                1,
              ),
            )
          : undefined;

      if (
        dimensionRequirements.requiresHorizontalHeights &&
        horizontalHeightsNorm &&
        horizontalHeightsNorm.length > 0
      ) {
        const totalHeightForHorizontals =
          heightNorm !== undefined
            ? heightNorm
            : Number(currentValues.height || 0);

        if (
          !Number.isFinite(totalHeightForHorizontals) ||
          totalHeightForHorizontals <= 0
        ) {
          toast.error(
            `${heightLabel} is required to validate Horizontal Heights.`,
          );
          return;
        }

        const sortedHorizontalHeights = [...horizontalHeightsNorm].sort(
          (a, b) => a - b,
        );

        const outOfRangeIndex = sortedHorizontalHeights.findIndex(
          (value) => value <= 0 || value >= totalHeightForHorizontals,
        );

        if (outOfRangeIndex !== -1) {
          toast.error(
            `Horizontal Height ${outOfRangeIndex + 1} must be greater than 0 and less than ${heightLabel}.`,
          );
          return;
        }

        const duplicatedIndex = sortedHorizontalHeights.findIndex(
          (value, idx) => idx > 0 && value === sortedHorizontalHeights[idx - 1],
        );

        if (duplicatedIndex !== -1) {
          toast.error("Horizontal Heights cannot contain duplicate positions.");
          return;
        }

        const horizontalPoints = [
          0,
          ...sortedHorizontalHeights,
          totalHeightForHorizontals,
        ];

        const invalidGapIndex = horizontalPoints.findIndex((point, idx) => {
          if (idx === 0) return false;
          return point - horizontalPoints[idx - 1] < MIN_HORIZONTAL_HEIGHT_IN;
        });

        if (invalidGapIndex !== -1) {
          const from = horizontalPoints[invalidGapIndex - 1];
          const to = horizontalPoints[invalidGapIndex];

          toast.error(
            `The space between ${from}" and ${to}" cannot be less than ${MIN_HORIZONTAL_HEIGHT_IN} inches.`,
          );
          return;
        }
      }

      if (widthNorm !== undefined) setValue("width", String(widthNorm));
      if (heightNorm !== undefined) setValue("height", String(heightNorm));
      if (heightLeftNorm !== undefined)
        setValue("heightLeft", String(heightLeftNorm));
      if (heightRightNorm !== undefined)
        setValue("heightRight", String(heightRightNorm));
      if (legHeightNorm !== undefined) {
        setValue("legHeight", String(legHeightNorm));
      }

      if (sashHeightNorm !== undefined) {
        setValue("sashHeight", String(sashHeightNorm));
      }

      if (windowHeightNorm !== undefined) {
        setValue("windowHeight", String(windowHeightNorm));
      }

      if (doorWidthNorm !== undefined) {
        setValue("doorWidth", String(doorWidthNorm));
      }

      if (doorHeightNorm !== undefined) {
        setValue("doorHeight", String(doorHeightNorm));
      }

      if (leftSideliteWidthNorm !== undefined) {
        setValue("leftSideliteWidth", String(leftSideliteWidthNorm));
      }

      if (rightSideliteWidthNorm !== undefined) {
        setValue("rightSideliteWidth", String(rightSideliteWidthNorm));
      }

      if (horizontalHeightsNorm !== undefined) {
        setValue("horizontalHeights", horizontalHeightsNorm, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      const resolvedPanelCountForRequest =
        fixedPanelCount ??
        (requiresManualPanelCount
          ? Number(currentValues.panelCount || 0)
          : undefined);

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

        windowHeight:
          windowHeightNorm !== undefined ? String(windowHeightNorm) : undefined,

        doorWidth:
          doorWidthNorm !== undefined ? String(doorWidthNorm) : undefined,
        doorHeight:
          doorHeightNorm !== undefined ? String(doorHeightNorm) : undefined,
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
        panelCount: resolvedPanelCountForRequest,
        horizontalHeights: dimensionRequirements.requiresHorizontalHeights
          ? horizontalHeightsNorm
          : undefined,
        idCryst: isLinearMaterial ? null : Number(currentValues.idCryst),
        idTint: isLinearMaterial ? null : Number(currentValues.idTint),
        idCoat: isLinearMaterial ? null : Number(currentValues.idCoat),
        idPrivacy: isLinearMaterial ? null : Number(currentValues.idPrivacy),
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
          windowHeight: windowHeightNorm,

          doorWidth: doorWidthNorm,
          doorHeight: doorHeightNorm,
          leftSideliteWidth: leftSideliteWidthNorm,
          rightSideliteWidth: rightSideliteWidthNorm,
          leftPanels: pieceDtoToSend.leftPanels ?? undefined,
          rightPanels: pieceDtoToSend.rightPanels ?? undefined,
          panelCount: pieceDtoToSend.panelCount ?? undefined,
          horizontalHeights: horizontalHeightsNorm ?? undefined,
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

      const calculated = await calculatePiece(pieceDtoToSend, props.estimateId);

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
      setValue("panelCount", calculated.panelCount ?? null, {
        shouldDirty: true,
        shouldValidate: false,
      });

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

  const currentHorizontalHeights = useMemo(() => {
    return Array.isArray(pieceValues.horizontalHeights)
      ? pieceValues.horizontalHeights
      : [];
  }, [pieceValues.horizontalHeights]);

  const handleAddHorizontalHeight = () => {
    const current = Array.isArray(getValues("horizontalHeights"))
      ? (getValues("horizontalHeights") ?? [])
      : [];

    setValue("horizontalHeights", [...current, MIN_HORIZONTAL_HEIGHT_IN], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleRemoveHorizontalHeight = (heightIndex: number) => {
    const current = Array.isArray(getValues("horizontalHeights"))
      ? (getValues("horizontalHeights") ?? [])
      : [];

    const next = current.filter((_, idx) => idx !== heightIndex);

    setValue("horizontalHeights", next.length > 0 ? next : null, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleHorizontalHeightChange = (
    heightIndex: number,
    rawValue: string,
  ) => {
    const current = Array.isArray(getValues("horizontalHeights"))
      ? (getValues("horizontalHeights") ?? [])
      : [];

    const numericValue = Number(rawValue || 0);

    const next = [...current];
    next[heightIndex] = Number.isFinite(numericValue) ? numericValue : 0;

    setValue("horizontalHeights", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const fieldLabelClass = "mb-2 block text-sm font-semibold text-slate-800";

  const selectTriggerClass =
    "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm justify-between";

  const inputClass =
    "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-none";

  const checkboxClass =
    "h-5 w-5 border-2 border-slate-400 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-white data-[state=checked]:text-emerald-600 disabled:data-[state=checked]:border-emerald-500 disabled:data-[state=checked]:bg-white disabled:data-[state=checked]:text-emerald-500";

  return (
    <form
      className="relative flex min-h-0 flex-1 flex-col"
      onSubmit={handleSubmit((values) =>
        onSubmit(withoutInactiveDimensions(values, dimensionRequirements)),
      )}
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-8 overflow-y-auto p-1 pb-40 sm:pb-24 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          <Accordion
            type="multiple"
            value={activeAccordionItems}
            onValueChange={setActiveAccordionItems}
            className="w-full"
          >
            <AccordionItem value="item-frame">
              <PieceSectionHeader title="Product Specifications" />

              <AccordionContent>
                <div
                  className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-3 ${
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
                            setValue("windowHeight", "");
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
                            setValue("windowHeight", "");
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

                            field.onChange(nextSystemId);

                            setValue("idConf", 0, {
                              shouldDirty: true,
                              shouldValidate: false,
                            });

                            setValue("idReinforcementOption", null);
                            setValue("highBottom", false);
                            setValue("highBottomPercent", null);
                            setValue("sashHeight", "");
                            setValue("windowHeight", "");

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

                            setValue("idCryst", 0, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
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
                            setValue("idCryst", 0, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });

                            setValue("sashHeight", "");
                            setValue("windowHeight", "");
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
                    {!errors.idConf && selectedConfigUnavailable && (
                      <p className="mt-1 text-xs text-red-500">
                        This configuration is currently unavailable. Select
                        another configuration before recalculating.
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
                                <ColorSelectOption
                                  label={fc.color}
                                  hexCode={fc.hexCode}
                                />
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

                  {!isLinearMaterial && (
                    <>
                      <div>
                        <Label className={fieldLabelClass}>Tint</Label>
                        <Controller
                          name="idTint"
                          control={control}
                          rules={{ required: true, min: 1 }}
                          render={({ field }) => (
                            <Select
                              disabled={isLocked || !brandId}
                              onValueChange={(v) => field.onChange(Number(v))}
                              value={String(field.value || "0")}
                            >
                              <SelectTrigger className={selectTriggerClass}>
                                <SelectValue placeholder="Select tint" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableTints.map((t) => (
                                  <SelectItem key={t.id} value={String(t.id)}>
                                    <ColorSelectOption
                                      label={t.color}
                                      hexCode={t.hexCode}
                                    />
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
                        {!errors.idTint &&
                          Number(brandId) > 0 &&
                          availableTints.length === 0 && (
                            <p className="mt-1 text-xs text-red-500">
                              No active Tint is configured for this Brand.
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
                              disabled={isLocked || !brandId}
                              onValueChange={(v) => field.onChange(Number(v))}
                              value={String(field.value || "0")}
                            >
                              <SelectTrigger className={selectTriggerClass}>
                                <SelectValue placeholder="Select coating" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableCoatings.map((c) => (
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
                        {!errors.idCoat &&
                          Number(brandId) > 0 &&
                          availableCoatings.length === 0 && (
                            <p className="mt-1 text-xs text-red-500">
                              No active Coating is configured for this Brand.
                            </p>
                          )}
                      </div>

                      <div>
                        <Label className={fieldLabelClass}>Privacy</Label>
                        <Controller
                          name="idPrivacy"
                          control={control}
                          rules={{ required: true, min: 1 }}
                          render={({ field }) => (
                            <Select
                              disabled={isLocked || !brandId}
                              onValueChange={(value) =>
                                field.onChange(Number(value))
                              }
                              value={String(field.value || "0")}
                            >
                              <SelectTrigger className={selectTriggerClass}>
                                <SelectValue placeholder="Select privacy" />
                              </SelectTrigger>
                              <SelectContent>
                                {availablePrivacies.map((privacy) => (
                                  <SelectItem
                                    key={privacy.id}
                                    value={String(privacy.id)}
                                  >
                                    {privacy.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.idPrivacy && (
                          <p className="mt-1 text-xs text-red-500">
                            Privacy required
                          </p>
                        )}
                        {!errors.idPrivacy &&
                          Number(brandId) > 0 &&
                          availablePrivacies.length === 0 && (
                            <p className="mt-1 text-xs text-red-500">
                              No active Privacy is configured for this Brand.
                            </p>
                          )}
                      </div>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-details-size">
              <PieceSectionHeader title="Details & Size" />
              <AccordionContent>
                <div className={`pt-3 ${isLocked ? "opacity-70" : ""}`}>
                  <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <Label className={fieldLabelClass}>Mark</Label>
                      <Input
                        className={inputClass}
                        disabled={isLocked}
                        {...register("mark")}
                      />
                      {errors.mark && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.mark.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className={fieldLabelClass}>Quantity</Label>
                      <Input
                        className={inputClass}
                        type="number"
                        disabled={isLocked}
                        {...register("qty", {
                          required: "Qty is required",
                          valueAsNumber: true,
                          min: { value: 1, message: "Min qty is 1" },
                        })}
                      />
                      {errors.qty && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.qty.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {!idConf && (
                    <p className="text-sm text-muted-foreground">
                      Select a configuration to see required dimensions.
                    </p>
                  )}

                  {Number(idConf) > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-4">
                        {dimensionRequirements.requiresWidth && (
                          <div className="min-w-0">
                            <Label className={fieldLabelClass}>
                              {widthLabel} (inches)
                            </Label>
                            <Input
                              className={inputClass}
                              autoComplete="off"
                              type="text"
                              disabled={isLocked}
                              {...register("width", {
                                required: `${widthLabel} is required`,
                              })}
                              onBlur={(e) => {
                                const raw = e.target.value;
                                if (!raw) return;
                                try {
                                  const v = normalizeInchesToEighthStep(
                                    raw,
                                    widthLabel,
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
                          <div className="min-w-0">
                            <Label className={fieldLabelClass}>
                              {heightLabel} (inches)
                            </Label>
                            <Input
                              className={inputClass}
                              autoComplete="off"
                              type="text"
                              disabled={isLocked}
                              {...register("height", {
                                required: `${heightLabel} is required`,
                              })}
                              onBlur={(e) => {
                                const raw = e.target.value;
                                if (!raw) return;
                                try {
                                  const v = normalizeInchesToEighthStep(
                                    raw,
                                    heightLabel,
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
                          <div className="min-w-0">
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

                        {dimensionRequirements.requiresWindowHeight && (
                          <div className="min-w-0">
                            <Label className={fieldLabelClass}>
                              Window Height (inches)
                            </Label>

                            <Input
                              className={inputClass}
                              autoComplete="off"
                              type="text"
                              disabled={isLocked}
                              {...register("windowHeight", {
                                required: "Window Height is required",
                              })}
                              onBlur={(e) => {
                                const raw = e.target.value;
                                if (!raw) return;

                                try {
                                  const value = normalizeInchesToEighthStep(
                                    raw,
                                    "Window Height",
                                    1,
                                  );

                                  setValue("windowHeight", String(value), {
                                    shouldValidate: true,
                                  });
                                } catch (error) {
                                  if (error instanceof DimensionParseError) {
                                    toast.error(error.message);
                                  }
                                }
                              }}
                            />

                            {errors.windowHeight && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors.windowHeight.message}
                              </p>
                            )}

                            <p className="mt-1 text-xs text-muted-foreground">
                              Height of the upper Single Hung. Must be less than
                              Open Height.
                            </p>
                          </div>
                        )}

                        {dimensionRequirements.requiresHeightLeft && (
                          <div className="min-w-0">
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
                          <div className="min-w-0">
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
                          <div className="min-w-0">
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
                          <div className="min-w-0">
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

                        {dimensionRequirements.requiresDoorHeight && (
                          <div className="min-w-0">
                            <Label className={fieldLabelClass}>
                              Door Height (inches)
                            </Label>
                            <Input
                              className={inputClass}
                              autoComplete="off"
                              type="text"
                              disabled={isLocked}
                              {...register("doorHeight", {
                                required: "Door Height is required",
                              })}
                              onBlur={(e) => {
                                const raw = e.target.value;
                                if (!raw) return;

                                try {
                                  const v = normalizeInchesToEighthStep(
                                    raw,
                                    "Door Height",
                                    1,
                                  );

                                  setValue("doorHeight", String(v), {
                                    shouldValidate: true,
                                  });
                                } catch (err) {
                                  if (err instanceof DimensionParseError) {
                                    toast.error(err.message);
                                  }
                                }
                              }}
                            />
                            {errors.doorHeight && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors.doorHeight.message}
                              </p>
                            )}
                          </div>
                        )}

                        {dimensionRequirements.requiresLeftSideliteWidth && (
                          <div className="min-w-0">
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
                          <div className="min-w-0">
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
                          <div className="min-w-0 xl:max-w-40">
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
                          <div className="min-w-0 xl:max-w-40">
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

                        {fixedPanelCount !== null && (
                          <div className="min-w-0 xl:max-w-40">
                            <Label className={fieldLabelClass}>
                              Panel Count
                            </Label>
                            <Input
                              className={inputClass}
                              type="number"
                              value={fixedPanelCount}
                              disabled
                              readOnly
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                              Automatic from configuration.
                            </p>
                          </div>
                        )}

                        {requiresManualPanelCount && (
                          <div className="min-w-0 xl:max-w-40">
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

                        {dimensionRequirements.requiresHorizontalHeights && (
                          <div className="w-full max-w-[640px] rounded-md border border-slate-200 bg-white md:col-span-2">
                            <div className="flex items-center justify-between border-b bg-slate-50 px-3 py-2">
                              <div>
                                <Label className="text-sm font-semibold text-slate-800">
                                  Horizontal Heights
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Positions from bottom. Min spacing{" "}
                                  {MIN_HORIZONTAL_HEIGHT_IN}
                                  &quot;.
                                </p>
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isLocked}
                                onClick={handleAddHorizontalHeight}
                                className="h-8 px-3"
                              >
                                Add
                              </Button>
                            </div>

                            {currentHorizontalHeights.length === 0 ? (
                              <div className="px-3 py-3 text-sm text-slate-600">
                                No horizontal heights added.
                              </div>
                            ) : (
                              <div className="divide-y divide-slate-100">
                                {currentHorizontalHeights.map(
                                  (value, heightIndex) => (
                                    <div
                                      key={heightIndex}
                                      className="grid grid-cols-[120px_minmax(120px,180px)_40px] items-center gap-3 px-3 py-2"
                                    >
                                      <Label className="text-sm font-medium text-slate-700">
                                        Horizontal {heightIndex + 1}
                                      </Label>

                                      <Input
                                        className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-none"
                                        autoComplete="off"
                                        type="text"
                                        disabled={isLocked}
                                        value={
                                          Number.isFinite(Number(value))
                                            ? String(value)
                                            : ""
                                        }
                                        onChange={(e) =>
                                          handleHorizontalHeightChange(
                                            heightIndex,
                                            e.target.value,
                                          )
                                        }
                                        onBlur={(e) => {
                                          const raw = e.target.value;
                                          if (!raw) return;

                                          try {
                                            const normalized =
                                              normalizeInchesToEighthStep(
                                                raw,
                                                `Horizontal Height ${heightIndex + 1}`,
                                                1,
                                              );

                                            if (
                                              normalized <
                                              MIN_HORIZONTAL_HEIGHT_IN
                                            ) {
                                              toast.error(
                                                `Horizontal ${heightIndex + 1} must be at least ${MIN_HORIZONTAL_HEIGHT_IN} inches from the bottom.`,
                                              );
                                              return;
                                            }

                                            handleHorizontalHeightChange(
                                              heightIndex,
                                              String(normalized),
                                            );
                                          } catch (err) {
                                            if (
                                              err instanceof DimensionParseError
                                            ) {
                                              toast.error(err.message);
                                            }
                                          }
                                        }}
                                      />

                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={isLocked}
                                        onClick={() =>
                                          handleRemoveHorizontalHeight(
                                            heightIndex,
                                          )
                                        }
                                        className="h-8 w-8 px-0 text-red-600 hover:text-red-700"
                                        aria-label={`Remove Horizontal Height ${heightIndex + 1}`}
                                      >
                                        ×
                                      </Button>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {!Object.values(dimensionRequirements).some(
                          Boolean,
                        ) && (
                          <p className="text-sm text-muted-foreground md:col-span-2 xl:col-span-4">
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

            {(hasOptionsSection || !isLinearMaterial) && (
              <AccordionItem value="item-options">
                <PieceSectionHeader title="Options" />
                <AccordionContent>
                  <div
                    className={`space-y-4 pt-4 ${isLocked ? "opacity-70" : ""}`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      {!isLinearMaterial && (
                        <div>
                          <Label className={fieldLabelClass}>Glass Type</Label>
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
                                  {crystalSelectOptions.map((crystal) => {
                                    const isUnavailableOption =
                                      selectedCrystalUnavailable &&
                                      crystal.id === selectedCrystalId;

                                    return (
                                      <SelectItem
                                        key={crystal.id}
                                        value={String(crystal.id)}
                                        disabled={isUnavailableOption}
                                      >
                                        {crystal.glass}
                                        {isUnavailableOption
                                          ? " (Unavailable)"
                                          : ""}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.idCryst && (
                            <p className="mt-1 text-xs text-red-500">
                              Glass type required
                            </p>
                          )}
                          {!errors.idCryst && selectedCrystalUnavailable && (
                            <p className="mt-1 text-xs text-red-500">
                              This glass is currently unavailable. Select another
                              glass before recalculating.
                            </p>
                          )}
                          {!errors.idCryst &&
                            Number(systemId) > 0 &&
                            Number(idConf) > 0 &&
                            reinforcementRequired &&
                            !selectedReinforcementOptionId && (
                              <p className="mt-1 text-xs text-amber-600">
                                Select a Reinforcement option first.
                              </p>
                            )}

                          {!errors.idCryst &&
                            !selectedCrystalUnavailable &&
                            Number(systemId) > 0 &&
                            Number(idConf) > 0 &&
                            !isLoadingDimensionPolicies &&
                            (!reinforcementRequired ||
                              Boolean(selectedReinforcementOptionId)) &&
                            availableCrystals.length === 0 && (
                              <p className="mt-1 text-xs text-red-500">
                                {reinforcementRequired
                                  ? "No rated glass is available for this System + Config + Reinforcement."
                                  : "No rated glass is available for this System + Config."}
                              </p>
                            )}
                        </div>
                      )}

                      {availableActiveOptions.length > 0 && (
                        <div>
                          <Label className={fieldLabelClass}>Active</Label>
                          <Controller
                            name="idActiveOption"
                            control={control}
                            rules={{ required: "Active option is required" }}
                            render={({ field }) => (
                              <Select
                                disabled={isLocked}
                                onValueChange={(value) => {
                                  const nextOption =
                                    availableActiveOptions.find(
                                      (option) => String(option.id) === value,
                                    ) ?? null;

                                  field.onChange(nextOption?.id ?? null);
                                }}
                                key={`${idConf}-${field.name}-${field.value ?? "empty"}`}
                                value={
                                  field.value == null
                                    ? undefined
                                    : String(field.value)
                                }
                              >
                                <SelectTrigger className={selectTriggerClass}>
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
                        <div className="xl:col-span-2">
                          <Label className={fieldLabelClass}>Preparation</Label>
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
                                <SelectTrigger className={selectTriggerClass}>
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
                    </div>

                    {highBottomAllowed && (
                      <div className="flex flex-col gap-2">
                        <Controller
                          name="highBottom"
                          control={control}
                          render={({ field }) => (
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`highBottom-${index}`}
                                className={checkboxClass}
                                checked={field.value === true}
                                onCheckedChange={(v) =>
                                  field.onChange(v === true)
                                }
                                disabled={isLocked}
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
                                className={checkboxClass}
                                checked={!!field.value}
                                onCheckedChange={(v) =>
                                  field.onChange(Boolean(v))
                                }
                                disabled={isLocked}
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

                    {(availableSillOptions.length > 0 ||
                      availableReinforcementOptions.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    )}
                    {!isLinearMaterial && (
                      <div className="pb-4 text-sm">
                            {!selectedConfig ? (
                              <div>
                                <Label className={fieldLabelClass}>Muntin</Label>
                                <p className="text-sm text-muted-foreground">
                                  Select a configuration first to configure muntin.
                                </p>
                              </div>
                            ) : !currentMuntin ? (
                              <div>
                                <Label className={fieldLabelClass}>Muntin</Label>
                                <p className="text-sm text-muted-foreground">
                                  Muntin will be initialized automatically for this
                                  configuration.
                                </p>
                              </div>
                            ) : (
                              <div
                                className={`space-y-4 pt-3 ${isLocked ? "opacity-70" : ""}`}
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <div>
                                    <Label className={fieldLabelClass}>Muntin</Label>
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
                                      <Label className={fieldLabelClass}>
                                        Muntin Type
                                      </Label>
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
                </AccordionContent>
              </AccordionItem>
            )}

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
                              onBlur={(e) => {
                                dealerMarkupField.onBlur(e);

                                if (hasPendingDealerMarkup) {
                                  void handleCalculate();
                                }
                              }}
                            />
                          </div>

                          <span className="text-xs text-slate-500">
                            Updates automatically when you leave the field.
                          </span>
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
            <div className="flex h-[clamp(400px,65vh,640px)] items-center justify-center overflow-hidden rounded-lg border bg-slate-50 p-4">
              <PieceDiagram
                variant="editor"
                diagramFamily={selectedProduct?.diagramFamily}
                systemName={selectedSystem?.name}
                brandName={selectedSystem?.brandProduct?.brand?.name}
                configuration={selectedConfig?.conf}
                diagramSpec={selectedConfig?.diagramSpec}
                dimensionMode={dimensionMode}
                piece={pieceValues}
                frameColorHex={selectedFrameColorHex}
                glassTintHex={selectedTintHex}
                hasCoating={hasCoating}
                hasPrivacy={hasPrivacy}
                screenEnabled={Boolean(pieceValues.screen)}
                activeOptionName={selectedActiveOptionName}
                preparationOptionName={selectedPreparationOptionName}
              />
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="absolute -bottom-3 right-6 z-20 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-md backdrop-blur-sm max-sm:left-3 max-sm:right-3">
        <Button
          type="button"
          variant="outline"
          className="border-red-200 bg-red-50 text-red-700 shadow-none hover:bg-red-100 hover:text-red-800"
          onClick={onCancel}
        >
          Cancel
        </Button>

        {isLocked ? (
          <Button
            type="button"
            variant="secondary"
            className="border border-amber-200 bg-amber-100 text-amber-800 shadow-none hover:bg-amber-200"
            onClick={handleUnlock}
          >
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="border border-blue-200 bg-blue-100 text-blue-800 shadow-none hover:bg-blue-200"
            onClick={handleCalculate}
          >
            <Calculator className="mr-2 h-4 w-4" /> Calculate
          </Button>
        )}

        <Button
          type="submit"
          variant="green"
          disabled={!isLocked || isSubmitting || hasPendingDealerMarkup}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit
        </Button>
      </DialogFooter>
    </form>
  );
}
