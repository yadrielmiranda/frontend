"use client";

import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ColorUpdateAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title?: string;
  description?: string;

  onCancel: () => void;
  onNewPiecesOnly: () => void;
  onUpdateAll: () => void | Promise<void>;

  isUpdating?: boolean;
}

export function ColorUpdateAlertDialog({
  open,
  onOpenChange,
  title = "Update Frame Color?",
  description = "You have changed the default frame color. Do you want to apply this new color to all existing pieces in this estimate?",
  onCancel,
  onNewPiecesOnly,
  onUpdateAll,
  isUpdating = false,
}: ColorUpdateAlertDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isUpdating) return;
        onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="mr-2 text-yellow-500" />
            {title}
          </AlertDialogTitle>

          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isUpdating}>
            Cancel
          </AlertDialogCancel>

          <Button
            type="button"
            variant="outline"
            onClick={onNewPiecesOnly}
            disabled={isUpdating}
          >
            For New Pieces Only
          </Button>

          <Button
            type="button"
            onClick={() => void onUpdateAll()}
            disabled={isUpdating}
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}

            {isUpdating ? "Updating..." : "Yes, Update All"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
