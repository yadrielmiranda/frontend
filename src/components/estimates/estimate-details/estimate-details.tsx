"use client";

import { usePortalLanguage } from "@/contexts/PortalLanguageContext";
import { reportActionText } from "./report-action-text";
import { MaterialRevisionAccess } from "@/components/estimates/material-revisions/material-revision-access";

import { prepareEstimateAgreement, type AgreementStatus } from '@/app/api/contracts.api';
import { DealerAgreementPanel } from '../agreements/dealer-agreement-panel';
import { EstimateLifecycleButton } from '../estimate-lifecycle-actions';
import { EstimateInternalNote } from '../estimate-internal-note';
import { EstimateProductApprovals } from '../estimate-product-approvals';

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { DealerMode, EstimateWithRelations } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Printer, Copy, Share2, Send, Mail, MessageSquare } from "lucide-react";
import { BackLink } from "@/components/navigation/back-link";

import { EstimateReportShell } from "./parts/estimate-report-shell";
import { EstimateViewClient } from "./views/estimate-view-client";
import { EstimateViewDealerInternal } from "./views/estimate-view-dealer-internal";
import { EstimateViewAdmin } from "./views/estimate-view-admin";
import { EstimateViewDealerPublic } from "./views/estimate-view-dealer-public";
import { isAdminRole, isDealerRole, isOperatorRole } from "@/lib/rbac";
import { toast } from "sonner";
import { sendEstimateShare, getOrCreateEstimatePublicToken, type EstimateSendChannel, type EstimateSendResult } from "@/app/api/estimates.api";
import { MAX_ESTIMATE_EMAIL_INPUT_LENGTH, MAX_ESTIMATE_EMAIL_RECIPIENTS, parseEstimateEmailRecipients } from "./estimate-email-recipients";
import { normalizePhoneToE164, isSmsPhoneSupported } from "@/lib/validators-phone";
import { estimateSendFeedback, reportSendError } from "./estimate-send-result";
import { isApiError } from "@/app/api/_base";

// =============================
// ESTIMATE DETAILS
// =============================

type ReportMode = "admin" | "dealer" | "customer";
type CustomerPricingMode = "detailed" | "total";
type SendDraft = { context: string; recipient: string; cc: string; phone: string; channel: EstimateSendChannel };
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

const REPORT_LABELS = {
  admin: "Admin Report",
  dealer: "Dealer Report",
  customer: "Customer Report",
} as const;

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
  const { locale } = usePortalLanguage();
  const t = reportActionText[locale];
  const [readyShare, setReadyShare] = useState<ShareData | null>(null);
  const [readyCopy, setReadyCopy] = useState<string | null>(null);
  const [manualCopy, setManualCopy] = useState(false);
  const copyField = useRef<HTMLTextAreaElement>(null);
  const [sharing, setSharing] = useState(false);
  const sharingBusy = useRef(false);
  const [sendDraft, setSendDraft] = useState<SendDraft | null>(null);
  const [sendError, setSendError] = useState("");
  const [sendOutcome, setSendOutcome] = useState<EstimateSendResult | null>(null);
  const [sending, setSending] = useState(false);
  const [agreementRefresh, setAgreementRefresh] = useState(0);
  const [includeContract, setIncludeContract] = useState(false);
  const [agreementStatus, setAgreementStatus] = useState<AgreementStatus | null>(null);
  const isCanceled = estimate.status?.name === "Canceled";
  useEffect(() => { setIncludeContract(false); setAgreementStatus(null); }, [estimate.id, isCanceled]);
  useEffect(() => {
    if (agreementStatus && !agreementStatus.defaultContract && !sendDraft && !sharingBusy.current) setIncludeContract(false);
  }, [agreementStatus, sendDraft, sharing]);
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
            label: t("Customer Detailed Prices"),
            reportMode: "customer",
            customerPricingMode: "detailed",
          },
          {
            key: "customer-total",
            label: t("Customer Project Total"),
            reportMode: "customer",
            customerPricingMode: "total",
          },
        );
        continue;
      }

      options.push({
        key: mode,
        label: t(REPORT_LABELS[mode]),
        reportMode: mode,
      });
    }

    return options;
  }, [allowedReportModes, ownerIsDealer, t]);

  const activeReportOptionKey =
    reportMode === "customer" && ownerIsDealer
      ? customerPricingMode === "total"
        ? "customer-total"
        : "customer-detailed"
      : reportMode;

  const canShareCustomerReport =
    !isCanceled && ownerIsDealer && reportMode === "customer" &&
    (isAdminRole(userRole) || (currentUserIsDealer && (currentUserIsOwner || estimate.dealerNetwork?.canAssist === true)));
  const canSendCustomerReport = canShareCustomerReport &&
    (isAdminRole(userRole) || currentUserDealerMode === "INTERNAL");
  const shareContext = JSON.stringify([
    estimate.id, estimate.customerEmail, estimate.customerPhone, estimate.idUser, currentUserId,
    userRole, currentUserDealerMode, canShareCustomerReport, reportMode,
    customerPricingMode, includeContract,
  ]);
  const activeShareContext = useRef(shareContext);
  activeShareContext.current = shareContext;
  const sendOpen = canSendCustomerReport && sendDraft?.context === shareContext;
  const emailRecipient = sendOpen ? sendDraft.recipient : "";
  const emailCc = sendOpen ? sendDraft.cc : "";
  const smsPhone = sendOpen ? sendDraft.phone : "";
  const sendChannel = sendOpen ? sendDraft.channel : "email";
  const sendEmail = sendChannel !== "sms";
  const sendSms = sendChannel !== "email";
  const emailRecipients = parseEstimateEmailRecipients(emailRecipient, emailCc, locale);
  const validEmailRecipient = !emailRecipients.error;
  const emailValidationError = emailRecipient || emailCc ? emailRecipients.error : null;
  const normalizedSmsPhone = normalizePhoneToE164(smsPhone);
  const validSmsPhone = isSmsPhoneSupported(smsPhone);
  const validRecipients = (!sendEmail || validEmailRecipient) && (!sendSms || validSmsPhone);
  const feedback = sendOutcome ? estimateSendFeedback(sendOutcome, locale) : null;
  const blockedEmail = !!sendOutcome?.email && !feedback?.retryEmail;
  const blockedSms = !!sendOutcome?.sms && !feedback?.retrySms;
  const canRetrySelection = !(sendEmail && blockedEmail) && !(sendSms && blockedSms);

  useEffect(() => {
    setSendDraft(null);
    setSendError("");
    setSendOutcome(null);
    setReadyCopy(null);
    setReadyShare(null);
  }, [shareContext]);
  useEffect(() => () => { activeShareContext.current = ""; }, []);

  const handleSendEstimate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sharingBusy.current || !sendOpen || activeShareContext.current !== shareContext || !canRetrySelection) return;
    if (!validRecipients) {
      setSendError(sendEmail && !validEmailRecipient ? emailRecipients.error ?? t("Enter valid recipient email addresses.")
        : t("Enter a valid SMS phone number with country code +1."));
      return;
    }
    sharingBusy.current = true;
    setSharing(true);
    setSending(true);
    setSendError("");
    try {
      const result = await sendEstimateShare(estimate.id, {
        channel: sendChannel,
        ...(sendEmail ? { to: emailRecipients.to, ...(emailRecipients.cc.length ? { cc: emailRecipients.cc.join(", ") } : {}) } : {}),
        ...(sendSms ? { phone: normalizedSmsPhone! } : {}),
        pricingMode: customerPricingMode,
        includeContract,
      });
      if (activeShareContext.current !== shareContext) return;
      if (includeContract) setAgreementRefresh((value) => value + 1);
      if (!result.sent) {
        const combined = { ...sendOutcome, ...result };
        setSendOutcome(combined);
        const next = estimateSendFeedback(combined, locale);
        setSendDraft(previous => {
          if (!previous) return previous;
          const rejected = result.email?.status === "partial" && !result.email.unconfirmed?.length ? result.email.rejected : undefined;
          return { ...previous, channel: next.retryChannel ?? previous.channel,
            ...(rejected?.length ? { recipient: rejected[0], cc: rejected.slice(1).join(", ") } : {}) };
        });
        return;
      }
      toast.success(sendChannel === "both" ? t("Estimate sent by email and SMS.") : sendChannel === "sms" ? t("Estimate SMS sent.") : t("Estimate email sent."));
      setSendDraft(null);
      setSendOutcome(null);
    } catch (error) {
      if (activeShareContext.current !== shareContext) return;
      const confirmedNotSent = isApiError(error) && typeof error.data === "object" && error.data !== null &&
        "code" in error.data && error.data.code === "ESTIMATE_SHARE_NOT_SENT";
      const deliveryUnconfirmed = !confirmedNotSent && (!isApiError(error) || error.status < 400 || error.status >= 500 || error.status === 408);
      if (deliveryUnconfirmed) {
        setSendOutcome({
          ...sendOutcome,
          sent: false,
          ...(sendEmail ? { email: { status: "unknown" as const } } : {}),
          ...(sendSms ? { sms: { status: "unknown" as const } } : {}),
        });
      }
      setSendError(deliveryUnconfirmed
        ? locale === "es" ? "No pudimos confirmar el envío. Comprueba si llegaron los mensajes antes de volver a intentarlo." : `${(error as Error).name === "AbortError" ? "Sending timed out." : "Sending was not confirmed."} Check whether the selected messages arrived before trying again.`
        : reportSendError((error as Error).message, locale) || t("Could not send the estimate. Please try again."));
    } finally {
      sharingBusy.current = false;
      setSharing(false);
      setSending(false);
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
    if (!response.token) throw new Error(t("Could not generate customer link."));
    const url = `${window.location.origin}/public/estimates/${response.token}`;
    // El enlace sin contrato conserva la cotización habitual y no modifica ninguna aceptación.
    if (!includeContract) return url;
    const prepared = await prepareEstimateAgreement(estimate.id, customerPricingMode, true);
    if (!prepared.current) throw new Error(currentUserIsOwner
      ? t("Upload a contract in My Branding before including it.")
      : t("The estimate owner has no contract available. Ask them to upload one in My Branding."));
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
        toast.success(t("Customer link copied."));
      } else {
        // La generación del PDF puede consumir la activación del primer clic.
        // Conservamos el resultado; el siguiente clic solo copia, sin generar otro acuerdo.
        setManualCopy(false);
        setReadyCopy(url);
      }
    } catch (error) {
      toast.error(reportSendError((error as Error).message, locale));
    } finally { sharingBusy.current = false; setSharing(false); }
  };

  const handleCopyReadyLink = async () => {
    if (!readyCopy || sharingBusy.current || !canShareCustomerReport) return;
    sharingBusy.current = true;
    setSharing(true);
    try {
      if (await copyTextToClipboard(readyCopy, copyField.current)) {
        setReadyCopy(null);
        toast.success(t("Customer link copied."));
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

      toast.error(reportSendError((error as Error).message, locale));
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
          locale={locale}
          pricingMode={customerPricingMode}
        />
      ) : (
        <EstimateViewClient estimate={estimate} locale={locale} />
      );
    }

    if (reportMode === "dealer") {
      return <EstimateViewDealerInternal estimate={estimate} locale={locale} />;
    }

    return <EstimateViewAdmin locale={locale} estimate={estimate} isAdmin={isAdminRole(userRole)} />;
  }, [customerPricingMode, estimate, ownerIsDealer, reportMode, userRole, locale]);

  const pdfView = useMemo<PdfView>(() => {
    if (reportMode === "admin") return "admin";
    if (reportMode === "dealer") return "dealer_internal";
    if (!ownerIsDealer) return "client";
    return customerPricingMode === "total"
      ? "dealer_public_total"
      : "dealer_public";
  }, [customerPricingMode, ownerIsDealer, reportMode]);

  const pdfHref = `/api/estimates/${estimate.id}/pdf?view=${pdfView}&lang=${locale}`;

  return (
    <div lang={locale} className="bg-gray-50 min-h-screen p-4 sm:p-8">
      <Dialog open={sendOpen} onOpenChange={(open) => { if (!open && !sharingBusy.current) setSendDraft(null); }}>
        <DialogContent showCloseButton={!sending}>
          <DialogHeader>
            <DialogTitle>{t("Send estimate")}</DialogTitle>
            <DialogDescription>
              {locale === "es"
                ? `Envía la cotización #${estimate.number} con ${customerPricingMode === "total" ? "el total del proyecto" : "los precios detallados"}${includeContract ? " y el contrato del propietario" : ", sin contrato"}.`
                : `Send estimate #${estimate.number} with ${customerPricingMode === "total" ? "the project total" : "detailed prices"}${includeContract ? " and the owner's contract" : " without a contract"}.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendEstimate} className="space-y-4">
            <fieldset disabled={sending} className="space-y-2">
              <legend className="mb-2 text-sm font-medium">{t("Send by")}</legend>
              <div className="grid grid-cols-3 gap-2">
                {([['email', t("Email"), Mail], ['sms', 'SMS', MessageSquare], ['both', t("Both"), Send]] as const).map(([channel, label, Icon]) => (
                  <label key={channel} className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border px-2 py-3 text-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 ${sendChannel === channel ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'} ${((channel !== 'sms' && blockedEmail) || (channel !== 'email' && blockedSms)) ? 'cursor-not-allowed opacity-50' : ''}`}>
                    <input type="radio" name="estimate-send-channel" value={channel} checked={sendChannel === channel}
                      disabled={(channel !== 'sms' && blockedEmail) || (channel !== 'email' && blockedSms)}
                      className="sr-only"
                      onChange={() => { setSendDraft(previous => previous && { ...previous, channel }); setSendError(''); }} />
                    <Icon className="h-4 w-4" aria-hidden="true" />{label}
                  </label>
                ))}
              </div>
            </fieldset>
            {sendEmail && <>
              <div className="space-y-2">
                <label htmlFor="estimate-email-recipient" className="text-sm font-medium">{t("To")}</label>
                <Input id="estimate-email-recipient" type="email" required maxLength={254} autoComplete="email"
                  aria-describedby="estimate-email-recipient-help"
                  value={emailRecipient} disabled={sending || blockedEmail}
                  onChange={(event) => {
                    setSendDraft(previous => previous && { ...previous, recipient: event.target.value });
                    setSendError("");
                  }} />
                <p id="estimate-email-recipient-help" className="text-sm text-muted-foreground">{t("Main email recipient.")}</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="estimate-email-cc" className="text-sm font-medium">CC <span className="font-normal text-muted-foreground">{t("(optional)")}</span></label>
                <Input id="estimate-email-cc" type="email" multiple maxLength={MAX_ESTIMATE_EMAIL_INPUT_LENGTH} autoComplete="off"
                  placeholder="email@example.com, another@example.com" aria-describedby="estimate-email-cc-help"
                  value={emailCc} disabled={sending || blockedEmail}
                  onChange={(event) => {
                    setSendDraft(previous => previous && { ...previous, cc: event.target.value });
                    setSendError("");
                  }} />
                <p id="estimate-email-cc-help" className="text-sm text-muted-foreground">{locale === "es" ? `Separa las direcciones con comas. Máximo ${MAX_ESTIMATE_EMAIL_RECIPIENTS} destinatarios en total.` : `Separate multiple email addresses with commas. Up to ${MAX_ESTIMATE_EMAIL_RECIPIENTS} recipients total.`}</p>
              </div>
            </>}
            {sendSms && <div className="space-y-2">
              <label htmlFor="estimate-sms-phone" className="text-sm font-medium">{t("Mobile number")}</label>
              <Input id="estimate-sms-phone" type="tel" required maxLength={80} autoComplete="tel"
                placeholder="+1 (786) 555-0123" aria-describedby="estimate-sms-phone-help"
                value={smsPhone} disabled={sending || blockedSms}
                onChange={(event) => { setSendDraft(previous => previous && { ...previous, phone: event.target.value }); setSendError(''); }} />
              <p id="estimate-sms-phone-help" className="text-sm text-muted-foreground">{t("Send the customer link to this number. SMS supports numbers with country code +1.")}</p>
            </div>}
            {feedback && <div role="status" className="space-y-1 rounded-md border bg-slate-50 p-3 text-sm">
              {feedback.messages.map((message, index) => <p key={index}>{message}</p>)}
            </div>}
            {(sendError || (sendEmail && emailValidationError) || (sendSms && smsPhone && !validSmsPhone)) && <p role="alert" className="text-sm text-destructive">
              {sendError || (sendEmail && emailValidationError) || t("Enter a valid SMS phone number with country code +1.")}
            </p>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={sending} onClick={() => { if (!sharingBusy.current) setSendDraft(null); }}>{sendOutcome ? t("Close") : t("Cancel")}</Button>
              <Button type="submit" disabled={sharing || !validRecipients || !canRetrySelection}>{sending ? t("Sending…") : t("Send")}</Button>
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
            <DialogTitle>{t("Customer link ready")}</DialogTitle>
            <DialogDescription>{t("Your link is ready. Copy it below to share the estimate.")}</DialogDescription>
          </DialogHeader>
          <label htmlFor="ready-customer-link" className="text-sm font-medium">{t("Customer link")}</label>
          <textarea
            ref={copyField}
            id="ready-customer-link"
            readOnly
            value={readyCopy ?? ""}
            rows={3}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full resize-none rounded-md border bg-slate-50 p-3 text-sm break-all"
          />
          {manualCopy && <p role="status" className="text-sm text-muted-foreground">{t("Select the link above and copy it manually.")}</p>}
          <Button type="button" disabled={sharing} onClick={handleCopyReadyLink}>
            <Copy className="mr-2 h-4 w-4" />{sharing ? t("Copying…") : t("Copy link")}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={canShareCustomerReport && Boolean(readyShare)} onOpenChange={(open) => { if (!open) setReadyShare(null); }}>
        <DialogContent><DialogHeader><DialogTitle>{t("Estimate ready to share")}</DialogTitle><DialogDescription>{t("Your customer link is ready.")}</DialogDescription></DialogHeader>
          <Button onClick={() => { if (readyShare && navigator.share) void navigator.share(readyShare).then(() => setReadyShare(null)).catch((error: Error) => { if (error.name !== "AbortError") toast.error(error.message); }); }}><Share2 className="mr-2 h-4 w-4" />{t("Share estimate")}</Button>
        </DialogContent>
      </Dialog>
      <div className="mx-auto max-w-6xl">
        {!isCanceled && (!ownerIsDealer || reportMode !== "customer") && <MaterialRevisionAccess estimateId={estimate.id} locale={locale} />}
        <div className="mb-6 space-y-4 print:hidden">
          <div className="flex items-center justify-between gap-4">
            <BackLink
              href={
                returnToEdit && !isCanceled ? `/estimates/${estimate.id}/edit` : "/estimates"
              }
              label={
                returnToEdit && !isCanceled ? t("Back to Edit Estimate") : t("Back to Estimates")
              }
            />

            <div className="flex flex-wrap justify-end gap-2">
            <EstimateLifecycleButton locale={locale} estimate={estimate} actor={{ id: currentUserId, role: { name: userRole } }} />
            <Button asChild>
              <a href={pdfHref} target="_blank" rel="noopener noreferrer">
                <Printer className="mr-2 h-4 w-4" /> {t("Print / PDF")}
              </a>
            </Button>
            </div>
          </div>

          {reportOptions.length > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div
                className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
                role="group"
                aria-label={t("Select report")}
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
                    <input type="checkbox" aria-label={t("Include contract")} checked={includeContract}
                      onChange={(event) => setIncludeContract(event.target.checked)}
                      disabled={isCanceled || sharing || !agreementStatus?.defaultContract} className="h-4 w-4" />
                    {t("Include contract")}
                  </label>
                  {agreementStatus && !agreementStatus.defaultContract && (currentUserIsOwner
                    ? <a href="/profile/branding" className="mr-2 text-xs underline">{t("Upload contract")}</a>
                    : <span className="mr-2 text-xs text-muted-foreground">{t("The estimate owner has no contract uploaded.")}</span>)}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={sharing}
                    onClick={handleCopyPublicLink}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {sharing ? t("Preparing…") : t("Copy link")}
                  </Button>

                  <Button
                    type="button"
                    variant={canSendCustomerReport ? "outline" : "default"}
                    size="sm"
                    disabled={sharing}
                    onClick={handleSharePublicLink}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    {t("Share")}
                  </Button>
                  {canSendCustomerReport && (
                    <Button type="button" variant="default" size="sm" disabled={sharing}
                      onClick={() => {
                        if (sharingBusy.current) return;
                        setSendError("");
                        setSendOutcome(null);
                        setSendDraft({ context: shareContext, recipient: estimate.customerEmail ?? "", cc: "", phone: estimate.customerPhone ?? "", channel: "email" });
                      }}>
                      <Send className="mr-2 h-4 w-4" />{t("Send")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-6 print:hidden">
          <EstimateProductApprovals pieces={estimate.pieces} locale={locale} />
        </div>

        {reportMode !== "customer" && (
          <div className="mb-6 print:hidden">
            <EstimateInternalNote locale={locale} estimateId={estimate.id} userRole={userRole} />
          </div>
        )}

        <EstimateReportShell
          estimate={estimate}
          locale={locale}
          showExternalDealerPresentation
          reportLabel={t(REPORT_LABELS[reportMode])}
          internal={reportMode !== "customer"}
        >
          {viewContent}
          {ownerIsDealer && reportMode === "customer" && <DealerAgreementPanel locale={locale} estimateId={estimate.id} pricingMode={customerPricingMode} refreshKey={agreementRefresh} onStatusChange={setAgreementStatus} canShare={canShareCustomerReport} />}
        </EstimateReportShell>
      </div>
    </div>
  );
}
