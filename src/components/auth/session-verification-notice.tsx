"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SessionVerificationNotice({ onRetry }: { onRetry: () => Promise<unknown> }) {
  const [isRetrying, setIsRetrying] = useState(false);

  async function retry() {
    setIsRetrying(true);
    try {
      await onRetry();
    } catch {
      // AuthProvider keeps this notice visible until verification succeeds.
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-b bg-amber-50 px-4 py-3">
      <p role="alert" className="text-sm text-slate-700">
        Could not verify your session. Please try again.
      </p>
      <Button type="button" variant="outline" disabled={isRetrying} onClick={() => void retry()}>
        {isRetrying ? "Retrying..." : "Try again"}
      </Button>
    </div>
  );
}
