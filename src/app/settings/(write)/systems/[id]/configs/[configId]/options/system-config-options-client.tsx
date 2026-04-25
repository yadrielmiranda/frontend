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
        const ok = await onAdd(group.key, optionId);
        if (ok) setIsAddDialogOpen(false);
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
