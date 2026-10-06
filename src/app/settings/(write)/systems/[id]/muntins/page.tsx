import Link from "next/link";
import { notFound } from "next/navigation";
import { getSystemMuntins } from "@/app/api/system-muntins.api";
import { BackLink } from "@/components/navigation/back-link";
import { Button } from "@/components/ui/button";
import { SystemMuntinsClient } from "./client";

export default async function ManageSystemMuntinsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const systemId = Number(id);
  if (!Number.isInteger(systemId) || systemId <= 0) notFound();
  const data = await getSystemMuntins(systemId);
  if (!data) notFound();

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-10">
      <div className="space-y-3">
        <BackLink href="/settings/systems" label="Back to Systems" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{data.system.name}</p>
            <h1 className="text-2xl font-semibold">Manage Muntins</h1>
            <p className="mt-1 text-sm text-muted-foreground">Allow patterns for specific configuration and glass combinations.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild><Link href={`/settings/systems/${systemId}/configs`}>Manage Configs</Link></Button>
            <Button variant="outline" size="sm" asChild><Link href={`/settings/systems/${systemId}/crystals`}>Manage Glass</Link></Button>
          </div>
        </div>
      </div>
      <SystemMuntinsClient initialData={data} />
    </div>
  );
}
