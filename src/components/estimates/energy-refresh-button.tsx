"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { refreshEstimateEnergyRatings } from "@/app/api/energy-ratings.api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EstimateWithRelations } from "@/lib/types";

/** Render only where the viewer can edit the estimate and it is not locked. */
export function EnergyRefreshButton({ estimateId, onRefreshed, disabled = false, beforeRefresh, onBusyChange }: {
  estimateId: number;
  disabled?: boolean;
  beforeRefresh?: () => boolean | Promise<boolean>;
  onBusyChange?: (busy: boolean) => void;
  onRefreshed?: (updated: EstimateWithRelations) => void | Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (busy || disabled) return;
    setBusy(true);
    onBusyChange?.(true);
    try {
      if (beforeRefresh && !(await beforeRefresh())) {
        toast.error("Finish the current estimate operation before updating energy values.");
        return;
      }
      const updated = await refreshEstimateEnergyRatings(estimateId);
      if (onRefreshed) await onRefreshed(updated);
      else router.refresh();
      setOpen(false);
      toast.success("Energy values updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update energy values");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  return <>
    <Button type="button" variant="outline" disabled={disabled || busy} onClick={() => setOpen(true)}><RefreshCw className="h-4 w-4" />Update Energy Values</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
      <DialogContent showCloseButton={!busy}>
        <DialogHeader><DialogTitle>Update energy values?</DialogTitle><DialogDescription>This replaces the saved U-factor, SHGC and VLT for this estimate with the current catalog matches. Combinations without a match will show Data unavailable. Prices and product selections stay the same.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button><Button onClick={refresh} disabled={busy || disabled}>{busy ? "Updating..." : "Update Energy Values"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
