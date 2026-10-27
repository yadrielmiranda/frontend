import Link from "next/link";
import { notFound } from "next/navigation";

import { getSystemFrameColorsForManage } from "@/app/api/systems.api";
import { SystemFrameColorsClient } from "./system-frame-colors-client";

import { BackLink } from "@/components/navigation/back-link";
import { ContentCard } from "@/components/layout/content-card";
import { PageContainer } from "@/components/layout/page-container";

export default async function ManageSystemFrameColorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const systemId = Number(id);

  if (Number.isNaN(systemId)) notFound();

  const data = await getSystemFrameColorsForManage(systemId);
  if (!data) notFound();

  return (
    <PageContainer size="default">
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <BackLink href="/settings/systems" label="Back to Systems" />

          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Settings</span>
            <span>/</span>

            <Link href="/settings/systems" className="hover:text-foreground">
              Systems
            </Link>

            <span>/</span>
            <span className="text-foreground">{data.system.name}</span>
          </div>
        </div>

        <ContentCard className="overflow-hidden p-0">
          <div className="border-b bg-slate-50/70 px-6 py-5">
            <h1 className="text-2xl font-bold tracking-tight">
              {data.system.name} Frame Colors
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage associated Frame Colors, the default color and their base
              price modifiers. Product:{" "}
              <span className="font-medium">{data.system.product.name}</span>
            </p>
          </div>

          <div className="p-6">
            <SystemFrameColorsClient data={data} />
          </div>
        </ContentCard>
      </div>
    </PageContainer>
  );
}
