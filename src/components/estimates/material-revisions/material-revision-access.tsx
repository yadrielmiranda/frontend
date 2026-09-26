"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getMaterialRevisions, type MaterialRevisionsData } from "@/app/api/material-revisions.api";

// La capacidad se consulta al servidor. No se amplían roles ni permisos del visor.
export function MaterialRevisionAccess({ estimateId }: { estimateId: number }) {
  const [data, setData] = useState<MaterialRevisionsData | null>(null);
  useEffect(() => {
    let alive = true;
    setData(null);
    const refresh = async () => {
      try { const next = await getMaterialRevisions(estimateId); if (alive) setData(next); }
      catch { if (alive) setData(null); }
    };
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    window.addEventListener("focus", refresh);
    return () => { alive = false; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [estimateId]);
  if (!data || (!data.canBegin && !data.current && !data.history.length && !data.installationRevisionId)) return null;
  if (data.installationRevisionId) return (
    <section className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 p-4 print:hidden" aria-label="Material revision">
      <div className="text-sm"><p className="font-semibold">Remeasurement material revision</p>
        <p className="mt-1 text-muted-foreground">Adjust measurements and add pieces in the same revision, then submit the quote for approval.</p>
      </div>
      <Button asChild variant="outline"><Link href={`/installations/${data.installationRevisionId}#material-revision`}>Continue revision</Link></Button>
    </section>
  );
  return (
    <section className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 p-4 print:hidden" aria-label="Material revisions">
      <div className="text-sm">
        <p className="font-semibold">{data.current ? "Material revision pending" : "Material revisions"}</p>
        <p className="mt-1 text-muted-foreground">{data.current
          ? "Current material and payments remain unchanged. Complete or cancel the revision before continuing to the manufacturer."
          : data.canBegin ? (data.canReviseExisting ? "Prepare material changes without reopening the original estimate." : "Add a missing piece before remeasurement. Your deposit remains credited.")
          : "Review previously approved or canceled material revisions."}</p>
      </div>
      <Button asChild variant="outline"><Link href={`/estimates/${estimateId}/material-revisions`}>
        {data.current ? "Review material revision" : data.canBegin ? (data.canReviseExisting ? (data.orderId ? "Revise order" : "Revise material") : "Add Piece") : "Revision history"}
      </Link></Button>
    </section>
  );
}
