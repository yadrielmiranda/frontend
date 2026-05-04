import Link from "next/link";
import { notFound } from "next/navigation";

import { getSystemFrameColorsForManage } from "@/app/api/systems.api";
import { SystemFrameColorsClient } from "./system-frame-colors-client";

import { BackLink } from "@/components/navigation/back-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto mb-4">
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

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{data.system.name}</CardTitle>
          <CardDescription>
            Manage the frame colors available for this system. Product:{" "}
            <span className="font-medium">{data.system.product.name}</span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <SystemFrameColorsClient data={data} />
        </CardContent>
      </Card>
    </div>
  );
}