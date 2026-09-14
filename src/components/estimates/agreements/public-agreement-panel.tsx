"use client";

import { useCallback, useEffect, useState } from "react";
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
import type { PublicPaymentContext } from "@/app/api/payments.api";

export function PublicAgreementPanel({
  token,
  initialStatus,
  paymentContext,
}: {
  token: string;
  initialStatus: AgreementStatus;
  paymentContext?: PublicPaymentContext | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [name, setName] = useState("");
  const [signature, setSignature] = useState<SignatureStrokes>([]);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const agreementId = initialStatus.current?.id;
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);
  useEffect(() => {
    setName("");
    setAccepted(false);
    setSignature([]);
    setError("");
  }, [agreementId]);
  const refresh = useCallback(async () => {
    if (!agreementId) return;
    const next = await getPublicAgreement(token, agreementId);
    setStatus(next);
    if (next.current?.state !== initialStatus.current?.state) router.refresh();
  }, [token, agreementId, initialStatus.current?.state, router]);
  useEffect(() => {
    const timer = setInterval(() => {
      void refresh().catch(() => undefined);
    }, 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  const agreement = status.current;
  if (!agreement) return null;
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
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      await refresh().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }
  return (
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
        {!agreement.signedAt && (
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
          <form
            onSubmit={submit}
            className="mx-auto max-w-2xl space-y-4 border-t pt-6"
          >
            <div className="space-y-2">
              <Label htmlFor="agreement-name">Full name</Label>
              <Input
                id="agreement-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={150}
                autoComplete="name"
                required
                disabled={busy}
              />
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
          </form>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {status.paymentsEnabled && paymentContext && !agreement.invalidatedAt && (
        <PublicEstimatePaymentCard
          token={token}
          context={paymentContext}
          agreementId={agreement.id}
          signatureRequired={!agreement.signedAt}
        />
      )}
    </section>
  );
}
