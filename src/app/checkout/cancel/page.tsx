// src/app/checkout/cancel/page.tsx
"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function CheckoutCancelPage() {
  const router = useRouter();
  const params = useSearchParams();

  const estimateId = useMemo(() => {
    const raw = params.get("estimateId");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [params]);

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-xl font-semibold">Payment Canceled</h1>
      <p className="text-sm text-muted-foreground">
        You canceled the payment. No charges were made.
      </p>

      <div className="flex gap-2">
        {estimateId ? (
          <Button onClick={() => router.push(`/estimates/${estimateId}`)}>
            Back to Estimate
          </Button>
        ) : (
          <Button onClick={() => router.push("/estimates")}>
            Back to Estimates
          </Button>
        )}

        {estimateId ? (
          <Button
            variant="outline"
            onClick={() => router.push(`/estimates/${estimateId}`)}
          >
            Try Again
          </Button>
        ) : null}
      </div>
    </div>
  );
}
