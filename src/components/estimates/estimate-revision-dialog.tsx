"use client";

import { Eye } from "lucide-react";
import type { CompanyLocale } from "@/components/company/company-content";
import type { EstimateRevision, InstallationJob } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InstallationQuoteTable } from "@/components/installations/installation-quote-table";
import { EstimateRevisionSummary } from "./estimate-revision-summary";

export function EstimateRevisionDialog({
  revision,
  job,
  locale = "en",
}: {
  revision: EstimateRevision;
  job: InstallationJob;
  locale?: CompanyLocale;
}) {
  const spanish = locale === "es";
  const closeLabel = spanish ? "Cerrar" : "Close";
  const comparison =
    job.revisionComparison?.revisionId === revision.id
      ? job.revisionComparison
      : null;
  const originalQuote = job.quotes.find(
    (quote) => quote.id === comparison?.originalQuoteId,
  );
  const revisedQuote = job.quotes.find(
    (quote) => quote.id === revision.quoteId,
  );

  return (
    <Dialog>
      <EstimateRevisionSummary
        revision={revision}
        locale={locale}
        showFinancials={false}
        action={
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
            >
              <Eye className="h-4 w-4" /> {spanish ? "Ver cambios" : "View changes"}
            </Button>
          </DialogTrigger>
        }
      />
      <DialogContent closeLabel={closeLabel} className="max-h-[85dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader className="pr-6">
          <DialogTitle>{spanish ? "Revisar los cambios de la cotización" : "Review estimate changes"}</DialogTitle>
          <DialogDescription>
            {spanish
              ? "Compara las medidas y los precios originales con los revisados."
              : "Compare the original and revised measurements and prices."}
            {revision.status === "PENDING_CUSTOMER_APPROVAL" &&
              (spanish
                ? " Cierra esta ventana para aprobar o rechazar los cambios en tu cotización."
                : " Close this window to approve or reject the changes in your Estimate.")}
          </DialogDescription>
        </DialogHeader>
        <EstimateRevisionSummary revision={revision} comparison={comparison} locale={locale} />
        {originalQuote && revisedQuote && (
          <details className="min-w-0 rounded-lg border p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              {spanish ? "Detalle de los servicios de instalación" : "Installation service details"}
            </summary>
            <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <h3 className="text-sm font-semibold">Original</h3>
                <InstallationQuoteTable quote={originalQuote} locale={locale} />
              </div>
              <div className="min-w-0 space-y-2">
                <h3 className="text-sm font-semibold">{spanish ? "Revisada" : "Revised"}</h3>
                <InstallationQuoteTable quote={revisedQuote} locale={locale} />
              </div>
            </div>
            {(comparison?.original.discountApplied ||
              comparison?.revised.discountApplied) && (
              <p className="mt-3 text-xs text-muted-foreground">
                {spanish
                  ? "Los precios de cada servicio se muestran antes de aplicar descuentos adicionales. Los totales de arriba incluyen los descuentos aplicables."
                  : "Service line prices are shown before any additional discount. The totals above include applicable discounts."}
              </p>
            )}
          </details>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {closeLabel}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
