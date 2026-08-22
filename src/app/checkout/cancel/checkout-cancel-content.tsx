"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  cancelCheckoutSession,
  createCheckoutSession,
} from "@/app/api/payments.api";
import { getEstimateInstallation } from "@/app/api/installations.api";
import type { PaymentType } from "@/lib/types";

type CurrentAction = "idle" | "continuing" | "canceling";

export default function CheckoutCancelContent() {
  const router = useRouter();
  const params = useSearchParams();

  const [currentAction, setCurrentAction] = useState<CurrentAction>("idle");
  const [depositTermsAccepted, setDepositTermsAccepted] = useState(false);

  const estimateId = useMemo(() => {
    const raw = params.get("estimateId");
    const value = raw ? Number(raw) : NaN;

    return Number.isInteger(value) && value > 0 ? value : null;
  }, [params]);

  const paymentType = useMemo<PaymentType>(() => {
    const value = params.get("type");
    return value === "INSTALLATION_DEPOSIT" ||
      value === "PERMIT" ||
      value === "INSTALLATION" ||
      value === "DELIVERY" ||
      value === "EXTRA"
      ? value
      : "MATERIAL";
  }, [params]);

  const sequence = useMemo(() => {
    const value = Number(params.get("sequence"));
    return Number.isInteger(value) && value > 0 ? value : 1;
  }, [params]);

  const handleContinuePayment = async () => {
    if (!estimateId) return;
    if (
      paymentType === "INSTALLATION_DEPOSIT" &&
      !depositTermsAccepted
    ) {
      toast.error("Accept the non-refundable deposit terms first.");
      return;
    }

    setCurrentAction("continuing");

    try {
      // Si la sesión sigue abierta, el backend devuelve
      // la misma URL de Stripe.
      const { url } = await createCheckoutSession(
        estimateId,
        paymentType,
        sequence,
        paymentType === "INSTALLATION_DEPOSIT"
          ? depositTermsAccepted
          : undefined,
      );

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
      const result = await cancelCheckoutSession(
        estimateId,
        paymentType,
        sequence,
      );

      // Protección por si el pago fue completado
      // mientras el usuario estaba en esta página.
      if (result.status === "paid") {
        toast.success("Payment confirmed.");

        if (
          (paymentType === "MATERIAL" || paymentType === "DELIVERY") &&
          result.orderId
        ) {
          router.replace(`/orders/${result.orderId}`);
        } else if (
          paymentType === "PERMIT" ||
          paymentType === "INSTALLATION_DEPOSIT"
        ) {
          router.replace(`/estimates/${estimateId}/edit`);
        } else {
          const installation = await getEstimateInstallation(estimateId);
          router.replace(
            installation?.estimate.order?.id
              ? `/orders/${installation.estimate.order.id}`
              : `/estimates/${estimateId}?paid=1`,
          );
        }

        return;
      }

      toast.success("Payment canceled.");
      if (paymentType === "DELIVERY" && result.orderId) {
        router.replace(`/orders/${result.orderId}`);
      } else if (
        paymentType === "MATERIAL" ||
        paymentType === "PERMIT" ||
        paymentType === "INSTALLATION_DEPOSIT"
      ) {
        router.replace(`/estimates/${estimateId}/edit`);
      } else {
        const installation = await getEstimateInstallation(estimateId);
        router.replace(
          installation?.estimate.order?.id
            ? `/orders/${installation.estimate.order.id}`
            : `/estimates/${estimateId}`,
        );
      }
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
        Would you like to continue with the payment or cancel this checkout?
      </p>

      {paymentType === "INSTALLATION_DEPOSIT" && (
        <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            If completed, this deposit is non-refundable and will be credited
            in full toward the installation balance.
          </p>
          <label className="flex items-start gap-3">
            <Checkbox
              checked={depositTermsAccepted}
              onCheckedChange={(checked) =>
                setDepositTermsAccepted(Boolean(checked))
              }
            />
            <span>I understand and accept these deposit terms.</span>
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={
            isProcessing ||
            (paymentType === "INSTALLATION_DEPOSIT" &&
              !depositTermsAccepted)
          }
          onClick={handleContinuePayment}
        >
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
