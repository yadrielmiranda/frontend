"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getEstimate } from "@/app/api/estimates.api";

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

        const statusName = (est.status?.name ?? "").toLowerCase().trim();
        const isOrdered = statusName === "ordered" || !!est.order;

        // intentamos capturar el orderId si existe
        const oid =
          (est as any)?.order?.id != null
            ? Number((est as any).order.id)
            : null;

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
        "Payment received, but order is still processing. Refresh in a moment."
      );
    }, 60000);

    return () => {
      alive = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [estimateId, router]);

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
            We’re confirming your payment and creating the order…
          </p>

          <p className="text-xs text-muted-foreground">
            Attempts: {attempt}
          </p>

          <Button
            variant="outline"
            onClick={() => router.replace(`/estimates/${estimateId}`)}
          >
            View Estimate
          </Button>
        </>
      )}

      {status === "done" && (
        <>
          <p className="text-sm text-muted-foreground">
            Order created successfully.
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
                  router.replace(`/estimates/${estimateId}?paid=1`)
                }
              >
                Go to Estimate
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => router.replace(`/estimates/${estimateId}`)}
            >
              View Estimate
            </Button>
          </div>
        </>
      )}

      {status === "failed" && (
        <>
          <p className="text-sm text-muted-foreground">
            Payment was completed, but the order might still be processing.
            Please open the estimate and refresh.
          </p>

          <div className="flex gap-2">
            <Button
              onClick={() => router.replace(`/estimates/${estimateId}`)}
            >
              Open Estimate
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push("/estimates")}
            >
              Back to Estimates
            </Button>
          </div>
        </>
      )}
    </div>
  );
}