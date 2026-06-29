"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, PackageOpen } from "lucide-react";
import { toast } from "sonner";

import {
  updateSystemConfigOptions,
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

function DimensionSettingsCard({
  dimensionMode,
  requirements,
  isSaving,
  hasChanges,
  onDimensionModeChange,
  onRequirementChange,
  onSave,
}: {
  dimensionMode: DimensionMode;
  requirements: DimensionRequirementsState;
  isSaving: boolean;
  hasChanges: boolean;
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
    if (dimensionMode !== initialDimensionMode) return true;

    return Object.keys(emptyRequirements).some((key) => {
      const typedKey = key as DimensionRequirementKey;
      return effectiveRequirements[typedKey] !== initialRequirements[typedKey];
    });
  }, [
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
      <DimensionSettingsCard
        dimensionMode={dimensionMode}
        requirements={effectiveRequirements}
        isSaving={isSavingDimensions}
        hasChanges={hasDimensionChanges}
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
