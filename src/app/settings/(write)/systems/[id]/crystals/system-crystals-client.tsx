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
  updateSystemCrystals,
  type SystemCrystalsManage,
} from "@/app/api/systems.api";

import {
  getAssociatedCrystalsColumns,
  getAvailableCrystalsColumns,
  type AssociatedCrystal,
  type AvailableCrystal,
} from "./columns-system-crystals";

export function SystemCrystalsClient({
  data,
}: {
  data: SystemCrystalsManage;
}) {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const selectedCrystalIds = data.selectedCrystalIds;
  const defaultCrystalId = data.defaultCrystalId;

  const associatedCrystals = useMemo<AssociatedCrystal[]>(() => {
    return data.crystalsCatalog
      .filter((crystal) => selectedCrystalIds.includes(crystal.id))
      .map((crystal) => ({
        id: crystal.id,
        glass: crystal.glass,
        isDefault: defaultCrystalId === crystal.id,
      }));
  }, [data.crystalsCatalog, selectedCrystalIds, defaultCrystalId]);

  const availableCrystals = useMemo<AvailableCrystal[]>(() => {
    return data.crystalsCatalog
      .filter((crystal) => !selectedCrystalIds.includes(crystal.id))
      .map((crystal) => ({
        id: crystal.id,
        glass: crystal.glass,
      }));
  }, [data.crystalsCatalog, selectedCrystalIds]);

  const runAction = async (
    nextCrystalIds: number[],
    nextDefaultCrystalId: number | null,
    successMsg: string,
    errorMsg: string,
  ) => {
    try {
      await updateSystemCrystals(data.system.id, {
        crystalIds: nextCrystalIds,
        defaultCrystalId: nextDefaultCrystalId,
      });

      toast.success(successMsg);
      router.refresh();
      return true;
    } catch (error) {
      toast.error((error as Error).message || errorMsg);
      console.error(errorMsg, error);
      return false;
    }
  };

  const handleAdd = async (crystalId: number) => {
    const nextCrystalIds = [...selectedCrystalIds, crystalId];
    const nextDefaultCrystalId = defaultCrystalId ?? crystalId;

    const ok = await runAction(
      nextCrystalIds,
      nextDefaultCrystalId,
      "Glass linked successfully.",
      "Error linking glass.",
    );

    if (ok) setIsAddDialogOpen(false);
  };

  const handleRemove = async (crystalId: number) => {
    const nextCrystalIds = selectedCrystalIds.filter((id) => id !== crystalId);
    const nextDefaultCrystalId =
      defaultCrystalId === crystalId ? (nextCrystalIds[0] ?? null) : defaultCrystalId;

    await runAction(
      nextCrystalIds,
      nextDefaultCrystalId,
      "Glass unlinked successfully.",
      "Error unlinking glass.",
    );
  };

  const handleSetDefault = async (crystalId: number) => {
    await runAction(
      selectedCrystalIds,
      crystalId,
      "Default glass updated successfully.",
      "Error updating default glass.",
    );
  };

  const associatedColumns = useMemo(
    () => getAssociatedCrystalsColumns(handleRemove, handleSetDefault),
    [selectedCrystalIds, defaultCrystalId],
  );

  const availableColumns = useMemo(
    () => getAvailableCrystalsColumns(handleAdd),
    [selectedCrystalIds, defaultCrystalId],
  );

  const hasAssociated = associatedCrystals.length > 0;
  const hasAvailable = availableCrystals.length > 0;

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
                      Add Glass
                    </Button>
                  </DialogTrigger>
                </span>
              </TooltipTrigger>

              {!hasAvailable && (
                <TooltipContent side="bottom" align="end">
                  No available glass types to add.
                </TooltipContent>
              )}
            </Tooltip>

            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Add Glass to{" "}
                  <span className="font-semibold">{data.system.name}</span>
                </DialogTitle>
                <DialogDescription>
                  Select a glass type from the list to associate it with this
                  system.
                </DialogDescription>
              </DialogHeader>

              {hasAvailable ? (
                <DataTable
                  columns={availableColumns}
                  data={availableCrystals}
                  filterColumnId="glass"
                  filterPlaceholder="Search glass..."
                />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-10 text-center">
                  <PackageOpen className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">
                    No glass types available
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All glass types are already linked to this system.
                  </p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TooltipProvider>
      </div>

      <div>
        <h3 className="text-lg font-medium">Associated Glass Types</h3>

        {!hasAssociated ? (
          <div className="mt-2 flex flex-col items-center justify-center rounded-md border border-dashed p-10 text-center">
            <PackageOpen className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">
              No associated glass types
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add glass types to make them available under this system.
            </p>

            <Button
              className="mt-4 inline-flex items-center gap-2"
              onClick={() => setIsAddDialogOpen(true)}
              disabled={!hasAvailable}
            >
              <Plus className="h-4 w-4" />
              Add Glass
            </Button>
          </div>
        ) : (
          <div className="mt-2 rounded-md border">
            <DataTable
              columns={associatedColumns}
              data={associatedCrystals}
              filterColumnId="glass"
              filterPlaceholder="Filter associated glass..."
            />
          </div>
        )}
      </div>
    </div>
  );
}