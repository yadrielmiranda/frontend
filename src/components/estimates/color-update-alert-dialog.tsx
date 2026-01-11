"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface ColorUpdateAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  onCancel: () => void;
  onNewPiecesOnly: () => void;
  onUpdateAll: () => void;
}

export function ColorUpdateAlertDialog({
  open,
  onOpenChange,
  onCancel,
  onNewPiecesOnly,
  onUpdateAll,
}: ColorUpdateAlertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="mr-2 text-yellow-500" />
            Update Frame Color?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You have changed the default frame color. Do you want to apply this
            new color to all existing pieces in this estimate?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>

          <AlertDialogAction asChild>
            <Button variant="outline" onClick={onNewPiecesOnly}>
              For New Pieces Only
            </Button>
          </AlertDialogAction>

          <AlertDialogAction onClick={onUpdateAll}>
            Yes, Update All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
