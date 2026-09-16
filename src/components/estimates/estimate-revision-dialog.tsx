"use client";

import { Eye } from "lucide-react";
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
}: {
  revision: EstimateRevision;
  job: InstallationJob;
}) {
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
        showFinancials={false}
        action={
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
            >
              <Eye className="h-4 w-4" /> View changes
            </Button>
          </DialogTrigger>
        }
      />
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader className="pr-6">
          <DialogTitle>Review estimate changes</DialogTitle>
          <DialogDescription>
            Compare the original and revised measurements and prices.
            {revision.status === "PENDING_CUSTOMER_APPROVAL" &&
              " Close this window to approve or reject the changes in your Estimate."}
          </DialogDescription>
        </DialogHeader>
        <EstimateRevisionSummary revision={revision} comparison={comparison} />
        {originalQuote && revisedQuote && (
          <details className="min-w-0 rounded-lg border p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              Installation service details
            </summary>
            <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <h3 className="text-sm font-semibold">Original</h3>
                <InstallationQuoteTable quote={originalQuote} />
              </div>
              <div className="min-w-0 space-y-2">
                <h3 className="text-sm font-semibold">Revised</h3>
                <InstallationQuoteTable quote={revisedQuote} />
              </div>
            </div>
            {(comparison?.original.discountApplied ||
              comparison?.revised.discountApplied) && (
              <p className="mt-3 text-xs text-muted-foreground">
                Service line prices are shown before any additional discount.
                The totals above include applicable discounts.
              </p>
            )}
          </details>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
