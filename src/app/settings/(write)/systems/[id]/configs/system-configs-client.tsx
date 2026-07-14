"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Plus,
  PackageOpen,
  PlusCircle,
  Settings2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";

import {
  addConfigToSystem,
  removeConfigFromSystem,
  updateSystemConfig,
} from "@/app/api/systems.api";

import type {
  AssociatedConfig,
  AvailableConfig,
} from "./columns-system-configs";
import { groupConfigsByCategory } from "@/lib/config-groups";

function AvailableConfigsGroupedList({
  configs,
  onAdd,
}: {
  configs: AvailableConfig[];
  onAdd: (configId: number) => Promise<void>;
}) {
  const [search, setSearch] = useState("");

  const filteredConfigs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return configs;

    return configs.filter((config) => {
      const configName = config.conf.toLowerCase();
      const categoryName = config.category?.name?.toLowerCase() ?? "";

      return configName.includes(term) || categoryName.includes(term);
    });
  }, [configs, search]);

  const groupedConfigs = useMemo(
    () => groupConfigsByCategory(filteredConfigs),
    [filteredConfigs],
  );

  const renderConfigRow = (config: AvailableConfig) => (
    <div
      key={config.id}
      className="grid grid-cols-[1fr_90px] items-center border-b px-3 py-3 last:border-b-0"
    >
      <div className="text-sm">{config.conf}</div>

      <div className="flex justify-end">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAdd(config.id)}
                aria-label="Add config"
              >
                <PlusCircle className="h-4 w-4 text-green-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );

  return (
    <div className="rounded-md border">
      <div className="border-b p-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search configs..."
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-[1fr_90px] border-b bg-muted/40 px-3 py-3 text-xs font-semibold uppercase text-muted-foreground">
        <div>Available Config</div>
        <div className="text-right">Action</div>
      </div>

      {filteredConfigs.length === 0 ? (
        <div className="px-3 py-8 text-center text-sm text-muted-foreground">
          No configs found.
        </div>
      ) : !groupedConfigs.hasCategories ? (
        <div>{filteredConfigs.map(renderConfigRow)}</div>
      ) : (
        <div>
          {groupedConfigs.uncategorized.map(renderConfigRow)}

          {groupedConfigs.groups.map((group) => (
            <div key={group.key}>
              <div className="border-b bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900">
                {group.name}
              </div>

              {group.items.map(renderConfigRow)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssociatedConfigRow({
  systemId,
  isLinearMaterial,
  config,
  onRemove,
  onToggleAllowScreen,
  onUpdateSortOrder,
  onUpdateDefault,
}: {
  systemId: number;
  isLinearMaterial: boolean;
  config: AssociatedConfig;
  onRemove: (configId: number) => Promise<void>;
  onToggleAllowScreen: (
    configId: number,
    allowScreen: boolean,
  ) => Promise<void>;
  onUpdateSortOrder: (configId: number, sortOrder: number) => Promise<boolean>;
  onUpdateDefault: (configId: number, isDefault: boolean) => Promise<boolean>;
}) {
  const [checked, setChecked] = useState(config.allowScreen);
  const [orderValue, setOrderValue] = useState(String(config.sortOrder));

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isSavingDefault, setIsSavingDefault] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const switchId = `allow-screen-${config.id}`;
  const isEnabling = pendingValue === true;

  useEffect(() => {
    setChecked(config.allowScreen);
  }, [config.allowScreen]);

  useEffect(() => {
    setOrderValue(String(config.sortOrder));
  }, [config.sortOrder]);

  const requestToggle = (nextValue: boolean) => {
    if (isSaving) return;

    setPendingValue(nextValue);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (pendingValue === null) return;

    const nextValue = pendingValue;
    const previousValue = checked;

    setConfirmOpen(false);
    setChecked(nextValue);
    setIsSaving(true);

    try {
      await onToggleAllowScreen(config.id, nextValue);
    } catch {
      setChecked(previousValue);
    } finally {
      setIsSaving(false);
      setPendingValue(null);
    }
  };

  const handleSaveOrder = async () => {
    if (isSavingOrder) return;

    const normalizedValue = orderValue.trim();
    const nextOrder = Number(normalizedValue);

    if (
      normalizedValue === "" ||
      !Number.isInteger(nextOrder) ||
      nextOrder < 0
    ) {
      toast.error("Order must be a whole number greater than or equal to 0.");
      setOrderValue(String(config.sortOrder));
      return;
    }

    if (nextOrder === config.sortOrder) {
      return;
    }

    setIsSavingOrder(true);

    try {
      const ok = await onUpdateSortOrder(config.id, nextOrder);

      if (!ok) {
        setOrderValue(String(config.sortOrder));
      }
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleSetDefault = async () => {
    if (isSavingDefault || config.isDefault) return;

    setIsSavingDefault(true);

    try {
      await onUpdateDefault(config.id, true);
    } finally {
      setIsSavingDefault(false);
    }
  };

  return (
    <div className="grid grid-cols-[minmax(180px,1fr)_90px_130px_220px_120px] items-center border-b px-3 py-3 last:border-b-0">
      <div className="text-sm">{config.conf}</div>

      <div>
        <Input
          type="number"
          min={0}
          step={1}
          value={orderValue}
          disabled={isSavingOrder}
          onChange={(event) => setOrderValue(event.target.value)}
          onBlur={() => void handleSaveOrder()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          className="h-8 w-20"
          aria-label={`Display order for config ${config.conf}`}
        />
      </div>

      <div>
        {config.isDefault ? (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            Default
          </Badge>
        ) : (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSavingDefault}
                  onClick={() => {
                    void handleSetDefault();
                  }}
                  className="gap-1 text-muted-foreground hover:text-blue-600"
                >
                  <Circle className="h-3.5 w-3.5" />
                  Set default
                </Button>
              </TooltipTrigger>

              <TooltipContent>Set as default config</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isLinearMaterial ? (
          <span className="text-sm text-muted-foreground">Not applicable</span>
        ) : (
          <>
            <Switch
              id={switchId}
              checked={checked}
              disabled={isSaving}
              onCheckedChange={requestToggle}
              aria-label={`Toggle screen for config ${config.conf}`}
            />

            <Label htmlFor={switchId} className="text-sm font-normal">
              {checked ? "Allowed" : "Not allowed"}
            </Label>
          </>
        )}
      </div>

      <div className="flex justify-end gap-1">
        {!isLinearMaterial && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  aria-label="Manage options"
                >
                  <Link
                    href={`/settings/systems/${systemId}/configs/${config.id}/options`}
                  >
                    <Settings2 className="h-4 w-4 text-blue-600" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Manage Options</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                aria-label="Remove config"
              >
                <XCircle className="h-4 w-4 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isEnabling
                ? `Allow screen for config ${config.conf}?`
                : `Disable screen for config ${config.conf}?`}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {isEnabling
                ? "This config will allow screen when creating estimates."
                : "This config will no longer allow screen when creating estimates."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmOpen(false);
                setPendingValue(null);
              }}
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction onClick={handleConfirm}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteConfirmationDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await onRemove(config.id);
          setDeleteOpen(false);
        }}
        itemName={`config "${config.conf}"`}
      />
    </div>
  );
}

function AssociatedConfigsGroupedList({
  systemId,
  isLinearMaterial,
  configs,
  onRemove,
  onToggleAllowScreen,
  onUpdateSortOrder,
  onUpdateDefault,
}: {
  systemId: number;
  isLinearMaterial: boolean;
  configs: AssociatedConfig[];
  onRemove: (configId: number) => Promise<void>;
  onToggleAllowScreen: (
    configId: number,
    allowScreen: boolean,
  ) => Promise<void>;
  onUpdateSortOrder: (configId: number, sortOrder: number) => Promise<boolean>;
  onUpdateDefault: (configId: number, isDefault: boolean) => Promise<boolean>;
}) {
  const [search, setSearch] = useState("");

  const filteredConfigs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return configs;

    return configs.filter((config) => {
      const configName = config.conf.toLowerCase();
      const categoryName = config.category?.name?.toLowerCase() ?? "";

      return configName.includes(term) || categoryName.includes(term);
    });
  }, [configs, search]);

  const groupedConfigs = useMemo(
    () => groupConfigsByCategory(filteredConfigs),
    [filteredConfigs],
  );

  const renderConfigRow = (config: AssociatedConfig) => (
    <AssociatedConfigRow
      key={config.id}
      systemId={systemId}
      isLinearMaterial={isLinearMaterial}
      config={config}
      onRemove={onRemove}
      onToggleAllowScreen={onToggleAllowScreen}
      onUpdateSortOrder={onUpdateSortOrder}
      onUpdateDefault={onUpdateDefault}
    />
  );

  return (
    <div className="rounded-md border">
      <div className="border-b p-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter associated configs..."
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-[minmax(180px,1fr)_90px_130px_220px_120px] border-b bg-muted/40 px-3 py-3 text-xs font-semibold uppercase text-muted-foreground">
        <div>Associated Config</div>
        <div>Order</div>
        <div>Default</div>
        <div>Screen</div>
        <div className="text-right">Action</div>
      </div>

      {filteredConfigs.length === 0 ? (
        <div className="px-3 py-8 text-center text-sm text-muted-foreground">
          No associated configs found.
        </div>
      ) : !groupedConfigs.hasCategories ? (
        <div>{filteredConfigs.map(renderConfigRow)}</div>
      ) : (
        <div>
          {groupedConfigs.uncategorized.map(renderConfigRow)}

          {groupedConfigs.groups.map((group) => (
            <div key={group.key}>
              <div className="border-b bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900">
                {group.name}
              </div>

              {group.items.map(renderConfigRow)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SystemConfigsClientProps {
  systemId: number;
  systemName: string;
  isLinearMaterial?: boolean;
  initialAssociatedConfigs: AssociatedConfig[];
  initialAvailableConfigs: AvailableConfig[];
}

export function SystemConfigsClient({
  systemId,
  systemName,
  isLinearMaterial = false,
  initialAssociatedConfigs,
  initialAvailableConfigs,
}: SystemConfigsClientProps) {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [associatedConfigs, setAssociatedConfigs] = useState(
    initialAssociatedConfigs,
  );

  useEffect(() => {
    setAssociatedConfigs(initialAssociatedConfigs);
  }, [initialAssociatedConfigs]);

  const runAction = async (
    action: () => Promise<unknown>,
    successMsg: string,
    errorMsg: string,
  ) => {
    try {
      await action();
      toast.success(successMsg);
      router.refresh();
      return true;
    } catch (error) {
      toast.error((error as Error).message || errorMsg);
      console.error(errorMsg, error);
      return false;
    }
  };

  const handleAdd = async (configId: number) => {
    const ok = await runAction(
      () => addConfigToSystem(systemId, configId),
      "Config linked successfully.",
      "Error linking config.",
    );

    if (ok) {
      setIsAddDialogOpen(false);
    }
  };

  const handleRemove = async (configId: number) => {
    await runAction(
      () => removeConfigFromSystem(systemId, configId),
      "Config unlinked successfully.",
      "Error unlinking config.",
    );
  };

  const handleToggleAllowScreen = async (
    configId: number,
    allowScreen: boolean,
  ) => {
    await runAction(
      () => updateSystemConfig(systemId, configId, { allowScreen }),
      `Screen ${allowScreen ? "enabled" : "disabled"} successfully.`,
      "Error updating screen option.",
    );
  };

  const handleUpdateSortOrder = async (configId: number, sortOrder: number) => {
    const ok = await runAction(
      () =>
        updateSystemConfig(systemId, configId, {
          sortOrder,
        }),
      "Config order updated successfully.",
      "Error updating config order.",
    );

    if (ok) {
      setAssociatedConfigs((current) =>
        current.map((config) =>
          config.id === configId ? { ...config, sortOrder } : config,
        ),
      );
    }

    return ok;
  };

  const handleUpdateDefault = async (configId: number, isDefault: boolean) => {
    const ok = await runAction(
      () =>
        updateSystemConfig(systemId, configId, {
          isDefault,
        }),
      isDefault
        ? "Default config updated successfully."
        : "Default config cleared successfully.",
      "Error updating default config.",
    );

    if (ok) {
      setAssociatedConfigs((current) =>
        current.map((config) => {
          if (isDefault) {
            return {
              ...config,
              isDefault: config.id === configId,
            };
          }

          return config.id === configId
            ? { ...config, isDefault: false }
            : config;
        }),
      );
    }

    return ok;
  };

  const availableConfigs = useMemo(
    () => initialAvailableConfigs,
    [initialAvailableConfigs],
  );

  const hasAssociated = associatedConfigs.length > 0;
  const hasAvailable = availableConfigs.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <TooltipProvider>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <DialogTrigger asChild>
                    <Button
                      disabled={!hasAvailable}
                      className="inline-flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Config
                    </Button>
                  </DialogTrigger>
                </span>
              </TooltipTrigger>

              {!hasAvailable && (
                <TooltipContent side="bottom" align="end">
                  No available configs to add.
                </TooltipContent>
              )}
            </Tooltip>

            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Add Config to{" "}
                  <span className="font-semibold">{systemName}</span>
                </DialogTitle>
                <DialogDescription>
                  Select a config from the list to associate it with this
                  system.
                </DialogDescription>
              </DialogHeader>

              {hasAvailable ? (
                <AvailableConfigsGroupedList
                  configs={availableConfigs}
                  onAdd={handleAdd}
                />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-10 text-center">
                  <PackageOpen className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">
                    No configs available
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All configs are already linked to this system.
                  </p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TooltipProvider>
      </div>

      <div>
        <h3 className="text-lg font-medium">Associated Configs</h3>

        {!hasAssociated ? (
          <div className="mt-2 flex flex-col items-center justify-center rounded-md border border-dashed p-10 text-center">
            <PackageOpen className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No associated configs</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add configs to make them available under this system.
            </p>

            <Button
              className="mt-4 inline-flex items-center gap-2"
              onClick={() => setIsAddDialogOpen(true)}
              disabled={!hasAvailable}
            >
              <Plus className="h-4 w-4" />
              Add Config
            </Button>
          </div>
        ) : (
          <div className="mt-2">
            <AssociatedConfigsGroupedList
              systemId={systemId}
              isLinearMaterial={isLinearMaterial}
              configs={associatedConfigs}
              onRemove={handleRemove}
              onToggleAllowScreen={handleToggleAllowScreen}
              onUpdateSortOrder={handleUpdateSortOrder}
              onUpdateDefault={handleUpdateDefault}
            />
          </div>
        )}
      </div>
    </div>
  );
}
