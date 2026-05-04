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
  updateSystemFrameColors,
  type SystemFrameColorsManage,
} from "@/app/api/systems.api";

import {
  getAssociatedFrameColorsColumns,
  getAvailableFrameColorsColumns,
  type AssociatedFrameColor,
  type AvailableFrameColor,
} from "./columns-system-frame-colors";

export function SystemFrameColorsClient({
  data,
}: {
  data: SystemFrameColorsManage;
}) {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const selectedFrameColorIds = data.selectedFrameColorIds;
  const defaultFrameColorId = data.defaultFrameColorId;

  const associatedFrameColors = useMemo<AssociatedFrameColor[]>(() => {
    return data.frameColorsCatalog
      .filter((frameColor) => selectedFrameColorIds.includes(frameColor.id))
      .map((frameColor) => ({
        id: frameColor.id,
        color: frameColor.color,
        isDefault: defaultFrameColorId === frameColor.id,
      }));
  }, [data.frameColorsCatalog, selectedFrameColorIds, defaultFrameColorId]);

  const availableFrameColors = useMemo<AvailableFrameColor[]>(() => {
    return data.frameColorsCatalog
      .filter((frameColor) => !selectedFrameColorIds.includes(frameColor.id))
      .map((frameColor) => ({
        id: frameColor.id,
        color: frameColor.color,
      }));
  }, [data.frameColorsCatalog, selectedFrameColorIds]);

  const runAction = async (
    nextFrameColorIds: number[],
    nextDefaultFrameColorId: number | null,
    successMsg: string,
    errorMsg: string
  ) => {
    try {
      await updateSystemFrameColors(data.system.id, {
        frameColorIds: nextFrameColorIds,
        defaultFrameColorId: nextDefaultFrameColorId,
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

  const handleAdd = async (frameColorId: number) => {
    const nextFrameColorIds = [...selectedFrameColorIds, frameColorId];
    const nextDefaultFrameColorId = defaultFrameColorId ?? frameColorId;

    await runAction(
      nextFrameColorIds,
      nextDefaultFrameColorId,
      "Frame color linked successfully.",
      "Error linking frame color."
    );
  };

  const handleRemove = async (frameColorId: number) => {
    const nextFrameColorIds = selectedFrameColorIds.filter(
      (id) => id !== frameColorId
    );

    const nextDefaultFrameColorId =
      defaultFrameColorId === frameColorId
        ? nextFrameColorIds[0] ?? null
        : defaultFrameColorId;

    await runAction(
      nextFrameColorIds,
      nextDefaultFrameColorId,
      "Frame color unlinked successfully.",
      "Error unlinking frame color."
    );
  };

  const handleSetDefault = async (frameColorId: number) => {
    await runAction(
      selectedFrameColorIds,
      frameColorId,
      "Default frame color updated successfully.",
      "Error updating default frame color."
    );
  };

  const associatedColumns = useMemo(
    () => getAssociatedFrameColorsColumns(handleRemove, handleSetDefault),
    [selectedFrameColorIds, defaultFrameColorId]
  );

  const availableColumns = useMemo(
    () => getAvailableFrameColorsColumns(handleAdd),
    [selectedFrameColorIds, defaultFrameColorId]
  );

  const hasAssociated = associatedFrameColors.length > 0;
  const hasAvailable = availableFrameColors.length > 0;

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
                      Add Frame Color
                    </Button>
                  </DialogTrigger>
                </span>
              </TooltipTrigger>

              {!hasAvailable && (
                <TooltipContent side="bottom" align="end">
                  No available frame colors to add.
                </TooltipContent>
              )}
            </Tooltip>

            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Add Frame Color to{" "}
                  <span className="font-semibold">{data.system.name}</span>
                </DialogTitle>
                <DialogDescription>
                  Select a frame color from the list to associate it with this
                  system.
                </DialogDescription>
              </DialogHeader>

              {hasAvailable ? (
                <DataTable
                  columns={availableColumns}
                  data={availableFrameColors}
                  filterColumnId="color"
                  filterPlaceholder="Search frame color..."
                />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-10 text-center">
                  <PackageOpen className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">
                    No frame colors available
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All frame colors are already linked to this system.
                  </p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TooltipProvider>
      </div>

      <div>
        <h3 className="text-lg font-medium">Associated Frame Colors</h3>

        {!hasAssociated ? (
          <div className="mt-2 flex flex-col items-center justify-center rounded-md border border-dashed p-10 text-center">
            <PackageOpen className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">
              No associated frame colors
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add frame colors to make them available under this system.
            </p>

            <Button
              className="mt-4 inline-flex items-center gap-2"
              onClick={() => setIsAddDialogOpen(true)}
              disabled={!hasAvailable}
            >
              <Plus className="h-4 w-4" />
              Add Frame Color
            </Button>
          </div>
        ) : (
          <div className="mt-2 rounded-md border">
            <DataTable
              columns={associatedColumns}
              data={associatedFrameColors}
              filterColumnId="color"
              filterPlaceholder="Filter associated frame colors..."
            />
          </div>
        )}
      </div>
    </div>
  );
}