"use client";

import { MaterialRevisionAccess } from "@/components/estimates/material-revisions/material-revision-access";

import { prepareEstimateAgreement, type AgreementStatus } from '@/app/api/contracts.api';
import { DealerAgreementPanel } from '../agreements/dealer-agreement-panel';
import { EstimateLifecycleButton } from '../estimate-lifecycle-actions';

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { DealerMode, EstimateWithRelations } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Printer, Copy, Share2, Mail } from "lucide-react";
import { BackLink } from "@/components/navigation/back-link";

import { EstimateReportShell } from "./parts/estimate-report-shell";
import { EstimateViewClient } from "./views/estimate-view-client";
import { EstimateViewDealerInternal } from "./views/estimate-view-dealer-internal";
import { EstimateViewAdmin } from "./views/estimate-view-admin";
import { EstimateViewDealerPublic } from "./views/estimate-view-dealer-public";
import { isAdminRole, isDealerRole, isOperatorRole } from "@/lib/rbac";
import { toast } from "sonner";
import { emailEstimateShare, getOrCreateEstimatePublicToken } from "@/app/api/estimates.api";

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
  currentUserId,
  currentUserDealerMode,
  initialPublicView = false,
  initialCustomerPricingMode = "detailed",
  returnToEdit = false,
}: {
  estimate: EstimateWithRelations;
  userRole: string;
  currentUserId: number;
  currentUserDealerMode?: DealerMode | null;
  initialPublicView?: boolean;
  initialCustomerPricingMode?: CustomerPricingMode;
  returnToEdit?: boolean;
}) {
  const [readyShare, setReadyShare] = useState<ShareData | null>(null);
  const [readyCopy, setReadyCopy] = useState<string | null>(null);
  const [manualCopy, setManualCopy] = useState(false);
  const copyField = useRef<HTMLTextAreaElement>(null);
  const [sharing, setSharing] = useState(false);
  const sharingBusy = useRef(false);
  const [emailDraft, setEmailDraft] = useState<{ context: string; recipient: string } | null>(null);
  const [emailError, setEmailError] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [agreementRefresh, setAgreementRefresh] = useState(0);
  const [includeContract, setIncludeContract] = useState(false);
  const [agreementStatus, setAgreementStatus] = useState<AgreementStatus | null>(null);
  const isCanceled = estimate.status?.name === "Canceled";
  useEffect(() => { setIncludeContract(false); setAgreementStatus(null); }, [estimate.id, isCanceled]);
  useEffect(() => {
    if (agreementStatus && !agreementStatus.defaultContract && !emailDraft && !sharingBusy.current) setIncludeContract(false);
  }, [agreementStatus, emailDraft, sharing]);
  const ownerRole = estimate.user?.role?.name ?? null;
  const ownerIsDealer = isDealerRole(ownerRole);
  const currentUserIsDealer = isDealerRole(userRole);
  const currentUserIsOwner = currentUserId === estimate.idUser;
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

  // Un enlace preparado pertenece al estimado y a la presentación seleccionados.
  useEffect(() => {
    setReadyCopy(null);
    setReadyShare(null);
    setManualCopy(false);
  }, [estimate, reportMode, customerPricingMode, includeContract]);

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
    !isCanceled && ownerIsDealer && reportMode === "customer" &&
    (isAdminRole(userRole) || (currentUserIsDealer && (currentUserIsOwner || estimate.dealerNetwork?.canAssist === true)));
  const canEmailCustomerReport = canShareCustomerReport &&
    (isAdminRole(userRole) || currentUserDealerMode === "INTERNAL");
  const shareContext = JSON.stringify([
    estimate.id, estimate.customerEmail, estimate.idUser, currentUserId,
    userRole, currentUserDealerMode, canShareCustomerReport, reportMode,
    customerPricingMode, includeContract,
  ]);
  const activeShareContext = useRef(shareContext);
  activeShareContext.current = shareContext;
  const emailOpen = canEmailCustomerReport && emailDraft?.context === shareContext;
  const emailRecipient = emailOpen ? emailDraft.recipient : "";
  const validEmailRecipient = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRecipient.trim()) && emailRecipient.trim().length <= 254;

  useEffect(() => {
    setEmailDraft(null);
    setEmailError("");
    setReadyCopy(null);
    setReadyShare(null);
  }, [shareContext]);
  useEffect(() => () => { activeShareContext.current = ""; }, []);

  const handleEmailEstimate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sharingBusy.current || !emailOpen || activeShareContext.current !== shareContext) return;
    if (!validEmailRecipient) {
      setEmailError("Enter a valid customer email address.");
      return;
    }
    sharingBusy.current = true;
    setSharing(true);
    setEmailSending(true);
    setEmailError("");
    try {
      await emailEstimateShare(estimate.id, {
        to: emailRecipient.trim(),
        pricingMode: customerPricingMode,
        includeContract,
      });
      if (activeShareContext.current !== shareContext) return;
      toast.success("Estimate email sent.");
      setEmailDraft(null);
      if (includeContract) setAgreementRefresh((value) => value + 1);
    } catch (error) {
      if (activeShareContext.current !== shareContext) return;
      setEmailError((error as Error).name === "AbortError"
        ? "Sending timed out. Check whether the email arrived before trying again."
        : (error as Error).message || "Could not send the estimate. Please try again.");
    } finally {
      sharingBusy.current = false;
      setSharing(false);
      setEmailSending(false);
    }
  };

  const copyTextToClipboard = async (text: string, field?: HTMLTextAreaElement | null) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Algunos navegadores rechazan la API aunque esté disponible.
    }

    // Compatibilidad con HTTP/IP local. Dentro del diálogo se usa el campo
    // visible para respetar su control de foco y permitir también la copia manual.
    const textarea = field ?? document.createElement("textarea");
    const previousFocus = document.activeElement;
    textarea.value = text;
    if (!field) {
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
    }
    try {
      textarea.focus({ preventScroll: true });
      textarea.select();
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      if (!field) {
        textarea.remove();
        if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
      }
    }
  };

  const createCustomerLink = async () => {
    const response = await getOrCreateEstimatePublicToken(estimate.id, customerPricingMode);
    if (!response.token) throw new Error("Could not generate customer link.");
    const url = `${window.location.origin}/public/estimates/${response.token}`;
    // El enlace sin contrato conserva la cotización habitual y no modifica ninguna aceptación.
    if (!includeContract) return url;
    const prepared = await prepareEstimateAgreement(estimate.id, customerPricingMode, true);
    if (!prepared.current) throw new Error(currentUserIsOwner
      ? "Upload a contract in My Branding before including it."
      : "The estimate owner has no contract available. Ask them to upload one in My Branding.");
    if (activeShareContext.current === shareContext) setAgreementRefresh((value) => value + 1);
    return `${url}/agreements/${prepared.current.id}`;
  };

  const handleCopyPublicLink = async () => {
    if (sharingBusy.current || !canShareCustomerReport) return;
    sharingBusy.current = true;
    setSharing(true);
    try {
      const url = await createCustomerLink();
      if (activeShareContext.current !== shareContext) return;

      if (await copyTextToClipboard(url)) {
        toast.success("Customer link copied.");
      } else {
        // La generación del PDF puede consumir la activación del primer clic.
        // Conservamos el resultado; el siguiente clic solo copia, sin generar otro acuerdo.
        setManualCopy(false);
        setReadyCopy(url);
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally { sharingBusy.current = false; setSharing(false); }
  };

  const handleCopyReadyLink = async () => {
    if (!readyCopy || sharingBusy.current || !canShareCustomerReport) return;
    sharingBusy.current = true;
    setSharing(true);
    try {
      if (await copyTextToClipboard(readyCopy, copyField.current)) {
        setReadyCopy(null);
        toast.success("Customer link copied.");
      } else {
        setManualCopy(true);
      }
    } finally { sharingBusy.current = false; setSharing(false); }
  };

  const handleSharePublicLink = async () => {
    if (sharingBusy.current || !canShareCustomerReport) return;
    sharingBusy.current = true;
    setSharing(true);
    try {
      const url = await createCustomerLink();
      if (activeShareContext.current !== shareContext) return;

      const shareData = {
        title: `Estimate #${estimate.number}`,
        text: `Please review estimate #${estimate.number}.`,
        url,
      };

      if (navigator.share) {
        if (navigator.userActivation && !navigator.userActivation.isActive) {
          setReadyShare(shareData);
          return;
        }
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
    } finally { sharingBusy.current = false; setSharing(false); }
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
      <Dialog open={emailOpen} onOpenChange={(open) => { if (!open && !sharingBusy.current) setEmailDraft(null); }}>
        <DialogContent showCloseButton={!emailSending}>
          <DialogHeader>
            <DialogTitle>Email estimate</DialogTitle>
            <DialogDescription>
              Send estimate #{estimate.number} with {customerPricingMode === "total" ? "the project total" : "detailed prices"}{includeContract ? " and the owner's contract" : " without a contract"}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEmailEstimate} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="estimate-email-recipient" className="text-sm font-medium">Customer email</label>
              <Input id="estimate-email-recipient" type="email" required maxLength={254} autoComplete="email"
                value={emailRecipient} disabled={emailSending}
                onChange={(event) => {
                  setEmailDraft({ context: shareContext, recipient: event.target.value });
                  setEmailError("");
                }} />
            </div>
            {emailError && <p role="alert" className="text-sm text-destructive">{emailError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={emailSending} onClick={() => { if (!sharingBusy.current) setEmailDraft(null); }}>Cancel</Button>
              <Button type="submit" disabled={sharing || !validEmailRecipient}>{emailSending ? "Sending…" : "Send"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={canShareCustomerReport && Boolean(readyCopy)} onOpenChange={(open) => { if (!open) setReadyCopy(null); }}>
        <DialogContent onOpenAutoFocus={(event) => {
          event.preventDefault();
          copyField.current?.focus();
          copyField.current?.select();
        }}>
          <DialogHeader>
            <DialogTitle>Customer link ready</DialogTitle>
            <DialogDescription>Your link is ready. Copy it below to share the estimate.</DialogDescription>
          </DialogHeader>
          <label htmlFor="ready-customer-link" className="text-sm font-medium">Customer link</label>
          <textarea
            ref={copyField}
            id="ready-customer-link"
            readOnly
            value={readyCopy ?? ""}
            rows={3}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full resize-none rounded-md border bg-slate-50 p-3 text-sm break-all"
          />
          {manualCopy && <p role="status" className="text-sm text-muted-foreground">Select the link above and copy it manually.</p>}
          <Button type="button" disabled={sharing} onClick={handleCopyReadyLink}>
            <Copy className="mr-2 h-4 w-4" />{sharing ? "Copying…" : "Copy link"}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={canShareCustomerReport && Boolean(readyShare)} onOpenChange={(open) => { if (!open) setReadyShare(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Estimate ready to share</DialogTitle><DialogDescription>Your customer link is ready.</DialogDescription></DialogHeader>
          <Button onClick={() => { if (readyShare && navigator.share) void navigator.share(readyShare).then(() => setReadyShare(null)).catch((error: Error) => { if (error.name !== "AbortError") toast.error(error.message); }); }}><Share2 className="mr-2 h-4 w-4" />Share estimate</Button>
        </DialogContent>
      </Dialog>
      <div className="mx-auto max-w-6xl">
        {!isCanceled && (!ownerIsDealer || reportMode !== "customer") && <MaterialRevisionAccess estimateId={estimate.id} />}
        <div className="mb-6 space-y-4 print:hidden">
          <div className="flex items-center justify-between gap-4">
            <BackLink
              href={
                returnToEdit && !isCanceled ? `/estimates/${estimate.id}/edit` : "/estimates"
              }
              label={
                returnToEdit && !isCanceled ? "Back to Edit Estimate" : "Back to Estimates"
              }
            />

            <div className="flex flex-wrap justify-end gap-2">
            <EstimateLifecycleButton estimate={estimate} actor={{ id: currentUserId, role: { name: userRole } }} />
            <Button asChild>
              <a href={pdfHref} target="_blank" rel="noopener noreferrer">
                <Printer className="mr-2 h-4 w-4" /> Print / PDF
              </a>
            </Button>
            </div>
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
                    disabled={sharing}
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
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <label className="mr-1 flex items-center gap-2 text-sm">
                    <input type="checkbox" aria-label="Include contract" checked={includeContract}
                      onChange={(event) => setIncludeContract(event.target.checked)}
                      disabled={isCanceled || sharing || !agreementStatus?.defaultContract} className="h-4 w-4" />
                    Include contract
                  </label>
                  {agreementStatus && !agreementStatus.defaultContract && (currentUserIsOwner
                    ? <a href="/profile/branding" className="mr-2 text-xs underline">Upload contract</a>
                    : <span className="mr-2 text-xs text-muted-foreground">The estimate owner has no contract uploaded.</span>)}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={sharing}
                    onClick={handleCopyPublicLink}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {sharing ? "Preparing…" : "Copy link"}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={sharing}
                    onClick={handleSharePublicLink}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  {canEmailCustomerReport && (
                    <Button type="button" variant="outline" size="sm" disabled={sharing}
                      onClick={() => {
                        if (sharingBusy.current) return;
                        setEmailError("");
                        setEmailDraft({ context: shareContext, recipient: estimate.customerEmail ?? "" });
                      }}>
                      <Mail className="mr-2 h-4 w-4" />Email
                    </Button>
                  )}
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
          {ownerIsDealer && reportMode === "customer" && <DealerAgreementPanel estimateId={estimate.id} pricingMode={customerPricingMode} refreshKey={agreementRefresh} onStatusChange={setAgreementStatus} canShare={canShareCustomerReport} />}
        </EstimateReportShell>
      </div>
    </div>
  );
}
