"use client";

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
import { AlertTriangle } from "lucide-react";

// 1. AÑADIMOS 'itemName' A LAS PROPS DEL COMPONENTE
interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string; // Hacemos que sea opcional para no romper otras partes
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName, // Recibimos la nueva prop
}: DeleteConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}> 
      <AlertDialogContent>
        <AlertDialogHeader>
          {/* 2. HACEMOS EL TÍTULO MÁS GENÉRICO */}
          <AlertDialogTitle className="flex items-center gap-2"> 
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Are you absolutely sure?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete{' '}
            {/* 3. USAMOS 'itemName' PARA UN MENSAJE ESPECÍFICO */}
            <span className="font-bold text-black-600">
              {itemName || 'the selected item'}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}