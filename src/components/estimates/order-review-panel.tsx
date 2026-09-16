"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { approveEstimateOrder } from "@/app/api/payments.api";
import { Button } from "@/components/ui/button";

export function OrderReviewPanel({ estimateId, isAdmin, blockedReason }: {
  estimateId: number;
  isAdmin: boolean;
  blockedReason?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const approve = async () => {
    setBusy(true);
    try {
      const order = await approveEstimateOrder(estimateId);
      toast.success(`Order #${order.number} created.`);
      router.replace(`/orders/${order.id}`);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
      router.refresh();
      setBusy(false);
    }
  };
  return (
    <section className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-5" role="status">
      <h2 className="font-semibold text-amber-950">Pending order review</h2>
      <p className="mt-1 text-sm text-amber-900">
        The first order payment is confirmed and credited. An administrator will review the project and create the order.
      </p>
      {isAdmin && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-amber-900">Approve when the project is ready to be ordered.</p>
          {blockedReason && <p id="order-review-blocked" className="text-sm font-medium text-amber-950">{blockedReason}</p>}
          <Button disabled={busy || Boolean(blockedReason)} aria-describedby={blockedReason ? "order-review-blocked" : undefined} onClick={() => void approve()}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? "Creating order..." : "Approve order"}
          </Button>
        </div>
      )}
    </section>
  );
}
