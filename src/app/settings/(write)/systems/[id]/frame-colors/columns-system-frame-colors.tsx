"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Circle, XCircle, PlusCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";

export type AssociatedFrameColor = {
  id: number;
  color: string;
  sortOrder: number;
  isDefault: boolean;
};

export type AvailableFrameColor = {
  id: number;
  color: string;
};

function FrameColorOrderInput({
  frameColor,
  onSave,
}: {
  frameColor: AssociatedFrameColor;
  onSave: (frameColorId: number, sortOrder: number) => Promise<boolean>;
}) {
  const [orderValue, setOrderValue] = useState(String(frameColor.sortOrder));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setOrderValue(String(frameColor.sortOrder));
  }, [frameColor.sortOrder]);

  const handleSave = async () => {
    if (isSaving) return;

    const normalizedValue = orderValue.trim();
    const nextOrder = Number(normalizedValue);

    if (
      normalizedValue === "" ||
      !Number.isInteger(nextOrder) ||
      nextOrder < 0
    ) {
      toast.error("Order must be a whole number greater than or equal to 0.");
      setOrderValue(String(frameColor.sortOrder));
      return;
    }

    if (nextOrder === frameColor.sortOrder) return;

    setIsSaving(true);

    try {
      const saved = await onSave(frameColor.id, nextOrder);

      if (!saved) {
        setOrderValue(String(frameColor.sortOrder));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Input
      type="number"
      min="0"
      step="1"
      value={orderValue}
      disabled={isSaving}
      className="w-24"
      aria-label={`${frameColor.color} order`}
      onChange={(event) => setOrderValue(event.target.value)}
      onBlur={() => void handleSave()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export const getAssociatedFrameColorsColumns = (
  handleRemove: (frameColorId: number) => Promise<void>,
  handleUpdateOrder: (
    frameColorId: number,
    sortOrder: number,
  ) => Promise<boolean>,
  handleSetDefault: (frameColorId: number) => Promise<void>,
): ColumnDef<AssociatedFrameColor>[] => [
  {
    accessorKey: "color",
    header: "Associated Frame Color",
  },
  {
    id: "default",
    header: "Default",
    cell: ({ row }) => {
      const frameColor = row.original;

      if (frameColor.isDefault) {
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            Default
          </Badge>
        );
      }

      return (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleSetDefault(frameColor.id)}
                className="gap-1 text-muted-foreground hover:text-blue-600"
              >
                <Circle className="h-3.5 w-3.5" />
                Set default
              </Button>
            </TooltipTrigger>
            <TooltipContent>Set as default frame color</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "sortOrder",
    header: "Order",
    cell: ({ row }) => (
      <FrameColorOrderInput
        frameColor={row.original}
        onSave={handleUpdateOrder}
      />
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const frameColor = row.original;
      const [open, setOpen] = useState(false);

      return (
        <div className="flex justify-end">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(true)}
                  aria-label="Remove frame color"
                >
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DeleteConfirmationDialog
            isOpen={open}
            onClose={() => setOpen(false)}
            onConfirm={async () => {
              await handleRemove(frameColor.id);
              setOpen(false);
            }}
            itemName={`frame color "${frameColor.color}"`}
          />
        </div>
      );
    },
  },
];

export const getAvailableFrameColorsColumns = (
  handleAdd: (frameColorId: number) => Promise<void>,
): ColumnDef<AvailableFrameColor>[] => [
  {
    accessorKey: "color",
    header: "Available Frame Color",
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const frameColor = row.original;

      return (
        <div className="text-right">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAdd(frameColor.id)}
                  aria-label="Add frame color"
                >
                  <PlusCircle className="h-4 w-4 text-green-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    },
  },
];
