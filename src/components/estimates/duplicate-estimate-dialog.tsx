"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { duplicateEstimate } from "@/app/api/estimates.api";
import { isApiError } from "@/app/api/_base";
import type { EstimateWithRelations } from "@/lib/types";
import type { CompanyLocale } from "@/components/company/company-content";
import { estimateActionText, estimateActionError } from "@/lib/estimate-action-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type Actor = { id: number; role: { name: string } };

export function canDuplicateEstimate(estimate: EstimateWithRelations, actor: Actor | null) {
  if (!actor || !["dealer", "client"].includes(estimate.user?.role?.name ?? "")) return false;
  return estimate.dealerNetwork?.canAssist === true || ["admin", "operator"].includes(actor.role.name) ||
    (["dealer", "client"].includes(actor.role.name) && actor.id === estimate.idUser);
}

// Se monta al abrir para que cada intento comience con una elección nueva.
export function DuplicateEstimateDialog({ estimate, onClose, locale = "en" }: {
  estimate: EstimateWithRelations;
  onClose: () => void;
  locale?: CompanyLocale;
}) {
  const router = useRouter();
  const hasInstallation = Boolean(estimate.installationJob && estimate.installationJob.status !== "CANCELED");
  const [editedName, setName] = useState<string | null>(null);
  const suffix = locale === "es" ? " (copia)" : " (copy)";
  const name = editedName ?? `${estimate.name.slice(0, 255 - suffix.length)}${suffix}`;
  const [includeInstallation, setIncludeInstallation] = useState<boolean | null>(hasInstallation ? null : false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [outsideCoverage, setOutsideCoverage] = useState(false);
  const blocked = busy || !name.trim() || includeInstallation === null || (outsideCoverage && includeInstallation);
  const t = estimateActionText.bind(null, locale);

  async function confirm() {
    if (inFlight.current || blocked) return;
    inFlight.current = true;
    setBusy(true);
    setErrorMessage("");
    try {
      const copy = await duplicateEstimate(estimate.id, {
        name: name.trim(), includeInstallation: includeInstallation === true,
      });
      toast.success(locale === "es" ? `Se creó la cotización #${copy.number}. Revisa los precios actualizados.` : `Estimate #${copy.number} created. Review the updated prices.`);
      onClose();
      router.push(`/estimates/${copy.id}/edit`);
      router.refresh();
    } catch (error) {
      const data = isApiError(error) ? error.data : null;
      const unavailable = data && typeof data === "object" && "code" in data && data.code === "INSTALLATION_OUTSIDE_COVERAGE";
      if (unavailable) {
        setOutsideCoverage(true);
        setErrorMessage("Installation is no longer available at this address under the current coverage rules. Choose materials only to continue, or cancel.");
      } else {
        setErrorMessage(error instanceof Error ? error.message : "The estimate could not be duplicated. Please try again.");
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !inFlight.current) onClose(); }}>
      <DialogContent lang={locale} closeLabel={t("Close")} showCloseButton={!busy} aria-describedby={undefined}>
        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void confirm(); }}>
          <DialogHeader>
            <DialogTitle>{t("Duplicate estimate")} #{estimate.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor={`copy-name-${estimate.id}`} className="text-sm font-medium">{t("New estimate name")}</label>
            <Input id={`copy-name-${estimate.id}`} value={name} onChange={(event) => setName(event.target.value)} maxLength={255} required disabled={busy} />
          </div>
          {hasInstallation && (
            <fieldset className="space-y-3" disabled={busy}>
              <legend className="mb-2 text-sm font-medium">{t("What would you like to duplicate?")}</legend>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                <input type="radio" name="duplicate-content" className="mt-1" checked={includeInstallation === false} onChange={() => { setIncludeInstallation(false); setErrorMessage(""); }} required />
                <span><span className="block text-sm font-medium">{t("Materials only")}</span><span className="text-sm text-muted-foreground">{t("Copy the pieces without installation, installation services or permits.")}</span></span>
              </label>
              <label className={`flex items-start gap-3 rounded-md border p-3 ${outsideCoverage ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                <input type="radio" name="duplicate-content" className="mt-1" checked={includeInstallation === true} disabled={outsideCoverage} onChange={() => { setIncludeInstallation(true); setErrorMessage(""); }} required />
                <span><span className="block text-sm font-medium">{t("Materials with installation")}</span><span className="text-sm text-muted-foreground">{t("Copy the address, services and permit request. Coverage and installation prices will be checked again.")}</span></span>
              </label>
            </fieldset>
          )}
          {estimate.manualDiscount && <p className="text-sm text-muted-foreground">{t("Additional discounts must be applied separately to the new estimate.")}</p>}
          {errorMessage && <p role="alert" className="text-sm text-destructive">{estimateActionError(locale, errorMessage, t("The estimate could not be duplicated. Please try again."))}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t("Cancel")}</Button>
            <Button type="submit" disabled={blocked}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
              {t(busy ? "Duplicating…" : "Duplicate estimate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DuplicateEstimateButton({ estimate, actor, iconOnly = false, disabled = false, beforeOpen, locale = "en" }: {
  estimate: EstimateWithRelations;
  actor: Actor | null;
  iconOnly?: boolean;
  disabled?: boolean;
  beforeOpen?: () => Promise<boolean>;
  locale?: CompanyLocale;
}) {
  const [open, setOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const preparingRef = useRef(false);
  const unavailable = disabled || Boolean(estimate.user?.networkSalesBlocked);
  const duplicateLabel = estimateActionText(locale, "Duplicate estimate");
  if (!canDuplicateEstimate(estimate, actor)) return null;

  async function openDialog() {
    if (unavailable || preparingRef.current) return;
    preparingRef.current = true;
    setPreparing(true);
    try {
      if (beforeOpen && !(await beforeOpen())) return;
      setOpen(true);
    } catch (error) {
      toast.error(estimateActionError(locale, error, estimateActionText(locale, "Could not prepare the estimate. Please try again.")));
    } finally {
      preparingRef.current = false;
      setPreparing(false);
    }
  }

  return <>
    <Button
      type="button"
      variant="outline"
      size={iconOnly ? "icon" : "default"}
      className={iconOnly ? "h-8 w-8 p-0" : undefined}
      title={duplicateLabel}
      aria-label={`${duplicateLabel} #${estimate.number}`}
      disabled={unavailable || preparing}
      onClick={() => void openDialog()}
    >
      {preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
      {!iconOnly && duplicateLabel}
    </Button>
    {open && <DuplicateEstimateDialog estimate={estimate} locale={locale} onClose={() => setOpen(false)} />}
  </>;
}
