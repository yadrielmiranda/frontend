import { notFound } from "next/navigation";
import { getSystemDesignsForManage } from "@/app/api/garage-designs.api";
import { BackLink } from "@/components/navigation/back-link";
import { SystemDesignsClient } from "./system-designs-client";

export default async function SystemDesignsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const systemId = Number(id);
  if (!Number.isInteger(systemId) || systemId < 1) notFound();
  const data = await getSystemDesignsForManage(systemId);
  if (!data || data.system.product.diagramFamily !== "GARAGE_DOOR") notFound();

  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-10">
      <BackLink href="/settings/systems" label="Back to Systems" />
      <div>
        <p className="text-sm text-muted-foreground">{data.system.product.name}</p>
        <h1 className="text-2xl font-bold tracking-tight">{data.system.name} · Designs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose the designs and colors available for this system and the combination selected when a design is added.
        </p>
      </div>
      <SystemDesignsClient data={data} />
    </div>
  );
}
