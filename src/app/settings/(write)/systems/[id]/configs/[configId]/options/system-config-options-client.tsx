"use client";

import { useMemo, useState } from "react";
import type { PricingComponentType } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Plus, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

import {
  updateSystemConfigOptions,
  updateSystemConfigPricingComponents,
  type SystemConfigOptionsManage,
} from "@/app/api/systems.api";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  getAssociatedOptionsColumns,
  getAvailableOptionsColumns,
  type AssociatedOption,
  type AvailableOption,
} from "./columns-system-config-options";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";

type OptionItem = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type OptionGroupKey = "active" | "preparation" | "sill" | "reinforcement";

type OptionGroupConfig = {
  key: OptionGroupKey;
  title: string;
  addLabel: string;
  associatedTitle: string;
  emptyTitle: string;
  emptyDescription: string;
  catalog: OptionItem[];
  selectedIds: number[];
  defaultId: number | null;
};

type DimensionMode =
  | "STANDARD"
  | "ECO_WINDOWS_DOOR"
  | "ECO_NOVO_DOOR"
  | "WINDOW_WALL";

type DimensionRequirementKey =
  | "requiresWidth"
  | "requiresHeight"
  | "requiresHeightLeft"
  | "requiresHeightRight"
  | "requiresLegHeight"
  | "requiresDoorWidth"
  | "requiresDoorHeight"
  | "requiresLeftSideliteWidth"
  | "requiresRightSideliteWidth"
  | "requiresLeftPanels"
  | "requiresRightPanels"
  | "requiresPanelCount"
  | "requiresHorizontalHeights";

type DimensionRequirementsState = Record<DimensionRequirementKey, boolean>;

const dimensionModeLabels: Record<DimensionMode, string> = {
  STANDARD: "Standard",
  ECO_WINDOWS_DOOR: "Eco Windows Door",
  ECO_NOVO_DOOR: "Eco Novo Door",
  WINDOW_WALL: "Window Wall",
};

const dimensionRequirementLabels: {
  key: DimensionRequirementKey;
  label: string;
  description: string;
}[] = [
  {
    key: "requiresWidth",
    label: "Width / Opening Width",
    description: "Required for standard items and opening-based systems.",
  },
  {
    key: "requiresHeight",
    label: "Height / Opening Height",
    description: "Main height required for this configuration.",
  },
  {
    key: "requiresHeightLeft",
    label: "Height Left",
    description: "Used by shapes or configurations with left height.",
  },
  {
    key: "requiresHeightRight",
    label: "Height Right",
    description: "Used by shapes or configurations with right height.",
  },
  {
    key: "requiresLegHeight",
    label: "Leg Height",
    description: "Used by arches, eyebrows, or similar shapes.",
  },
  {
    key: "requiresDoorWidth",
    label: "Door Width",
    description: "Door panel width required for door systems.",
  },
  {
    key: "requiresDoorHeight",
    label: "Door Height",
    description:
      "Door panel height required for door systems with transom or separate door height.",
  },
  {
    key: "requiresLeftSideliteWidth",
    label: "Left Sidelite Width",
    description: "Required when the left sidelite is entered separately.",
  },
  {
    key: "requiresRightSideliteWidth",
    label: "Right Sidelite Width",
    description: "Required when the right sidelite is entered separately.",
  },
  {
    key: "requiresLeftPanels",
    label: "Left Sidelite Qty",
    description: "Number of sidelites/panels on the left side.",
  },
  {
    key: "requiresRightPanels",
    label: "Right Sidelite Qty",
    description: "Number of sidelites/panels on the right side.",
  },
  {
    key: "requiresPanelCount",
    label: "Panel Count",
    description: "Required for Window Wall or multi-panel openings.",
  },
  {
    key: "requiresHorizontalHeights",
    label: "Horizontal Heights",
    description: "Required when horizontal divisions must be entered.",
  },
];

const buildInitialRequirements = (
  data: SystemConfigOptionsManage,
): DimensionRequirementsState => ({
  requiresWidth: data.requiresWidth ?? false,
  requiresHeight: data.requiresHeight ?? false,
  requiresHeightLeft: data.requiresHeightLeft ?? false,
  requiresHeightRight: data.requiresHeightRight ?? false,
  requiresLegHeight: data.requiresLegHeight ?? false,
  requiresDoorWidth: data.requiresDoorWidth ?? false,
  requiresDoorHeight: data.requiresDoorHeight ?? false,
  requiresLeftSideliteWidth: data.requiresLeftSideliteWidth ?? false,
  requiresRightSideliteWidth: data.requiresRightSideliteWidth ?? false,
  requiresLeftPanels: data.requiresLeftPanels ?? false,
  requiresRightPanels: data.requiresRightPanels ?? false,
  requiresPanelCount: data.requiresPanelCount ?? false,
  requiresHorizontalHeights: data.requiresHorizontalHeights ?? false,
});

const emptyRequirements: DimensionRequirementsState = {
  requiresWidth: false,
  requiresHeight: false,
  requiresHeightLeft: false,
  requiresHeightRight: false,
  requiresLegHeight: false,
  requiresDoorWidth: false,
  requiresDoorHeight: false,
  requiresLeftSideliteWidth: false,
  requiresRightSideliteWidth: false,
  requiresLeftPanels: false,
  requiresRightPanels: false,
  requiresPanelCount: false,
  requiresHorizontalHeights: false,
};

type PricingCalculationMode = "DIRECT" | "COMPONENT_SUM";

type PricingComponentSelections = Record<PricingComponentType, number | null>;

const pricingComponentOptions: {
  type: PricingComponentType;
  label: string;
  description: string;
}[] = [
  {
    type: "DOOR",
    label: "Door Source",
    description: "Configuration whose direct pricing rule prices the door.",
  },
  {
    type: "SIDELITE",
    label: "Sidelite Source",
    description:
      "Configuration whose direct pricing rule prices each sidelite panel.",
  },
  {
    type: "TRANSOM",
    label: "Transom Source",
    description: "Configuration whose direct pricing rule prices the transom.",
  },
];

const emptyPricingComponentSelections: PricingComponentSelections = {
  DOOR: null,
  SIDELITE: null,
  TRANSOM: null,
};

const buildInitialPricingComponentSelections = (
  data: SystemConfigOptionsManage,
): PricingComponentSelections => {
  const selections: PricingComponentSelections = {
    ...emptyPricingComponentSelections,
  };

  for (const component of data.pricingComponents ?? []) {
    selections[component.componentType] = component.sourceConfigId;
  }

  return selections;
};

const buildInitialSideliteQuantity = (
  data: SystemConfigOptionsManage,
): number | null =>
  data.pricingComponents.find(
    (component) => component.componentType === "SIDELITE",
  )?.quantity ?? null;

function PricingCalculationCard({
  calculationMode,
  components,
  sourceConfigs,
  dimensionMode,
  sideliteQuantity,
  isSaving,
  hasChanges,
  onCalculationModeChange,
  onComponentChange,
  onSideliteQuantityChange,
  onSave,
}: {
  calculationMode: PricingCalculationMode;
  components: PricingComponentSelections;
  sourceConfigs: SystemConfigOptionsManage["pricingSourceConfigsCatalog"];
  dimensionMode: SystemConfigOptionsManage["dimensionMode"];
  sideliteQuantity: number | null;
  isSaving: boolean;
  hasChanges: boolean;
  onCalculationModeChange: (value: PricingCalculationMode) => void;
  onComponentChange: (
    type: PricingComponentType,
    sourceConfigId: number | null,
  ) => void;
  onSideliteQuantityChange: (quantity: number | null) => void;
  onSave: () => void;
}) {
  const hasSelectedComponent = Object.values(components).some(
    (sourceConfigId) => sourceConfigId !== null,
  );

  const requiresSideliteQuantity =
    dimensionMode === "ECO_WINDOWS_DOOR" && components.SIDELITE !== null;

  const hasValidSideliteQuantity =
    !requiresSideliteQuantity ||
    (Number.isInteger(sideliteQuantity) && Number(sideliteQuantity) >= 1);

  return (
    <div className="space-y-5 rounded-lg border p-4">
      <div>
        <h3 className="text-base font-semibold">Pricing Calculation</h3>

        <p className="text-sm text-muted-foreground">
          Choose whether this configuration uses its own pricing rule or the sum
          of direct pricing rules from component configurations.
        </p>
      </div>

      <div className="grid gap-2">
        <Label>Calculation Mode</Label>

        <Select
          value={calculationMode}
          onValueChange={(value) =>
            onCalculationModeChange(value as PricingCalculationMode)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select calculation mode" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="DIRECT">Direct Pricing Rule</SelectItem>

            <SelectItem value="COMPONENT_SUM">
              Sum of Component Prices
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {calculationMode === "DIRECT" ? (
        <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          The piece uses the pricing rule assigned directly to this
          configuration.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            Each component is calculated and rounded to cents before the
            component prices are added together. Remove any direct pricing rules
            from this configuration before enabling component pricing.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {pricingComponentOptions.map((option) => {
              const selectedSourceConfigId = components[option.type];

              return (
                <div
                  key={option.type}
                  className="space-y-2 rounded-md border p-3"
                >
                  <div>
                    <Label>{option.label}</Label>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>

                  <Select
                    value={
                      selectedSourceConfigId === null
                        ? "NONE"
                        : String(selectedSourceConfigId)
                    }
                    onValueChange={(value) =>
                      onComponentChange(
                        option.type,
                        value === "NONE" ? null : Number(value),
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source config" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="NONE">Not used</SelectItem>

                      {sourceConfigs.map((source) => (
                        <SelectItem
                          key={source.idConfig}
                          value={String(source.idConfig)}
                        >
                          {source.config.conf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {option.type === "SIDELITE" &&
                    dimensionMode === "ECO_WINDOWS_DOOR" &&
                    selectedSourceConfigId !== null && (
                      <div className="space-y-2 pt-2">
                        <Label>Sidelite Quantity</Label>

                        <Input
                          type="number"
                          min={1}
                          step={1}
                          value={sideliteQuantity ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;

                            onSideliteQuantityChange(
                              value === "" ? null : Number(value),
                            );
                          }}
                          placeholder="Enter total sidelites"
                        />

                        <p className="text-xs text-muted-foreground">
                          Total number of equal-width sidelites in this
                          configuration.
                        </p>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onSave}
          disabled={
            isSaving ||
            !hasChanges ||
            (calculationMode === "COMPONENT_SUM" && !hasSelectedComponent) ||
            !hasValidSideliteQuantity
          }
        >
          {isSaving ? "Saving..." : "Save Pricing Calculation"}
        </Button>
      </div>
    </div>
  );
}

function DimensionSettingsCard({
  isSelectableInEstimate,
  dimensionMode,
  requirements,
  isSaving,
  hasChanges,
  onSelectableInEstimateChange,
  onDimensionModeChange,
  onRequirementChange,
  onSave,
}: {
  isSelectableInEstimate: boolean;
  dimensionMode: DimensionMode;
  requirements: DimensionRequirementsState;
  isSaving: boolean;
  hasChanges: boolean;
  onSelectableInEstimateChange: (value: boolean) => void;
  onDimensionModeChange: (value: DimensionMode) => void;
  onRequirementChange: (key: DimensionRequirementKey, value: boolean) => void;
  onSave: () => void;
}) {
  const isStandard = dimensionMode === "STANDARD";
  const visibleRequirements = isStandard ? [] : dimensionRequirementLabels;

  return (
    <div className="space-y-5 rounded-lg border p-4">
      <div>
        <h3 className="text-base font-semibold">Dimension Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure how measurements are interpreted for this system/config.
          Standard keeps the existing Config requirements. Door and Window Wall
          modes use the required fields below.
        </p>
      </div>

      <div className="grid gap-2">
        <Label>Dimension Mode</Label>
        <Select
          value={dimensionMode}
          onValueChange={(value) =>
            onDimensionModeChange(value as DimensionMode)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select dimension mode" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(dimensionModeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isStandard && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            Standard mode uses the Required Dimensions configured directly in
            the Config screen. There are no System/Config-specific dimension
            fields to select here.
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {visibleRequirements.map((item) => (
          <div
            key={item.key}
            className="flex items-start justify-between gap-4 rounded-md border p-3"
          >
            <div className="space-y-1">
              <Label className="text-sm font-medium">{item.label}</Label>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>

            <Switch
              checked={requirements[item.key]}
              onCheckedChange={(checked) =>
                onRequirementChange(item.key, checked)
              }
            />
          </div>
        ))}
      </div>

      <div className="flex items-start justify-between gap-4 rounded-md border p-3">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Available in Estimates</Label>

          <p className="text-xs text-muted-foreground">
            Allow users to select this configuration when creating an estimate.
            Disable it for internal pricing-source configurations.
          </p>
        </div>

        <Switch
          checked={isSelectableInEstimate}
          onCheckedChange={onSelectableInEstimateChange}
          disabled={isSaving}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onSave}
          disabled={isSaving || !hasChanges}
        >
          {isSaving ? "Saving..." : "Save Dimension Settings"}
        </Button>
      </div>
    </div>
  );
}

function OptionAssociationGroup({
  group,
  onAdd,
  onRemove,
  onSetDefault,
}: {
  group: OptionGroupConfig;
  onAdd: (groupKey: OptionGroupKey, optionId: number) => Promise<boolean>;
  onRemove: (groupKey: OptionGroupKey, optionId: number) => Promise<void>;
  onSetDefault: (groupKey: OptionGroupKey, optionId: number) => Promise<void>;
}) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const associatedOptions = useMemo<AssociatedOption[]>(() => {
    return group.catalog
      .filter((option) => group.selectedIds.includes(option.id))
      .map((option) => ({
        id: option.id,
        name: option.name,
        isDefault: group.defaultId === option.id,
      }));
  }, [group.catalog, group.selectedIds, group.defaultId]);

  const availableOptions = useMemo<AvailableOption[]>(() => {
    return group.catalog
      .filter((option) => !group.selectedIds.includes(option.id))
      .map((option) => ({
        id: option.id,
        name: option.name,
      }));
  }, [group.catalog, group.selectedIds]);

  const associatedColumns = useMemo(
    () =>
      getAssociatedOptionsColumns(
        (optionId) => onRemove(group.key, optionId),
        (optionId) => onSetDefault(group.key, optionId),
      ),
    [group.key, onRemove, onSetDefault],
  );

  const availableColumns = useMemo(
    () =>
      getAvailableOptionsColumns(async (optionId) => {
        await onAdd(group.key, optionId);
      }),
    [group.key, onAdd],
  );

  const hasAssociated = associatedOptions.length > 0;
  const hasAvailable = availableOptions.length > 0;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">{group.title}</h3>
          <p className="text-sm text-muted-foreground">
            Manage associated options and default value.
          </p>
        </div>

        <TooltipProvider>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      disabled={!hasAvailable}
                      className="inline-flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {group.addLabel}
                    </Button>
                  </DialogTrigger>
                </span>
              </TooltipTrigger>

              {!hasAvailable && (
                <TooltipContent side="bottom" align="end">
                  No available options to add.
                </TooltipContent>
              )}
            </Tooltip>

            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{group.addLabel}</DialogTitle>
                <DialogDescription>
                  Select an option from the list to associate it.
                </DialogDescription>
              </DialogHeader>

              {hasAvailable ? (
                <DataTable
                  columns={availableColumns}
                  data={availableOptions}
                  filterColumnId="name"
                  filterPlaceholder="Search options..."
                />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-10 text-center">
                  <PackageOpen className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">
                    No options available
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All options are already associated.
                  </p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TooltipProvider>
      </div>

      {!hasAssociated ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
          <PackageOpen className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">{group.emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {group.emptyDescription}
          </p>

          <Button
            type="button"
            className="mt-4 inline-flex items-center gap-2"
            onClick={() => setIsAddDialogOpen(true)}
            disabled={!hasAvailable}
          >
            <Plus className="h-4 w-4" />
            {group.addLabel}
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <DataTable
            columns={associatedColumns}
            data={associatedOptions}
            filterColumnId="name"
            filterPlaceholder={`Filter ${group.associatedTitle.toLowerCase()}...`}
          />
        </div>
      )}
    </div>
  );
}

export function SystemConfigOptionsClient({
  data,
}: {
  data: SystemConfigOptionsManage;
}) {
  const router = useRouter();
  const initialPricingCalculationMode: PricingCalculationMode =
    data.pricingComponents?.length > 0 ? "COMPONENT_SUM" : "DIRECT";

  const initialPricingComponents = useMemo(
    () => buildInitialPricingComponentSelections(data),
    [data],
  );

  const initialSideliteQuantity = useMemo(
    () => buildInitialSideliteQuantity(data),
    [data],
  );

  const [pricingCalculationMode, setPricingCalculationMode] =
    useState<PricingCalculationMode>(initialPricingCalculationMode);

  const [pricingComponents, setPricingComponents] =
    useState<PricingComponentSelections>(initialPricingComponents);

  const [sideliteQuantity, setSideliteQuantity] = useState<number | null>(
    initialSideliteQuantity,
  );

  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [isConfirmPricingOpen, setIsConfirmPricingOpen] = useState(false);

  const effectivePricingComponents =
    pricingCalculationMode === "DIRECT"
      ? emptyPricingComponentSelections
      : pricingComponents;

  const effectiveSideliteQuantity =
    pricingCalculationMode === "COMPONENT_SUM" &&
    data.dimensionMode === "ECO_WINDOWS_DOOR" &&
    effectivePricingComponents.SIDELITE !== null
      ? sideliteQuantity
      : null;

  const hasPricingChanges = useMemo(() => {
    if (pricingCalculationMode !== initialPricingCalculationMode) {
      return true;
    }

    const componentsChanged = pricingComponentOptions.some(
      (option) =>
        effectivePricingComponents[option.type] !==
        initialPricingComponents[option.type],
    );

    return (
      componentsChanged || effectiveSideliteQuantity !== initialSideliteQuantity
    );
  }, [
    pricingCalculationMode,
    initialPricingCalculationMode,
    effectivePricingComponents,
    initialPricingComponents,
    effectiveSideliteQuantity,
    initialSideliteQuantity,
  ]);
  const initialIsSelectableInEstimate = data.isSelectableInEstimate ?? true;

  const [isSelectableInEstimate, setIsSelectableInEstimate] = useState(
    initialIsSelectableInEstimate,
  );
  const initialDimensionMode = data.dimensionMode ?? "STANDARD";
  const initialRequirements = useMemo(
    () => buildInitialRequirements(data),
    [data],
  );

  const [dimensionMode, setDimensionMode] =
    useState<DimensionMode>(initialDimensionMode);

  const [requirements, setRequirements] =
    useState<DimensionRequirementsState>(initialRequirements);

  const [isSavingDimensions, setIsSavingDimensions] = useState(false);
  const [isConfirmDimensionsOpen, setIsConfirmDimensionsOpen] = useState(false);

  const effectiveRequirements =
    dimensionMode === "STANDARD" ? emptyRequirements : requirements;

  const hasDimensionChanges = useMemo(() => {
    if (isSelectableInEstimate !== initialIsSelectableInEstimate) {
      return true;
    }

    if (dimensionMode !== initialDimensionMode) {
      return true;
    }

    return Object.keys(emptyRequirements).some((key) => {
      const typedKey = key as DimensionRequirementKey;

      return effectiveRequirements[typedKey] !== initialRequirements[typedKey];
    });
  }, [
    isSelectableInEstimate,
    initialIsSelectableInEstimate,
    dimensionMode,
    initialDimensionMode,
    effectiveRequirements,
    initialRequirements,
  ]);

  const buildPayload = (
    groupKey: OptionGroupKey,
    nextIds: number[],
    nextDefaultId: number | null,
  ) => {
    return {
      activeOptionIds:
        groupKey === "active" ? nextIds : data.selectedActiveOptionIds,
      preparationOptionIds:
        groupKey === "preparation"
          ? nextIds
          : data.selectedPreparationOptionIds,
      sillOptionIds: groupKey === "sill" ? nextIds : data.selectedSillOptionIds,
      reinforcementOptionIds:
        groupKey === "reinforcement"
          ? nextIds
          : data.selectedReinforcementOptionIds,

      defaultActiveOptionId:
        groupKey === "active" ? nextDefaultId : data.defaultActiveOptionId,
      defaultPreparationOptionId:
        groupKey === "preparation"
          ? nextDefaultId
          : data.defaultPreparationOptionId,
      defaultSillOptionId:
        groupKey === "sill" ? nextDefaultId : data.defaultSillOptionId,
      defaultReinforcementOptionId:
        groupKey === "reinforcement"
          ? nextDefaultId
          : data.defaultReinforcementOptionId,

      isSelectableInEstimate,
      dimensionMode,
      ...effectiveRequirements,
    };
  };

  const getGroupState = (groupKey: OptionGroupKey) => {
    if (groupKey === "active") {
      return {
        selectedIds: data.selectedActiveOptionIds,
        defaultId: data.defaultActiveOptionId,
      };
    }

    if (groupKey === "preparation") {
      return {
        selectedIds: data.selectedPreparationOptionIds,
        defaultId: data.defaultPreparationOptionId,
      };
    }

    if (groupKey === "sill") {
      return {
        selectedIds: data.selectedSillOptionIds,
        defaultId: data.defaultSillOptionId,
      };
    }

    return {
      selectedIds: data.selectedReinforcementOptionIds,
      defaultId: data.defaultReinforcementOptionId,
    };
  };

  const runAction = async (
    groupKey: OptionGroupKey,
    nextIds: number[],
    nextDefaultId: number | null,
    successMsg: string,
    errorMsg: string,
  ) => {
    try {
      await updateSystemConfigOptions(
        data.idSystem,
        data.idConfig,
        buildPayload(groupKey, nextIds, nextDefaultId),
      );

      toast.success(successMsg);
      router.refresh();
      return true;
    } catch (error) {
      toast.error((error as Error).message || errorMsg);
      console.error(errorMsg, error);
      return false;
    }
  };

  const handleSavePricingCalculation = async () => {
    const requiresSideliteQuantity =
      pricingCalculationMode === "COMPONENT_SUM" &&
      data.dimensionMode === "ECO_WINDOWS_DOOR" &&
      pricingComponents.SIDELITE !== null;

    if (
      requiresSideliteQuantity &&
      (!Number.isInteger(sideliteQuantity) || Number(sideliteQuantity) < 1)
    ) {
      toast.error(
        "Sidelite Quantity must be a whole number greater than zero.",
      );
      return;
    }
    const components =
      pricingCalculationMode === "DIRECT"
        ? []
        : pricingComponentOptions.flatMap((option) => {
            const sourceConfigId = pricingComponents[option.type];

            return sourceConfigId === null
              ? []
              : [
                  {
                    componentType: option.type,
                    sourceConfigId,

                    ...(option.type === "SIDELITE" &&
                    data.dimensionMode === "ECO_WINDOWS_DOOR"
                      ? { quantity: sideliteQuantity }
                      : {}),
                  },
                ];
          });

    if (pricingCalculationMode === "COMPONENT_SUM" && components.length === 0) {
      toast.error("Select at least one pricing component.");
      return;
    }

    try {
      setIsSavingPricing(true);

      await updateSystemConfigPricingComponents(data.idSystem, data.idConfig, {
        components,
      });

      toast.success("Pricing calculation updated successfully.");
      router.refresh();
    } catch (error) {
      toast.error(
        (error as Error).message || "Error updating pricing calculation.",
      );

      console.error("Error updating pricing calculation.", error);
    } finally {
      setIsSavingPricing(false);
    }
  };

  const handleSaveDimensionSettings = async () => {
    try {
      setIsSavingDimensions(true);

      await updateSystemConfigOptions(data.idSystem, data.idConfig, {
        activeOptionIds: data.selectedActiveOptionIds,
        preparationOptionIds: data.selectedPreparationOptionIds,
        sillOptionIds: data.selectedSillOptionIds,
        reinforcementOptionIds: data.selectedReinforcementOptionIds,

        defaultActiveOptionId: data.defaultActiveOptionId,
        defaultPreparationOptionId: data.defaultPreparationOptionId,
        defaultSillOptionId: data.defaultSillOptionId,
        defaultReinforcementOptionId: data.defaultReinforcementOptionId,

        isSelectableInEstimate,
        dimensionMode,
        ...effectiveRequirements,
      });

      toast.success("Dimension settings updated successfully.");
      router.refresh();
    } catch (error) {
      toast.error(
        (error as Error).message || "Error updating dimension settings.",
      );
      console.error("Error updating dimension settings.", error);
    } finally {
      setIsSavingDimensions(false);
    }
  };

  const handleAdd = async (groupKey: OptionGroupKey, optionId: number) => {
    const { selectedIds, defaultId } = getGroupState(groupKey);

    const nextIds = selectedIds.includes(optionId)
      ? selectedIds
      : [...selectedIds, optionId];

    const nextDefaultId = defaultId ?? optionId;

    return runAction(
      groupKey,
      nextIds,
      nextDefaultId,
      "Option linked successfully.",
      "Error linking option.",
    );
  };

  const handleRemove = async (groupKey: OptionGroupKey, optionId: number) => {
    const { selectedIds, defaultId } = getGroupState(groupKey);

    const nextIds = selectedIds.filter((id) => id !== optionId);
    const nextDefaultId =
      defaultId === optionId ? (nextIds[0] ?? null) : defaultId;

    await runAction(
      groupKey,
      nextIds,
      nextDefaultId,
      "Option unlinked successfully.",
      "Error unlinking option.",
    );
  };

  const handleSetDefault = async (
    groupKey: OptionGroupKey,
    optionId: number,
  ) => {
    const { selectedIds } = getGroupState(groupKey);

    await runAction(
      groupKey,
      selectedIds,
      optionId,
      "Default option updated successfully.",
      "Error updating default option.",
    );
  };

  const groups: OptionGroupConfig[] = [
    {
      key: "active",
      title: "Active Options",
      addLabel: "Add Active Option",
      associatedTitle: "Associated Active Options",
      emptyTitle: "No active options associated",
      emptyDescription:
        "Add active options to make them available for this config.",
      catalog: data.activeOptionsCatalog,
      selectedIds: data.selectedActiveOptionIds,
      defaultId: data.defaultActiveOptionId,
    },
    {
      key: "preparation",
      title: "Preparation Options",
      addLabel: "Add Preparation Option",
      associatedTitle: "Associated Preparation Options",
      emptyTitle: "No preparation options associated",
      emptyDescription:
        "Add preparation options to make them available for this config.",
      catalog: data.preparationOptionsCatalog,
      selectedIds: data.selectedPreparationOptionIds,
      defaultId: data.defaultPreparationOptionId,
    },
    {
      key: "sill",
      title: "Sill Options",
      addLabel: "Add Sill Option",
      associatedTitle: "Associated Sill Options",
      emptyTitle: "No sill options associated",
      emptyDescription:
        "Add sill options to make them available for this config.",
      catalog: data.sillOptionsCatalog,
      selectedIds: data.selectedSillOptionIds,
      defaultId: data.defaultSillOptionId,
    },
    {
      key: "reinforcement",
      title: "Reinforcement Options",
      addLabel: "Add Reinforcement Option",
      associatedTitle: "Associated Reinforcement Options",
      emptyTitle: "No reinforcement options associated",
      emptyDescription:
        "Add reinforcement options to make them available for this config.",
      catalog: data.reinforcementOptionsCatalog,
      selectedIds: data.selectedReinforcementOptionIds,
      defaultId: data.defaultReinforcementOptionId,
    },
  ];

  return (
    <div className="space-y-6">
      <PricingCalculationCard
        calculationMode={pricingCalculationMode}
        components={effectivePricingComponents}
        sourceConfigs={data.pricingSourceConfigsCatalog}
        dimensionMode={data.dimensionMode}
        sideliteQuantity={effectiveSideliteQuantity}
        isSaving={isSavingPricing}
        hasChanges={hasPricingChanges}
        onCalculationModeChange={(value) => {
          setPricingCalculationMode(value);

          if (value === "DIRECT") {
            setPricingComponents({
              ...emptyPricingComponentSelections,
            });

            setSideliteQuantity(null);
          }
        }}
        onComponentChange={(type, sourceConfigId) => {
          setPricingComponents((current) => ({
            ...current,
            [type]: sourceConfigId,
          }));

          if (type === "SIDELITE" && sourceConfigId === null) {
            setSideliteQuantity(null);
          }
        }}
        onSideliteQuantityChange={setSideliteQuantity}
        onSave={() => setIsConfirmPricingOpen(true)}
      />

      <ConfirmActionDialog
        isOpen={isConfirmPricingOpen}
        onClose={() => setIsConfirmPricingOpen(false)}
        onConfirm={async () => {
          setIsConfirmPricingOpen(false);
          await handleSavePricingCalculation();
        }}
        title="Save pricing calculation?"
        description={
          pricingCalculationMode === "DIRECT"
            ? "This configuration will use its own direct pricing rule."
            : "This configuration will be priced by calculating, rounding, and adding the selected component prices."
        }
        confirmText="Yes, save pricing calculation"
        cancelText="Cancel"
      />
      <DimensionSettingsCard
        isSelectableInEstimate={isSelectableInEstimate}
        dimensionMode={dimensionMode}
        requirements={effectiveRequirements}
        isSaving={isSavingDimensions}
        hasChanges={hasDimensionChanges}
        onSelectableInEstimateChange={setIsSelectableInEstimate}
        onDimensionModeChange={(value) => {
          setDimensionMode(value);

          if (value === "STANDARD") {
            setRequirements(emptyRequirements);
          }
        }}
        onRequirementChange={(key, value) =>
          setRequirements((current) => ({
            ...current,
            [key]: value,
          }))
        }
        onSave={() => setIsConfirmDimensionsOpen(true)}
      />

      <ConfirmActionDialog
        isOpen={isConfirmDimensionsOpen}
        onClose={() => setIsConfirmDimensionsOpen(false)}
        onConfirm={async () => {
          setIsConfirmDimensionsOpen(false);
          await handleSaveDimensionSettings();
        }}
        title="Save dimension settings?"
        description="These settings control which measurement fields are required for this System/Config. Existing STANDARD configurations continue using the Config requirements."
        confirmText="Yes, save settings"
        cancelText="Cancel"
      />

      {groups.map((group) => (
        <OptionAssociationGroup
          key={group.key}
          group={group}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onSetDefault={handleSetDefault}
        />
      ))}
    </div>
  );
}
