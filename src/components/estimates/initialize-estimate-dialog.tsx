"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { initializeEstimate } from "@/app/api/estimates.api";
import type { ClientDeliveryCoverage } from "@/app/api/client-delivery.api";
import { ClientDeliveryCoveragePanel, SavedAddressResult } from "./client-delivery-review";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CompanyLocale } from "@/components/company/company-content";
import { usePortalLanguage } from "@/contexts/PortalLanguageContext";

const messages = {
  en: {
    title: "New Estimate",
    firstTitle: "Create your first estimate",
    description: "Enter a name to create the estimate and begin adding pieces.",
    firstDescription: "Give your project a name. Next, add your windows or doors and enter their measurements.",
    name: "Estimate Name",
    enterName: "Enter Estimate Name",
    missingName: "Estimate Name is required.",
    creationError: "Failed to create the Estimate.",
    delivery: "Delivery availability (optional)",
    deliveryInfo: "Check delivery pricing for your address now or later. Pickup is available at our Miami warehouse.",
    addAddress: "Add my address",
    pendingAddress: "Save or cancel the address to continue.",
    cancel: "Cancel",
    close: "Close",
    creating: "Creating...",
    defer: "Decide later & create estimate",
    create: "Create Estimate",
  },
  es: {
    title: "Nueva cotización",
    firstTitle: "Crea tu primera cotización",
    description: "Escribe un nombre para crear la cotización y empezar a agregar puertas o ventanas.",
    firstDescription: "Dale un nombre a tu proyecto. Después podrás agregar tus puertas o ventanas e indicar sus medidas.",
    name: "Nombre de la cotización",
    enterName: "Escribe un nombre para tu cotización",
    missingName: "Escribe un nombre para tu cotización.",
    creationError: "No se pudo crear la cotización. Inténtalo de nuevo.",
    delivery: "Disponibilidad de entrega (opcional)",
    deliveryInfo: "Puedes consultar el costo de entrega en tu dirección ahora o más adelante. También puedes recoger tu orden en nuestro almacén de Miami.",
    addAddress: "Agregar mi dirección",
    pendingAddress: "Guarda los cambios en tu dirección o cancélalos para continuar.",
    cancel: "Cancelar",
    close: "Cerrar",
    creating: "Creando cotización...",
    defer: "Decidir después y crear la cotización",
    create: "Crear cotización",
  },
} as const;

export function InitializeEstimateDialog({
  coverage,
  showWelcome,
  initialLocale,
}: {
  coverage: ClientDeliveryCoverage | null;
  showWelcome: boolean;
  initialLocale: CompanyLocale;
}) {
  const router = useRouter();
  const { locale } = usePortalLanguage(initialLocale);
  const copy = messages[locale];

  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [checkingCoverage, setCheckingCoverage] = useState(false);
  const [addressResult, setAddressResult] = useState<ClientDeliveryCoverage | null>(null);
  const currentCoverage = addressResult ?? coverage;
  const canAddAddress = currentCoverage?.canAddProfileAddress && !currentCoverage.address;
  const deferAddress = canAddAddress && !editingAddress;

  const handleClose = () => {
    if (isSubmitting || checkingCoverage) return;
    if (editingAddress) setEditingAddress(false);
    else router.replace("/estimates");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || checkingCoverage || editingAddress) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error(copy.missingName);
      return;
    }

    setIsSubmitting(true);

    try {
      const estimate = await initializeEstimate({
        name: trimmedName,
      });

      router.replace(`/estimates/${estimate.id}/edit`);
    } catch (error) {
      toast.error(
        locale === "en" && error instanceof Error
          ? error.message
          : copy.creationError,
      );

      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent
        lang={locale}
        closeLabel={copy.close}
        className="max-h-[90dvh] overflow-y-auto sm:max-w-md"
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{showWelcome ? copy.firstTitle : copy.title}</DialogTitle>
          <DialogDescription>
            {showWelcome ? copy.firstDescription : copy.description}
          </DialogDescription>
        </DialogHeader>

        <form id="create-estimate" onSubmit={handleSubmit} className="py-2">
          <Label htmlFor="estimate-name">{copy.name}</Label>
          <Input
            id="estimate-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={copy.enterName}
            autoFocus
            disabled={isSubmitting}
            required
            className="mt-2"
          />
        </form>

        {canAddAddress && (
          <section className="space-y-2 rounded-md border p-4 text-sm">
            <h3 className="font-semibold">{copy.delivery}</h3>
            <p className="text-muted-foreground">{copy.deliveryInfo}</p>
            {editingAddress ? (
              <ClientDeliveryCoveragePanel
                locale={locale}
                coverage={currentCoverage}
                onCancelAddress={handleClose}
                onBusyChange={setCheckingCoverage}
                onChecked={(result) => {
                  setAddressResult(result);
                  setCheckingCoverage(false);
                  setEditingAddress(false);
                }}
              />
            ) : (
              <Button type="button" variant="outline" disabled={isSubmitting}
                onClick={() => setEditingAddress(true)}>
                {copy.addAddress}
              </Button>
            )}
          </section>
        )}
        {addressResult?.address && addressResult.estimatedPrice !== undefined && (
          <div className="rounded-md border p-4 text-sm">
            <SavedAddressResult result={addressResult} locale={locale} />
          </div>
        )}

        {editingAddress && <p id="pending-estimate-address" className="text-sm text-muted-foreground">
          {copy.pendingAddress}
        </p>}
        <DialogFooter>
          {!editingAddress && <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            {copy.cancel}
          </Button>}
          <Button type="submit" form="create-estimate" variant="green"
            className="disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
            aria-describedby={editingAddress ? "pending-estimate-address" : undefined}
            disabled={editingAddress || checkingCoverage || isSubmitting || !name.trim()}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? copy.creating : deferAddress ? copy.defer : copy.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
