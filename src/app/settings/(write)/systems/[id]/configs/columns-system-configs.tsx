"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { XCircle, PlusCircle } from "lucide-react";

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

type AvailableConfig = { id: number; conf: string };
type AssociatedConfig = { id: number; conf: string; allowScreen: boolean };

export const getAssociatedConfigsColumns = (
  handleRemove: (configId: number) => Promise<void>,
  handleToggleAllowScreen: (
    configId: number,
    allowScreen: boolean
  ) => Promise<void>
): ColumnDef<AssociatedConfig>[] => [
  {
    accessorKey: "conf",
    header: "Associated Config",
  },
  {
    id: "allowScreen",
    header: "Screen",
    cell: ({ row }) => {
      const config = row.original;
      const [checked, setChecked] = useState(config.allowScreen);
      const [isSaving, setIsSaving] = useState(false);
      const [confirmOpen, setConfirmOpen] = useState(false);
      const [pendingValue, setPendingValue] = useState<boolean | null>(null);

      const switchId = `allow-screen-${config.id}`;

      useEffect(() => {
        setChecked(config.allowScreen);
      }, [config.allowScreen]);

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
          await handleToggleAllowScreen(config.id, nextValue);
        } catch {
          setChecked(previousValue);
        } finally {
          setIsSaving(false);
          setPendingValue(null);
        }
      };

      const handleCancel = () => {
        setConfirmOpen(false);
        setPendingValue(null);
      };

      const isEnabling = pendingValue === true;

      return (
        <>
          <div className="flex items-center gap-3">
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
                <AlertDialogCancel onClick={handleCancel}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm}>
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const config = row.original;
      const [open, setOpen] = useState(false);

      return (
        <div className="text-right">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(true)}
                  aria-label="Remove config"
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
              await handleRemove(config.id);
              setOpen(false);
            }}
            itemName={`config "${config.conf}"`}
          />
        </div>
      );
    },
  },
];

export const getAvailableConfigsColumns = (
  handleAdd: (configId: number) => Promise<void>
): ColumnDef<AvailableConfig>[] => [
  {
    accessorKey: "conf",
    header: "Available Config",
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const config = row.original;

      return (
        <div className="text-right">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAdd(config.id)}
                  aria-label="Add config"
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