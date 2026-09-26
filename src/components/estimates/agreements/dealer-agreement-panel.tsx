"use client";

import { useCallback, useEffect, useState } from "react";
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
}: {
  estimateId: number;
  pricingMode: "detailed" | "total";
  refreshKey: number;
  onStatusChange: (status: AgreementStatus) => void;
}) {
  const [status, setStatus] = useState<AgreementStatus | null>(null);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const next = await getEstimateAgreement(estimateId, pricingMode);
      setStatus(next);
      onStatusChange(next);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [estimateId, pricingMode, onStatusChange]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => clearInterval(timer);
  }, [refresh, refreshKey]);
  const current = status?.current;
  if (!current && !error && !status?.pendingMaterialRevisionId) return null;
  return (
    <section
      className="mt-8 space-y-3 border-t pt-5 print:hidden"
      aria-label="Customer agreement"
    >
      {status?.pendingMaterialRevisionId && (
        <p className="rounded-md border bg-slate-50 p-3 text-sm">A material revision is awaiting the customer signature. Select <strong>Include contract</strong> and share again. The original material stays unchanged until the new agreement is signed.</p>
      )}
      {current && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">
              {status?.nextSignatureKind === "CHANGE_ORDER"
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
          {current.invalidatedAt && (
            <p className="text-sm text-muted-foreground">
              {status?.nextSignatureKind === "CHANGE_ORDER"
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
