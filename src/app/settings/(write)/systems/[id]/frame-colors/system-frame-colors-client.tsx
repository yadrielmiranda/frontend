"use client";

import { useEffect, useMemo, useState } from "react";
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

  const initialAssociatedFrameColors = useMemo<AssociatedFrameColor[]>(() => {
    const associations =
      data.selectedFrameColors ??
      data.selectedFrameColorIds.map((idFrameColor, sortOrder) => ({
        idFrameColor,
        sortOrder,
        isDefault: sortOrder === 0,
      }));
    const associationById = new Map(
      associations.map((association) => [
        association.idFrameColor,
        association,
      ]),
    );

    return data.frameColorsCatalog
      .filter((frameColor) => associationById.has(frameColor.id))
      .map((frameColor) => {
        const association = associationById.get(frameColor.id);

        return {
          id: frameColor.id,
          color: frameColor.color,
          sortOrder: association?.sortOrder ?? 0,
          isDefault: association?.isDefault === true,
        };
      })
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.color.localeCompare(right.color) ||
          left.id - right.id,
      );
  }, [
    data.frameColorsCatalog,
    data.selectedFrameColorIds,
    data.selectedFrameColors,
  ]);

  const [associatedFrameColors, setAssociatedFrameColors] = useState(
    initialAssociatedFrameColors,
  );

  useEffect(() => {
    setAssociatedFrameColors(initialAssociatedFrameColors);
  }, [initialAssociatedFrameColors]);

  const selectedFrameColorIds = useMemo(
    () => associatedFrameColors.map((frameColor) => frameColor.id),
    [associatedFrameColors],
  );

  const hasOrderChanges =
    JSON.stringify(
      associatedFrameColors.map(({ id, sortOrder }) => ({ id, sortOrder })),
    ) !==
    JSON.stringify(
      initialAssociatedFrameColors.map(({ id, sortOrder }) => ({
        id,
        sortOrder,
      })),
    );

  const availableFrameColors = useMemo<AvailableFrameColor[]>(() => {
    return data.frameColorsCatalog
      .filter((frameColor) => !selectedFrameColorIds.includes(frameColor.id))
      .map((frameColor) => ({
        id: frameColor.id,
        color: frameColor.color,
      }));
  }, [data.frameColorsCatalog, selectedFrameColorIds]);

  const runAction = async (
    nextFrameColors: AssociatedFrameColor[],
    successMsg: string,
    errorMsg: string,
  ) => {
    try {
      await updateSystemFrameColors(data.system.id, {
        frameColors: nextFrameColors.map((frameColor) => ({
          frameColorId: frameColor.id,
          sortOrder: frameColor.sortOrder,
          isDefault: frameColor.isDefault,
        })),
      });

      setAssociatedFrameColors(nextFrameColors);
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
    const frameColor = data.frameColorsCatalog.find(
      (item) => item.id === frameColorId,
    );
    if (!frameColor) return;

    const highestOrder = associatedFrameColors.reduce(
      (highest, item) => Math.max(highest, item.sortOrder),
      -1,
    );
    const nextFrameColors = [
      ...associatedFrameColors,
      {
        id: frameColor.id,
        color: frameColor.color,
        sortOrder: highestOrder + 1,
        isDefault: !associatedFrameColors.some((item) => item.isDefault),
      },
    ];

    const succeeded = await runAction(
      nextFrameColors,
      "Frame color linked successfully.",
      "Error linking frame color.",
    );

    if (succeeded) setIsAddDialogOpen(false);
  };

  const handleRemove = async (frameColorId: number) => {
    let nextFrameColors = associatedFrameColors.filter(
      (frameColor) => frameColor.id !== frameColorId,
    );

    if (
      nextFrameColors.length > 0 &&
      !nextFrameColors.some((frameColor) => frameColor.isDefault)
    ) {
      nextFrameColors = nextFrameColors.map((frameColor, index) => ({
        ...frameColor,
        isDefault: index === 0,
      }));
    }

    await runAction(
      nextFrameColors,
      "Frame color removed successfully.",
      "Error removing frame color.",
    );
  };

  const handleSetDefault = async (frameColorId: number) => {
    const nextFrameColors = associatedFrameColors.map((frameColor) => ({
      ...frameColor,
      isDefault: frameColor.id === frameColorId,
    }));

    await runAction(
      nextFrameColors,
      "Default frame color updated successfully.",
      "Error updating default frame color.",
    );
  };

  const handleOrderChange = (frameColorId: number, sortOrder: number) => {
    setAssociatedFrameColors((current) =>
      current.map((frameColor) =>
        frameColor.id === frameColorId
          ? { ...frameColor, sortOrder }
          : frameColor,
      ),
    );
  };

  const handleSaveOrder = async () => {
    await runAction(
      associatedFrameColors,
      "Frame color order updated successfully.",
      "Error updating frame color order.",
    );
  };

  const associatedColumns = getAssociatedFrameColorsColumns(
    handleRemove,
    handleOrderChange,
    handleSetDefault,
  );

  const availableColumns = getAvailableFrameColorsColumns(handleAdd);

  const hasAssociated = associatedFrameColors.length > 0;
  const hasAvailable = availableFrameColors.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!hasOrderChanges}
          onClick={handleSaveOrder}
        >
          Save Order
        </Button>

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
