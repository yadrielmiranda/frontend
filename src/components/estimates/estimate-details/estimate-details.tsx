"use client";

import { useEffect, useMemo, useState } from "react";
import { EstimateWithRelations } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Printer, Copy, Share2 } from "lucide-react";
import { BackLink } from "@/components/navigation/back-link";

import { EstimateReportShell } from "./parts/estimate-report-shell";
import { EstimateViewClient } from "./views/estimate-view-client";
import { EstimateViewDealerInternal } from "./views/estimate-view-dealer-internal";
import { EstimateViewAdmin } from "./views/estimate-view-admin";
import { EstimateViewDealerPublic } from "./views/estimate-view-dealer-public";
import { isAdminRole, isDealerRole, isOperatorRole } from "@/lib/rbac";
import { toast } from "sonner";
import { getOrCreateEstimatePublicToken } from "@/app/api/estimates.api";

// =============================
// ESTIMATE DETAILS
// =============================

type ReportMode = "admin" | "dealer" | "customer";
type CustomerPricingMode = "detailed" | "total";
type ReportOption = {
  key: string;
  label: string;
  reportMode: ReportMode;
  customerPricingMode?: CustomerPricingMode;
};
type PdfView =
  | "client"
  | "dealer_internal"
  | "dealer_public"
  | "dealer_public_total"
  | "admin";

const REPORT_LABELS: Record<ReportMode, string> = {
  admin: "Admin Report",
  dealer: "Dealer Report",
  customer: "Customer Report",
};

export function EstimateDetails({
  estimate,
  userRole,
  initialPublicView = false,
  initialCustomerPricingMode = "detailed",
}: {
  estimate: EstimateWithRelations;
  userRole: string;
  initialPublicView?: boolean;
  initialCustomerPricingMode?: CustomerPricingMode;
}) {
  const ownerRole = estimate.user?.role?.name ?? null;
  const ownerIsDealer = isDealerRole(ownerRole);
  const currentUserIsDealer = isDealerRole(userRole);
  const currentUserIsPrivileged =
    isAdminRole(userRole) || isOperatorRole(userRole);

  const allowedReportModes = useMemo<ReportMode[]>(() => {
    if (currentUserIsPrivileged) {
      return ownerIsDealer
        ? ["admin", "dealer", "customer"]
        : ["admin", "customer"];
    }

    if (currentUserIsDealer && ownerIsDealer) {
      return ["dealer", "customer"];
    }

    return ["customer"];
  }, [currentUserIsDealer, currentUserIsPrivileged, ownerIsDealer]);

  const defaultReportMode = useMemo<ReportMode>(() => {
    if (
      initialPublicView &&
      ownerIsDealer &&
      (currentUserIsDealer || currentUserIsPrivileged)
    ) {
      return "customer";
    }

    if (currentUserIsPrivileged) return "admin";
    if (currentUserIsDealer && ownerIsDealer) return "dealer";
    return "customer";
  }, [
    currentUserIsDealer,
    currentUserIsPrivileged,
    initialPublicView,
    ownerIsDealer,
  ]);

  const [reportMode, setReportMode] = useState<ReportMode>(defaultReportMode);
  const [customerPricingMode, setCustomerPricingMode] =
    useState<CustomerPricingMode>(initialCustomerPricingMode);

  useEffect(() => {
    if (!allowedReportModes.includes(reportMode)) {
      setReportMode(defaultReportMode);
    }
  }, [allowedReportModes, defaultReportMode, reportMode]);

  const reportOptions = useMemo<ReportOption[]>(() => {
    const options: ReportOption[] = [];

    for (const mode of allowedReportModes) {
      if (mode === "customer" && ownerIsDealer) {
        options.push(
          {
            key: "customer-detailed",
            label: "Customer Detailed Prices",
            reportMode: "customer",
            customerPricingMode: "detailed",
          },
          {
            key: "customer-total",
            label: "Customer Project Total",
            reportMode: "customer",
            customerPricingMode: "total",
          },
        );
        continue;
      }

      options.push({
        key: mode,
        label: REPORT_LABELS[mode],
        reportMode: mode,
      });
    }

    return options;
  }, [allowedReportModes, ownerIsDealer]);

  const activeReportOptionKey =
    reportMode === "customer" && ownerIsDealer
      ? customerPricingMode === "total"
        ? "customer-total"
        : "customer-detailed"
      : reportMode;

  const canShareCustomerReport =
    currentUserIsDealer && ownerIsDealer && reportMode === "customer";

  const copyTextToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // comentario en español: fallback para HTTP/IP local donde clipboard puede venir undefined
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const copied = document.execCommand("copy");
    textarea.remove();

    if (!copied) {
      throw new Error("Could not copy customer link.");
    }
  };

  const buildPublicEstimateUrl = (token: string) => {
    return `${window.location.origin}/public/estimates/${token}`;
  };

  const handleCopyPublicLink = async () => {
    try {
      const response = await getOrCreateEstimatePublicToken(
        estimate.id,
        customerPricingMode,
      );

      if (!response.token) {
        toast.error("Could not generate customer link.");
        return;
      }

      const url = buildPublicEstimateUrl(response.token);

      await copyTextToClipboard(url);

      toast.success("Customer link copied.");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleSharePublicLink = async () => {
    try {
      const response = await getOrCreateEstimatePublicToken(
        estimate.id,
        customerPricingMode,
      );

      if (!response.token) {
        toast.error("Could not generate customer link.");
        return;
      }

      const url = buildPublicEstimateUrl(response.token);

      const shareData = {
        title: `Estimate #${estimate.number}`,
        text: `Please review estimate #${estimate.number}.`,
        url,
      };

      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      // fallback para desktop sin Web Share API: abrir email.
      const subject = `Estimate #${estimate.number}`;
      const body = [
        `Hello,`,
        ``,
        `Please review estimate #${estimate.number} using the link below:`,
        ``,
        url,
        ``,
        `Thank you.`,
      ].join("\n");

      const mailtoUrl = `mailto:?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(body)}`;

      window.location.href = mailtoUrl;
    } catch (error) {
      // comentario en español: si el usuario cancela el share nativo, no mostramos error.
      if ((error as Error).name === "AbortError") return;

      toast.error((error as Error).message);
    }
  };

  // ================
  // Selector de vista
  // ================
  const viewContent = useMemo(() => {
    if (reportMode === "customer") {
      return ownerIsDealer ? (
        <EstimateViewDealerPublic
          estimate={estimate}
          pricingMode={customerPricingMode}
        />
      ) : (
        <EstimateViewClient estimate={estimate} />
      );
    }

    if (reportMode === "dealer") {
      return <EstimateViewDealerInternal estimate={estimate} />;
    }

    return <EstimateViewAdmin estimate={estimate} />;
  }, [customerPricingMode, estimate, ownerIsDealer, reportMode]);

  const pdfView = useMemo<PdfView>(() => {
    if (reportMode === "admin") return "admin";
    if (reportMode === "dealer") return "dealer_internal";
    if (!ownerIsDealer) return "client";
    return customerPricingMode === "total"
      ? "dealer_public_total"
      : "dealer_public";
  }, [customerPricingMode, ownerIsDealer, reportMode]);

  const pdfHref = `/api/estimates/${estimate.id}/pdf?view=${pdfView}`;

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 space-y-4 print:hidden">
          <div className="flex items-center justify-between gap-4">
            <BackLink href="/estimates" label="Back to Estimates" />

            <Button asChild>
              <a href={pdfHref} target="_blank" rel="noopener noreferrer">
                <Printer className="mr-2 h-4 w-4" /> Print / PDF
              </a>
            </Button>
          </div>

          {reportOptions.length > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div
                className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
                role="group"
                aria-label="Select report"
              >
                {reportOptions.map((option) => (
                  <Button
                    key={option.key}
                    type="button"
                    size="sm"
                    variant={
                      activeReportOptionKey === option.key ? "default" : "ghost"
                    }
                    aria-pressed={activeReportOptionKey === option.key}
                    onClick={() => {
                      setReportMode(option.reportMode);
                      if (option.customerPricingMode) {
                        setCustomerPricingMode(option.customerPricingMode);
                      }
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              {canShareCustomerReport && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPublicLink}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy link
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSharePublicLink}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <EstimateReportShell
          estimate={estimate}
          reportLabel={REPORT_LABELS[reportMode]}
          internal={reportMode !== "customer"}
        >
          {viewContent}
        </EstimateReportShell>
      </div>
    </div>
  );
}
