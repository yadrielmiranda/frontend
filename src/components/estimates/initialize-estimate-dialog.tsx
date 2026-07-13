"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { initializeEstimate } from "@/app/api/estimates.api";
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

export function InitializeEstimateDialog() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (isSubmitting) return;

    router.replace("/estimates");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Estimate</DialogTitle>
            <DialogDescription>
              Enter a name to create the Estimate and begin adding pieces.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <Label htmlFor="estimate-name">Estimate Name</Label>

            <Input
              id="estimate-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter Estimate Name"
              autoFocus
              disabled={isSubmitting}
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="green"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}

              {isSubmitting ? "Creating..." : "Create Estimate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}