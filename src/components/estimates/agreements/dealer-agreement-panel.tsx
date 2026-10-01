"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getEstimateAgreement,
  ownerAgreementPdfUrl,
  type AgreementStatus,
} from "@/app/api/contracts.api";

const labels = {
  PREPARING: "Preparing agreement",
  AWAITING_SIGNATURE: "Awaiting signature",
  SIGNED: "Signed",
  REQUIRES_NEW_SIGNATURE: "Requires new signature",
};

export function DealerAgreementPanel({
  estimateId,
  pricingMode,
  refreshKey,
  onStatusChange,
  canShare = false,
}: {
  estimateId: number;
  pricingMode: "detailed" | "total";
  refreshKey: number;
  onStatusChange: (status: AgreementStatus) => void;
  canShare?: boolean;
}) {
  const [status, setStatus] = useState<AgreementStatus | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setStatus(null);
    setError("");
    const refresh = async () => {
      try {
        const next = await getEstimateAgreement(estimateId, pricingMode);
        if (!active) return;
        setStatus(next);
        onStatusChange(next);
        setError("");
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => { active = false; clearInterval(timer); };
  }, [estimateId, pricingMode, onStatusChange, refreshKey]);
  const current = status?.current;
  if (!current && !error && !status?.pendingMaterialRevisionId) return null;
  return (
    <section
      className="mt-8 space-y-3 border-t pt-5 print:hidden"
      aria-label="Customer agreement"
    >
      {status?.pendingMaterialRevisionId && (
        <p className="rounded-md border bg-slate-50 p-3 text-sm">A material revision is awaiting the customer signature. {status.estimateCanceled ? "This estimate is canceled; a new signature cannot be requested. " : canShare ? <>Select <strong>Include contract</strong> and share again. </> : "An authorized dealer or administrator can share the updated agreement. "}The original material stays unchanged until the new agreement is signed.</p>
      )}
      {current && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">
              {status?.estimateCanceled ? (current.signedAt ? "Contract · Signed before cancellation" : "Contract · Estimate canceled") : status?.nextSignatureKind === "CHANGE_ORDER"
                ? "Contract signed · Change pending approval"
                : `${current.kind === "CHANGE_ORDER" ? `Change Order #${current.changeOrderNumber}` : "Contract"} · ${labels[current.state]}`}
            </p>
            {current.signedAt && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={ownerAgreementPdfUrl(estimateId, current.id, "signed")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {current.kind === "CHANGE_ORDER"
                    ? "Download signed Change Order"
                    : "Download signed agreement"}
                </a>
              </Button>
            )}
          </div>
          {current.signedAt && (
            <p className="text-sm text-muted-foreground">
              {current.signerName} ·{" "}
              {current.signedAtLabel}
            </p>
          )}
          {!status?.estimateCanceled && current.invalidatedAt && (
            <p className="text-sm text-muted-foreground">
              {!canShare
                ? "An authorized dealer or administrator can share the updated agreement to request a new signature."
                : status?.nextSignatureKind === "CHANGE_ORDER"
                ? "Select Include contract and share again to request acceptance of the updated charges."
                : "Select Include contract and share the estimate again to request a new signature."}
            </p>
          )}
        </>
      )}
      {status?.history.some((item) => item.id !== current?.id) && (
        <details className="text-sm">
          <summary className="cursor-pointer">
            Previous signed documents
          </summary>
          <ul className="mt-2 space-y-2">
            {status.history
              .filter((item) => item.id !== current?.id)
              .map((item) => (
                <li key={item.id}>
                  <a
                    className="underline"
                    href={ownerAgreementPdfUrl(estimateId, item.id, "signed")}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.kind === "CHANGE_ORDER"
                      ? `Change Order #${item.changeOrderNumber}`
                      : `Agreement revision ${item.revision}`}{" "}
                    · {item.signerName} ·{" "}
                    {item.signedAtLabel}
                  </a>
                </li>
              ))}
          </ul>
        </details>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
