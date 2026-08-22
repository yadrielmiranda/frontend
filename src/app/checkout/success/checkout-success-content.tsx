"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getEstimate } from "@/app/api/estimates.api";
import { getEstimateInstallation } from "@/app/api/installations.api";
import { getOrder } from "@/app/api/orders.api";
import type { PaymentType } from "@/lib/types";

type Status = "checking" | "done" | "failed";

export default function CheckoutSuccessContent() {
  const router = useRouter();
  const params = useSearchParams();

  const estimateId = useMemo(() => {
    const raw = params.get("estimateId");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [params]);

  const [status, setStatus] = useState<Status>("checking");
  const [attempt, setAttempt] = useState(0);
  const [orderId, setOrderId] = useState<number | null>(null);

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

  //evita doble toast / doble redirect
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!estimateId) {
      setStatus("failed");
      return;
    }

    let alive = true;

    // esperamos a que el webhook cree Order + cambie status
    const tick = async () => {
      try {
        const est = await getEstimate(estimateId);

        if (paymentType === "DELIVERY") {
          const oid = est.order?.id != null ? Number(est.order.id) : null;
          if (oid && Number.isFinite(oid)) {
            const order = await getOrder(oid);
            const delivery = order.deliveries?.find(
              (item) => item.sequence === sequence,
            );
            if (
              delivery?.payment?.status === "PAID" ||
              (delivery && delivery.status !== "PAYMENT_DUE")
            ) {
              if (redirectedRef.current) return;
              redirectedRef.current = true;
              setStatus("done");
              setOrderId(oid);
              toast.success("Delivery payment confirmed.");
              router.replace(`/orders/${oid}`);
              return;
            }
          }
          setAttempt((value) => value + 1);
          return;
        }

        if (paymentType !== "MATERIAL") {
          const installation = await getEstimateInstallation(estimateId);
          const paid = installation?.payments.some(
            (payment) =>
              payment.type === paymentType &&
              payment.sequence === sequence &&
              payment.status === "PAID",
          );
          if (paid && installation) {
            if (redirectedRef.current) return;
            redirectedRef.current = true;
            setStatus("done");
            toast.success(
              paymentType === "PERMIT"
                ? "Permit Fee confirmed."
                : paymentType === "INSTALLATION_DEPOSIT"
                  ? "Non-refundable installation deposit confirmed and credited."
                : paymentType === "INSTALLATION"
                  ? "Installation payment confirmed."
                  : "Extra charge payment confirmed.",
            );
            if (
              paymentType === "PERMIT" ||
              paymentType === "INSTALLATION_DEPOSIT"
            ) {
              router.replace(`/estimates/${estimateId}/edit`);
            } else if (installation.estimate.order?.id) {
              router.replace(`/orders/${installation.estimate.order.id}`);
            } else {
              router.replace(`/estimates/${estimateId}`);
            }
            return;
          }
          setAttempt((value) => value + 1);
          return;
        }

        const statusName = (est.status?.name ?? "").toLowerCase().trim();
        const isOrdered = statusName === "ordered" || !!est.order;

        // intentamos capturar el orderId si existe
        const oid = est.order?.id != null ? Number(est.order.id) : null;

        if (!alive) return;

        if (isOrdered) {
          // si ya redirigimos, no repetir
          if (redirectedRef.current) return;
          redirectedRef.current = true;

          setStatus("done");

          if (oid && Number.isFinite(oid)) {
            setOrderId(oid);
          }

          toast.success("Payment confirmed. Order created.");

          // principal: si ya existe order, redirigimos a /orders/:id
          if (oid && Number.isFinite(oid)) {
            router.replace(`/orders/${oid}`);
          } else {
            // fallback seguro si por alguna razon el include order no vino
            router.replace(`/estimates/${estimateId}?paid=1`);
          }

          return;
        }

        // todavia no, seguimos intentando
        setAttempt((a) => a + 1);
      } catch {
        if (!alive) return;
        setAttempt((a) => a + 1);
      }
    };

    // intento inmediato
    tick();

    const interval = setInterval(tick, 2000);

    // limite (ej: 30 intentos ~ 60s)
    const timeout = setTimeout(() => {
      if (!alive) return;

      setStatus("failed");

      toast.error(
        "Payment received, but order is still processing. Refresh in a moment.",
      );
    }, 60000);

    return () => {
      alive = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [estimateId, paymentType, router, sequence]);

  if (!estimateId) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-xl font-semibold">Checkout Success</h1>

        <p className="text-sm text-muted-foreground">
          Missing estimateId in URL.
        </p>

        <Button onClick={() => router.push("/estimates")}>
          Back to Estimates
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-xl font-semibold">Payment Successful</h1>

      {status === "checking" && (
        <>
          <p className="text-sm text-muted-foreground">
            We’re confirming your payment
            {paymentType === "MATERIAL" ? " and creating the order" : ""}…
          </p>

          <p className="text-xs text-muted-foreground">Attempts: {attempt}</p>

          <Button
            variant="outline"
            onClick={() => router.replace(`/estimates/${estimateId}/edit`)}
          >
            View Estimate
          </Button>
        </>
      )}

      {status === "done" && (
        <>
          <p className="text-sm text-muted-foreground">
            {paymentType === "MATERIAL"
              ? "Order created successfully."
              : paymentType === "INSTALLATION_DEPOSIT"
                ? "Deposit confirmed. It is non-refundable and will be deducted from the installation balance."
                : "Payment confirmed successfully."}
          </p>

          <div className="flex gap-2">
            {/* comentario en espanol: casi nunca se ve porque redirigimos, pero sirve de fallback */}
            {orderId ? (
              <Button onClick={() => router.replace(`/orders/${orderId}`)}>
                Go to Order
              </Button>
            ) : (
              <Button
                onClick={() =>
                  router.replace(`/estimates/${estimateId}/edit?paid=1`)
                }
              >
                Go to Estimate
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => router.replace(`/estimates/${estimateId}/edit`)}
            >
              View Estimate
            </Button>
          </div>
        </>
      )}

      {status === "failed" && (
        <>
          <p className="text-sm text-muted-foreground">
            Payment was completed, but confirmation is still processing. Please
            reopen the related Estimate or Order in a moment.
          </p>

          <div className="flex gap-2">
            <Button onClick={() => router.replace(`/estimates/${estimateId}/edit`)}>
              Open Estimate
            </Button>

            <Button variant="outline" onClick={() => router.push("/estimates")}>
              Back to Estimates
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
