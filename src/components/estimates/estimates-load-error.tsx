"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const copy = {
  en: { message: "Could not load estimates. Please try again.", retry: "Try again", retrying: "Retrying..." },
  es: { message: "No se pudieron cargar las cotizaciones. Inténtalo de nuevo.", retry: "Reintentar", retrying: "Reintentando..." },
};

export function EstimatesLoadError({
  onRetry,
  message,
  locale = "en",
}: {
  onRetry?: () => void;
  message?: string;
  locale?: "en" | "es";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <p role="alert" className="text-sm text-destructive">{message ?? copy[locale].message}</p>
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(() => {
          if (onRetry) onRetry();
          else router.refresh();
        })}
      >
        {isPending ? copy[locale].retrying : copy[locale].retry}
      </Button>
    </div>
  );
}
