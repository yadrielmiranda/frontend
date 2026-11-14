"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Contact, Hammer, Loader2, PanelsTopLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { approveEstimateOrder } from "@/app/api/payments.api";
import { Button } from "@/components/ui/button";
import { useMaterialRevisions } from "@/lib/use-material-revisions";

export function OrderReviewPanel({ estimateId, isAdmin, blockedReason }: {
  estimateId: number;
  isAdmin: boolean;
  blockedReason?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const { data, failed, loading, refresh } = useMaterialRevisions(estimateId);
  const router = useRouter();
  const revisionPending = Boolean(data?.current || data?.installationRevisionId);
  const blocked = busy || loading || failed || !data || Boolean(blockedReason) || revisionPending || Boolean(data.orderId);
  const approve = async () => {
    if (!isAdmin || blocked || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const order = await approveEstimateOrder(estimateId);
      toast.success(`Order #${order.number} created.`);
      router.replace(`/orders/${order.id}`);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
      router.refresh(); refresh();
    } finally { inFlight.current = false; setBusy(false); }
  };
  const revisionHref = data?.installationRevisionId
    ? `/installations/${data.installationRevisionId}#material-revision`
    : `/estimates/${estimateId}/material-revisions`;
  return (
    <div className="mb-6 space-y-3 print:hidden">
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 sm:p-6" aria-label="Order review">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-amber-950">{revisionPending ? "Estimate revision in progress" : "Pending order review"}</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Payment confirmed</span>
        </div>
        <p className="mt-3 text-sm text-amber-900">{revisionPending
          ? "A revision is being prepared for this estimate and its installation."
          : "Review the complete estimate, including its installation, before creating the order."}</p>
        <div className="my-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-2"><Contact className="h-4 w-4" />Customer details</span>
          <span className="inline-flex items-center gap-2"><PanelsTopLeft className="h-4 w-4" />Pieces</span>
          <span className="inline-flex items-center gap-2"><Hammer className="h-4 w-4" />Installation</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {data && !data.orderId && (data.canBegin || revisionPending) && <Button asChild variant="outline"><Link href={revisionHref}>{revisionPending ? "Continue revision" : data.canReviseExisting ? "Revise estimate" : "Add Piece"}</Link></Button>}
          {isAdmin && <Button disabled={blocked} aria-describedby="order-review-help" onClick={() => void approve()}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? "Creating order..." : "Approve order"}
          </Button>}
          {data && !revisionPending && data.history.length > 0 && <Button asChild variant="ghost"><Link href={`/estimates/${estimateId}/material-revisions?view=history`}>Revision history</Link></Button>}
        </div>
        <p id="order-review-help" className="mt-3 text-sm text-amber-900">{revisionPending
          ? "Complete or cancel the revision before creating the order."
          : blockedReason || (isAdmin ? "Approve only when the estimate and installation are ready." : "An administrator will create the order after reviewing the project.")}</p>
        {loading && <p role="status" className="mt-2 text-sm text-muted-foreground">Checking revision status…</p>}
        {failed && <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span>Could not load the revision status.</span><Button variant="outline" size="sm" onClick={refresh}>Retry</Button></div>}
      </section>
      <p className="flex items-start gap-2 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>Existing payments stay credited. You can review any price difference before the changes are applied.</span></p>
    </div>
  );
}