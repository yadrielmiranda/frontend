"use client";

import Link from "next/link";
import type { CompanyLocale } from "@/components/company/company-content";
import { Button } from "@/components/ui/button";
import { useMaterialRevisions } from "@/lib/use-material-revisions";

// The server supplies capabilities. Entry context controls navigation, never permissions.
export function MaterialRevisionAccess({ estimateId, context = "estimate", locale = "en" }: {
  estimateId: number;
  context?: "estimate" | "order" | "installation";
  locale?: CompanyLocale;
}) {
  const { data } = useMaterialRevisions(estimateId);
  if (!data) return null;
  const es = locale === "es";
  const historyLabel = es ? "Historial de revisiones" : "Revision history";
  const pluralTitle = data.orderId
    ? (es ? "Revisiones de la orden" : "Order revisions")
    : (es ? "Revisiones de la cotización" : "Estimate revisions");
  if (data.orderId && context !== "order") return (
    <section className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 p-4 print:hidden" aria-label={pluralTitle}>
      <p className="text-sm">{es ? "Esta cotización pertenece a una orden. Abre la orden para revisar o solicitar cambios." : "This estimate belongs to an order. Review and request changes from the order."}</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link href={`/orders/${data.orderId}`}>{es ? "Ver orden" : "View order"}</Link></Button>
        {(data.current || data.history.length > 0) && <Button asChild variant="outline"><Link href={`/estimates/${estimateId}/material-revisions?view=history`}>{historyLabel}</Link></Button>}
      </div>
    </section>
  );
  if (!data.canBegin && !data.current && !data.history.length && !data.installationRevisionId) return null;
  if (data.installationRevisionId) return (
    <section className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 p-4 print:hidden" aria-label={es ? "Revisión de instalación" : "Installation revision"}>
      <div className="text-sm"><p className="font-semibold">{es ? "Revisión de instalación en curso" : "Installation revision in progress"}</p>
        <p className="mt-1 text-muted-foreground">{es ? "Revisa las medidas y las piezas adicionales junto con la cotización de instalación." : "Review measurements and additional pieces together with the installation quote."}</p>
      </div>
      <Button asChild variant="outline"><Link href={`/installations/${data.installationRevisionId}#material-revision`}>{es ? "Continuar revisión" : "Continue revision"}</Link></Button>
    </section>
  );
  const inProgressTitle = data.orderId
    ? (es ? "Revisión de la orden en curso" : "Order revision in progress")
    : (es ? "Revisión de la cotización en curso" : "Estimate revision in progress");
  return (
    <section className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 p-4 print:hidden" aria-label={pluralTitle}>
      <div className="text-sm">
        <p className="font-semibold">{data.current ? inProgressTitle : pluralTitle}</p>
        <p className="mt-1 text-muted-foreground">{data.current
          ? (es ? "Completa o cancela la revisión para continuar. Los pagos realizados siguen acreditados." : "Complete or cancel the revision before continuing. Existing payments stay credited.")
          : data.canBegin ? (data.canReviseExisting
            ? (es ? "Revisa los cambios propuestos y la diferencia de precio antes de aprobarlos." : "Review the proposed changes and their price difference before approval.")
            : (es ? "Agrega una pieza faltante antes de la nueva medición. Tu depósito sigue acreditado." : "Add a missing piece before remeasurement. Your deposit remains credited."))
          : (es ? "Consulta las revisiones aprobadas o canceladas anteriormente." : "Review previously approved or canceled revisions.")}</p>
      </div>
      <Button asChild variant="outline"><Link href={`/estimates/${estimateId}/material-revisions`}>
        {data.current ? (es ? "Revisar cambios" : "Review revision") : data.canBegin ? (data.canReviseExisting
          ? (data.orderId ? (es ? "Revisar orden" : "Revise order") : (es ? "Revisar cotización" : "Revise estimate"))
          : (es ? "Agregar pieza" : "Add Piece")) : historyLabel}
      </Link></Button>
    </section>
  );
}
