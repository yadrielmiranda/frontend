"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, PackageOpen } from "lucide-react";

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
  addConfigToSystem,
  removeConfigFromSystem,
  updateSystemConfig,
} from "@/app/api/systems.api";
import {
  getAssociatedConfigsColumns,
  getAvailableConfigsColumns,
} from "./columns-system-configs";

type AvailableConfig = { id: number; conf: string };
type AssociatedConfig = { id: number; conf: string; allowScreen: boolean };

interface SystemConfigsClientProps {
  systemId: number;
  systemName: string;
  initialAssociatedConfigs: AssociatedConfig[];
  initialAvailableConfigs: AvailableConfig[];
}

export function SystemConfigsClient({
  systemId,
  systemName,
  initialAssociatedConfigs,
  initialAvailableConfigs,
}: SystemConfigsClientProps) {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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

    if (ok) setIsAddDialogOpen(false);
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

  const availableConfigs = useMemo(
    () => initialAvailableConfigs,
    [initialAvailableConfigs],
  );

  const associatedColumns = useMemo(
    () =>
      getAssociatedConfigsColumns(
        systemId,
        handleRemove,
        handleToggleAllowScreen,
      ),
    [systemId],
  );

  const availableColumns = useMemo(
    () => getAvailableConfigsColumns(handleAdd),
    [],
  );

  const hasAssociated = initialAssociatedConfigs.length > 0;
  const hasAvailable = availableConfigs.length > 0;

  return (
    <div className="space-y-6">
      {/* Header action */}
      <div className="flex justify-end">
        <TooltipProvider>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* span necesario porque Button disabled no dispara hover */}
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
                <DataTable
                  columns={availableColumns}
                  data={availableConfigs}
                  filterColumnId="conf"
                  filterPlaceholder="Search configs..."
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

      {/* Associated list */}
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
          <div className="mt-2 rounded-md border">
            <DataTable
              columns={associatedColumns}
              data={initialAssociatedConfigs}
              filterColumnId="conf"
              filterPlaceholder="Filter associated configs..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
