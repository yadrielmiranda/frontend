import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getSystemConfigOptionsForManage,
} from "@/app/api/systems.api";

import { BackLink } from "@/components/navigation/back-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SystemConfigOptionsClient } from "./system-config-options-client";



export default async function SystemConfigOptionsPage({
  params,
}: {
  params: Promise<{ id: string; configId: string }>;
}) {
  const { id, configId } = await params;

  const systemId = Number(id);
  const parsedConfigId = Number(configId);

  if (Number.isNaN(systemId) || Number.isNaN(parsedConfigId)) notFound();

  const data = await getSystemConfigOptionsForManage(systemId, parsedConfigId);
  if (!data) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto mb-4">
        <BackLink
          href={`/settings/systems/${systemId}/configs`}
          label="Back to Manage Configs"
        />

        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span>Settings</span>
          <span>/</span>

          <Link href="/settings/systems" className="hover:text-foreground">
            Systems
          </Link>

          <span>/</span>

          <Link
            href={`/settings/systems/${systemId}/configs`}
            className="hover:text-foreground"
          >
            {data.system.name}
          </Link>

          <span>/</span>
          <span className="text-foreground">{data.config.conf}</span>
        </div>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Manage Options</CardTitle>
          <CardDescription>
            Configure which options are available for{" "}
            <span className="font-medium">{data.system.name}</span> /{" "}
            <span className="font-medium">{data.config.conf}</span>.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <SystemConfigOptionsClient data={data} />
        </CardContent>
      </Card>
    </div>
  );
}