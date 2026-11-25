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

export function InitializeEstimateDialog({
  coverage,
  showWelcome,
}: {
  coverage: ClientDeliveryCoverage | null;
  showWelcome: boolean;
}) {
  const router = useRouter();

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
      toast.error("Estimate Name is required.");
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
        error instanceof Error
          ? error.message
          : "Failed to create the Estimate.",
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
        className="max-h-[90dvh] overflow-y-auto sm:max-w-md"
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{showWelcome ? "Create your first estimate" : "New Estimate"}</DialogTitle>
          <DialogDescription>
            {showWelcome
              ? "Give your project a name. Next, add your windows or doors and enter their measurements."
              : "Enter a name to create the estimate and begin adding pieces."}
          </DialogDescription>
        </DialogHeader>

        <form id="create-estimate" onSubmit={handleSubmit} className="py-2">
          <Label htmlFor="estimate-name">Estimate Name</Label>
          <Input
            id="estimate-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter Estimate Name"
            autoFocus
            disabled={isSubmitting}
            required
            className="mt-2"
          />
        </form>

        {canAddAddress && (
          <section className="space-y-2 rounded-md border p-4 text-sm">
            <h3 className="font-semibold">Delivery availability (optional)</h3>
            <p className="text-muted-foreground">
              Check delivery pricing for your address now or later. Pickup is available at our Miami warehouse.
            </p>
            {editingAddress ? (
              <ClientDeliveryCoveragePanel
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
                Add my address
              </Button>
            )}
          </section>
        )}
        {addressResult?.address && addressResult.estimatedPrice !== undefined && (
          <div className="rounded-md border p-4 text-sm">
            <SavedAddressResult result={addressResult} />
          </div>
        )}

        {editingAddress && <p id="pending-estimate-address" className="text-sm text-muted-foreground">
          Save or cancel the address to continue.
        </p>}
        <DialogFooter>
          {!editingAddress && <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>}
          <Button type="submit" form="create-estimate" variant="green"
            className="disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
            aria-describedby={editingAddress ? "pending-estimate-address" : undefined}
            disabled={editingAddress || checkingCoverage || isSubmitting || !name.trim()}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Creating..." : deferAddress ? "Decide later & create estimate" : "Create Estimate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
