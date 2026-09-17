"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getPublicAgreement,
  publicAgreementPdfUrl,
  signAgreement,
  type AgreementStatus,
  type SignatureStrokes,
} from "@/app/api/contracts.api";
import { SignaturePad } from "./signature-pad";
import { ContractPages } from "./contract-pages";
import { ChangeOrderDetails } from "./change-order-details";
import { PublicEstimatePaymentCard } from "@/components/estimates/public-estimate-payment-card";
import { getPublicPaymentContext, type PublicPaymentContext } from "@/app/api/payments.api";
import type { EstimateWithRelations } from "@/lib/types";
import { EstimateViewDealerPublic } from "../estimate-details/views/estimate-view-dealer-public";
import { usePromotionExpired } from "@/components/promotions/promotion-banner";

export function PublicAgreementPanel({
  token,
  initialStatus,
  paymentContext: initialPaymentContext,
  estimate,
}: {
  token: string;
  initialStatus: AgreementStatus;
  paymentContext?: PublicPaymentContext | null;
  estimate: EstimateWithRelations;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [paymentContext, setPaymentContext] = useState(initialPaymentContext);
  const [name, setName] = useState("");
  const [signature, setSignature] = useState<SignatureStrokes>([]);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const paymentExpired = usePromotionExpired(paymentContext ?? undefined);
  const agreementId = initialStatus.current?.id;
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);
  useEffect(() => {
    setPaymentContext(initialPaymentContext);
  }, [initialPaymentContext]);
  useEffect(() => {
    setName("");
    setAccepted(false);
    setSignature([]);
    setError("");
  }, [agreementId]);
  const refresh = useCallback(async () => {
    if (!agreementId) return;
    const [next, payments] = await Promise.all([
      getPublicAgreement(token, agreementId),
      initialStatus.paymentsEnabled ? getPublicPaymentContext(token) : Promise.resolve(null),
    ]);
    setStatus(next);
    setPaymentContext(payments);
    if (next.current?.state !== initialStatus.current?.state) router.refresh();
  }, [token, agreementId, initialStatus.current?.state, initialStatus.paymentsEnabled, router]);
  useEffect(() => {
    const timer = setInterval(() => {
      void refresh().catch(() => undefined);
    }, 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  const agreement = status.current;
  const canShowPayments = Boolean(
    agreement && !agreement.invalidatedAt &&
    status.paymentsEnabled && paymentContext,
  );
  const acceptedInAnotherView = Boolean(
    canShowPayments && !agreement?.signedAt &&
    paymentContext?.agreement?.required && paymentContext.agreement.satisfied,
  );
  const showPaymentStatus = Boolean(
    canShowPayments && paymentContext?.enabled && paymentContext.schedule &&
    paymentContext.status !== "expired" && !paymentExpired,
  );
  // La firma y el informe comparten estado para cambiar de tabla sin esperar una recarga.
  // El cronograma original se conserva al imprimir y en el documento firmado.
  const report = useMemo(() => (
    <EstimateViewDealerPublic
      estimate={estimate}
      pricingMode={estimate.publicPricingMode ?? "detailed"}
      showPaymentSchedule={!showPaymentStatus}
    />
  ), [estimate, showPaymentStatus]);
  if (!agreement) return report;
  const isChangeOrder = agreement.kind === "CHANGE_ORDER";
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!agreement || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await signAgreement(token, agreement, {
        signerName: name,
        signature,
        accepted,
      });
      setStatus((previous) => ({ ...previous, current: result.current }));
      await refresh().catch(() => undefined);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      await refresh().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
    {report}
    <section
      className="mt-8 space-y-5 border-t pt-6 print:hidden"
      aria-label="Contract and signature"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {isChangeOrder
            ? `Change Order #${agreement.changeOrderNumber}`
            : "Contract"}
        </h2>
        {!agreement.signedAt && isChangeOrder && (
          <a
            className="text-sm underline underline-offset-4"
            href={publicAgreementPdfUrl(
              token,
              agreement.id,
              isChangeOrder ? "quote" : "contract",
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download PDF
          </a>
        )}
      </div>
      {status.changeOrder && <ChangeOrderDetails change={status.changeOrder} />}
      {isChangeOrder &&
        status.history.some((item) => item.id !== agreement.id) && (
          <details className="text-sm">
            <summary className="cursor-pointer">
              Referenced signed documents
            </summary>
            <ul className="mt-2 space-y-2">
              {status.history
                .filter((item) => item.id !== agreement.id)
                .map((item) => (
                  <li key={item.id}>
                    <a
                      className="underline"
                      href={publicAgreementPdfUrl(token, item.id, "signed")}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.kind === "CHANGE_ORDER"
                        ? `Change Order #${item.changeOrderNumber}`
                        : "Signed agreement"}
                      {item.kind !== "CHANGE_ORDER" && item.signedAt && (
                        <> · {item.signedAtLabel}</>
                      )}
                    </a>
                  </li>
                ))}
            </ul>
          </details>
        )}
      {agreement.invalidatedAt && (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
        >
          This agreement has changed. Ask your dealer for the updated link
          before signing.
        </p>
      )}
      {agreement.state === "PREPARING" && (
        <p role="status" className="text-sm">
          Your agreement is being prepared. Please try again shortly.
        </p>
      )}
      {agreement.signedAt && (
        <div
          role="status"
          className={`rounded-lg border p-4 ${agreement.invalidatedAt ? "bg-slate-50" : "border-emerald-200 bg-emerald-50"}`}
        >
          <p className="font-medium">
            {agreement.invalidatedAt
              ? "Previous acceptance"
              : isChangeOrder
                ? "Change Order signed"
                : "Agreement signed"}
          </p>
          <p className="mt-1 text-sm">
            {agreement.signerName} ·{" "}
            {agreement.signedAtLabel}
          </p>
          <Button asChild className="mt-3">
            <a
              href={publicAgreementPdfUrl(token, agreement.id, "signed")}
              target="_blank"
              rel="noopener noreferrer"
            >
              {isChangeOrder
                ? "Download signed Change Order"
                : "Download signed agreement"}
            </a>
          </Button>
        </div>
      )}
      {agreement.state === "AWAITING_SIGNATURE" && (
        <>
          {!isChangeOrder && (
            <ContractPages
              url={publicAgreementPdfUrl(token, agreement.id, "contract")}
            />
          )}
          {acceptedInAnotherView ? (
            <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              A current agreement for this estimate has already been signed. No additional signature is needed for payment.
            </p>
          ) : <form
            onSubmit={submit}
            className="mx-auto max-w-2xl space-y-4 border-t pt-6"
          >
            <div className="space-y-2">
              <Label htmlFor="agreement-name">Full legal name</Label>
              <Input
                id="agreement-name"
                aria-describedby="agreement-name-help"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={150}
                autoComplete="name"
                required
                disabled={busy}
              />
              <p id="agreement-name-help" className="text-sm text-muted-foreground">
                Enter your full name as it appears on your identification.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Signature</Label>
              <SignaturePad
                value={signature}
                onChange={setSignature}
                disabled={busy}
              />
            </div>
            <label className="flex items-start gap-3 text-sm leading-relaxed">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                disabled={busy}
                required
              />
              <span>{status.consentText}</span>
            </label>
            <Button
              type="submit"
              disabled={busy || !accepted || !name.trim() || !signature.length}
            >
              {busy
                ? "Saving…"
                : isChangeOrder
                  ? "Accept and sign Change Order"
                  : "Accept and sign"}
            </Button>
          </form>}
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {canShowPayments && paymentContext && (
        <PublicEstimatePaymentCard
          token={token}
          context={paymentContext}
          agreementId={agreement.id}
        />
      )}
    </section>
    </>
  );
}
