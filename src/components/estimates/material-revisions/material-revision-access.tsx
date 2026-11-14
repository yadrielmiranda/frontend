"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMaterialRevisions } from "@/lib/use-material-revisions";

// The server supplies capabilities. Entry context controls navigation, never permissions.
export function MaterialRevisionAccess({ estimateId, context = "estimate" }: {
  estimateId: number;
  context?: "estimate" | "order" | "installation";
}) {
  const { data } = useMaterialRevisions(estimateId);
  if (!data) return null;
  if (data.orderId && context !== "order") return (
    <section className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 p-4 print:hidden" aria-label="Order revisions">
      <p className="text-sm">This estimate belongs to an order. Review and request changes from the order.</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link href={`/orders/${data.orderId}`}>View order</Link></Button>
        {(data.current || data.history.length > 0) && <Button asChild variant="outline"><Link href={`/estimates/${estimateId}/material-revisions?view=history`}>Revision history</Link></Button>}
      </div>
    </section>
  );
  if (!data.canBegin && !data.current && !data.history.length && !data.installationRevisionId) return null;
  if (data.installationRevisionId) return (
    <section className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 p-4 print:hidden" aria-label="Installation revision">
      <div className="text-sm"><p className="font-semibold">Installation revision in progress</p>
        <p className="mt-1 text-muted-foreground">Review measurements and additional pieces together with the installation quote.</p>
      </div>
      <Button asChild variant="outline"><Link href={`/installations/${data.installationRevisionId}#material-revision`}>Continue revision</Link></Button>
    </section>
  );
  const title = data.orderId ? "Order revision" : "Estimate revision";
  return (
    <section className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 p-4 print:hidden" aria-label={`${title}s`}>
      <div className="text-sm">
        <p className="font-semibold">{data.current ? `${title} in progress` : `${title}s`}</p>
        <p className="mt-1 text-muted-foreground">{data.current
          ? "Complete or cancel the revision before continuing. Existing payments stay credited."
          : data.canBegin ? (data.canReviseExisting ? "Review the proposed changes and their price difference before approval." : "Add a missing piece before remeasurement. Your deposit remains credited.")
          : "Review previously approved or canceled revisions."}</p>
      </div>
      <Button asChild variant="outline"><Link href={`/estimates/${estimateId}/material-revisions`}>
        {data.current ? "Review revision" : data.canBegin ? (data.canReviseExisting ? (data.orderId ? "Revise order" : "Revise estimate") : "Add Piece") : "Revision history"}
      </Link></Button>
    </section>
  );
}
