"use client";

import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CompanyLocale } from "@/components/company/company-content";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const attributeCopy = {
  frameColor: {
    en: ["Update Frame Color?", "You have changed the default frame color. Do you want to apply this new color to all existing pieces in this estimate?"],
    es: ["¿Actualizar el color del marco?", "Cambiaste el color de marco predeterminado. ¿Quieres aplicarlo también a todas las piezas existentes de esta cotización?"],
  },
  tint: {
    en: ["Update Glass Color?", "You changed the default glass color. Apply it to all existing pieces in this estimate?"],
    es: ["¿Actualizar el color del vidrio?", "Cambiaste el color del vidrio predeterminado. ¿Quieres aplicarlo también a todas las piezas existentes de esta cotización?"],
  },
  coating: {
    en: ["Update Coating?", "You have changed the default coating. Do you want to apply this new coating to all existing pieces in this estimate?"],
    es: ["¿Actualizar el recubrimiento?", "Cambiaste el recubrimiento predeterminado. ¿Quieres aplicarlo también a todas las piezas existentes de esta cotización?"],
  },
} as const;

interface ColorUpdateAlertDialogProps {
  locale?: CompanyLocale;
  attribute?: keyof typeof attributeCopy;
  open: boolean;
  onOpenChange: (open: boolean) => void;

  onCancel: () => void;
  onNewPiecesOnly: () => void;
  onUpdateAll: () => void | Promise<void>;

  isUpdating?: boolean;
}

export function ColorUpdateAlertDialog({
  locale = "en",
  attribute = "frameColor",
  open,
  onOpenChange,
  onCancel,
  onNewPiecesOnly,
  onUpdateAll,
  isUpdating = false,
}: ColorUpdateAlertDialogProps) {
  const [title, description] = attributeCopy[attribute][locale];
  const spanish = locale === "es";
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isUpdating) return;
        onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent lang={locale}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="mr-2 text-yellow-500" />
            {title}
          </AlertDialogTitle>

          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isUpdating}>
            {spanish ? "Cancelar" : "Cancel"}
          </AlertDialogCancel>

          <Button
            type="button"
            variant="outline"
            onClick={onNewPiecesOnly}
            disabled={isUpdating}
          >
            {spanish ? "Solo para piezas nuevas" : "For New Pieces Only"}
          </Button>

          <Button
            type="button"
            onClick={() => void onUpdateAll()}
            disabled={isUpdating}
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}

            {isUpdating
              ? (spanish ? "Actualizando..." : "Updating...")
              : (spanish ? "Sí, actualizar todas" : "Yes, Update All")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
