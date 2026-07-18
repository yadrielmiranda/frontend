"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  cancelCheckoutSession,
  createCheckoutSession,
} from "@/app/api/payments.api";

type CurrentAction = "idle" | "continuing" | "canceling";

export default function CheckoutCancelContent() {
  const router = useRouter();
  const params = useSearchParams();

  const [currentAction, setCurrentAction] = useState<CurrentAction>("idle");

  const estimateId = useMemo(() => {
    const raw = params.get("estimateId");
    const value = raw ? Number(raw) : NaN;

    return Number.isInteger(value) && value > 0 ? value : null;
  }, [params]);

  const handleContinuePayment = async () => {
    if (!estimateId) return;

    setCurrentAction("continuing");

    try {
      // Si la sesión sigue abierta, el backend devuelve
      // la misma URL de Stripe.
      const { url } = await createCheckoutSession(estimateId);

      window.location.href = url;
    } catch (error) {
      toast.error((error as Error).message);
      setCurrentAction("idle");
    }
  };

  const handleCancelPayment = async () => {
    if (!estimateId) return;

    setCurrentAction("canceling");

    try {
      const result = await cancelCheckoutSession(estimateId);

      // Protección por si el pago fue completado
      // mientras el usuario estaba en esta página.
      if (result.status === "paid") {
        toast.success("Payment confirmed. Order created.");

        if (result.orderId) {
          router.replace(`/orders/${result.orderId}`);
        } else {
          router.replace(`/estimates/${estimateId}?paid=1`);
        }

        return;
      }

      toast.success("Payment canceled. The estimate can now be edited.");

      router.replace(`/estimates/${estimateId}/edit`);
    } catch (error) {
      toast.error((error as Error).message);
      setCurrentAction("idle");
    }
  };

  if (!estimateId) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-xl font-semibold">Unable to Continue</h1>

        <p className="text-sm text-muted-foreground">
          The estimate identifier is missing.
        </p>

        <Button onClick={() => router.push("/estimates")}>
          Back to Estimates
        </Button>
      </div>
    );
  }

  const isProcessing = currentAction !== "idle";

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Leave Checkout?</h1>

      <p className="text-sm text-muted-foreground">
        Would you like to continue with the payment or cancel it and edit the
        estimate?
      </p>

      <div className="flex flex-wrap gap-2">
        <Button disabled={isProcessing} onClick={handleContinuePayment}>
          {currentAction === "continuing"
            ? "Returning to Checkout..."
            : "Continue Payment"}
        </Button>

        <Button
          variant="destructive"
          disabled={isProcessing}
          onClick={handleCancelPayment}
        >
          {currentAction === "canceling"
            ? "Canceling Payment..."
            : "Cancel Payment"}
        </Button>
      </div>
    </div>
  );
}
