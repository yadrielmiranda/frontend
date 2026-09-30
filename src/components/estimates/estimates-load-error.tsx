"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function EstimatesLoadError({
  onRetry,
  message = "Could not load estimates. Please try again.",
}: {
  onRetry?: () => void;
  message?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <p role="alert" className="text-sm text-destructive">{message}</p>
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(() => {
          if (onRetry) onRetry();
          else router.refresh();
        })}
      >
        {isPending ? "Retrying..." : "Try again"}
      </Button>
    </div>
  );
}
