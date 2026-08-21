"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  cancelPublicCheckoutSession,
  createPublicCheckoutSession,
} from "@/app/api/payments.api";
import { Button } from "@/components/ui/button";
import type { PaymentType } from "@/lib/types";

export default function PublicCheckoutCancelContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [busy, setBusy] = useState<"resume" | "cancel" | null>(null);
  const token = params.get("token") ?? "";
  const paymentType = useMemo<PaymentType>(() => {
    const value = params.get("type");
    return value === "INSTALLATION_DEPOSIT" ||
      value === "PERMIT" ||
      value === "INSTALLATION" ||
      value === "EXTRA"
      ? value
      : "MATERIAL";
  }, [params]);
  const sequence = useMemo(() => {
    const value = Number(params.get("sequence"));
    return Number.isInteger(value) && value > 0 ? value : 1;
  }, [params]);

  const backUrl = token ? `/public/payments/${encodeURIComponent(token)}` : "/";

  const resume = async () => {
    if (!token) return;
    setBusy("resume");
    try {
      const { url } = await createPublicCheckoutSession(token);
      window.location.href = url;
    } catch (error) {
      toast.error((error as Error).message);
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!token) return;
    setBusy("cancel");
    try {
      const result = await cancelPublicCheckoutSession(
        token,
        paymentType,
        sequence,
      );
      if (result.status === "paid") {
        toast.success("Payment was already confirmed.");
      } else {
        toast.success("Payment attempt canceled.");
      }
      router.replace(backUrl);
    } catch (error) {
      toast.error((error as Error).message);
      setBusy(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <section className="mx-auto max-w-lg space-y-4 rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Checkout not completed</h1>
        <p className="text-sm text-muted-foreground">
          Continue the payment or cancel this checkout attempt. Canceling the
          attempt does not remove the charge; it can be started again from the
          payment link.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!token || busy !== null}
            onClick={() => void resume()}
          >
            {busy === "resume" ? "Opening..." : "Continue payment"}
          </Button>
          <Button
            variant="destructive"
            disabled={!token || busy !== null}
            onClick={() => void cancel()}
          >
            {busy === "cancel" ? "Canceling..." : "Cancel payment attempt"}
          </Button>
        </div>
      </section>
    </main>
  );
}
