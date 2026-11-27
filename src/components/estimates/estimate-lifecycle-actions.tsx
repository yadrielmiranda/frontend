"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelEstimate, reactivateEstimate } from "@/app/api/estimates.api";
import type { EstimateWithRelations } from "@/lib/types";
import type { CompanyLocale } from "@/components/company/company-content";
import { estimateActionError, estimateActionText } from "@/lib/estimate-action-language";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export type EstimateLifecycleAction = "cancel" | "reactivate";
type Actor = { id: number; role: { name: string } };

export function estimateLifecycleAction(
  estimate: EstimateWithRelations,
  actor: Actor | null,
): EstimateLifecycleAction | null {
  if (
    !actor ||
    !(
      actor.role.name === "admin" ||
      actor.role.name === "operator" ||
      (actor.role.name === "dealer" && actor.id === estimate.idUser)
    )
  )
    return null;
  if (
    estimate.order ||
    estimate.payments?.some(
      (payment) =>
        ["PAID", "REFUNDED"].includes(payment.status) ||
        payment.paidAt ||
        Number(payment.netPaidBaseAmount) > 0 ||
        Number(payment.refundedAmount) > 0 ||
        Number(payment.refundCreditAmount) > 0 ||
        payment.refundReviewPending,
    )
  )
    return null;
  if (estimate.status?.name === "Canceled") return "reactivate";
  return ["Active", "Expired"].includes(estimate.status?.name ?? "")
    ? "cancel"
    : null;
}

export function EstimateLifecycleDialog({
  estimate,
  action,
  onClose,
  locale = "en",
}: {
  estimate: EstimateWithRelations;
  action: EstimateLifecycleAction | null;
  onClose: () => void;
  locale?: CompanyLocale;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const reactivating = action === "reactivate";
  const t = estimateActionText.bind(null, locale);
  const actionLabel = t(reactivating ? "Reactivate estimate" : "Cancel estimate");
  async function confirm() {
    if (!action || busy || reactivating && estimate.user?.networkSalesBlocked) return;
    setBusy(true);
    try {
      if (reactivating) await reactivateEstimate(estimate.id);
      else await cancelEstimate(estimate.id);
      toast.success(t(
        reactivating
          ? "Estimate reactivated and recalculated. Review the updated estimate before sharing it again."
          : "Estimate canceled.",
      ));
      onClose();
      if (reactivating) router.push(`/estimates/${estimate.id}`);
      router.refresh();
    } catch (error) {
      toast.error(estimateActionError(locale, error, t(reactivating ? "Could not reactivate the estimate." : "Could not cancel the estimate.")));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={action !== null}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent lang={locale} closeLabel={t("Close")} showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>
            {locale === "es" ? "¿" : ""}{actionLabel} #{estimate.number}?
          </DialogTitle>
          <DialogDescription>
            {t(reactivating
              ? "The estimate will be recalculated with current prices and a new expiration date. Review it and share an updated agreement for a new signature before payment. Previous signed documents will be preserved."
              : "Payments and signing will stop, and open payment links will be closed. The estimate and its signed documents will be preserved. You can reactivate and recalculate it later.")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            {t("Go back")}
          </Button>
          <Button
            variant={reactivating ? "default" : "destructive"}
            disabled={busy || Boolean(reactivating && estimate.user?.networkSalesBlocked)}
            onClick={() => void confirm()}
          >
            {t(busy
              ? reactivating
                ? "Recalculating…"
                : "Canceling…"
              : reactivating
                ? "Reactivate and recalculate"
                : "Cancel estimate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EstimateLifecycleButton({
  estimate,
  actor,
  locale = "en",
}: {
  estimate: EstimateWithRelations;
  actor: Actor;
  locale?: CompanyLocale;
}) {
  const [open, setOpen] = useState(false);
  const action = estimateLifecycleAction(estimate, actor);
  if (!action) return null;
  return (
    <>
      <Button variant="outline" disabled={action === "reactivate" && estimate.user?.networkSalesBlocked} onClick={() => setOpen(true)}>
        {estimateActionText(locale, action === "reactivate" ? "Reactivate estimate" : "Cancel estimate")}
      </Button>
      <EstimateLifecycleDialog
        estimate={estimate}
        locale={locale}
        action={open ? action : null}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
