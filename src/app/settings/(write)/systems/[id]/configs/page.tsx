import Link from "next/link";

import {
  getSystemWithConfigs,
  getAvailableConfigs,
} from "@/app/api/systems.api";
import { SystemConfigsClient } from "./system-configs-client";

import { BackLink } from "@/components/navigation/back-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ManageSystemConfigsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const systemId = Number(id);

  const [systemData, availableConfigs] = await Promise.all([
    getSystemWithConfigs(systemId),
    getAvailableConfigs(systemId),
  ]);

  const associatedConfigs = systemData.sysconfs.map((sc: any) => ({
    id: sc.config.id,
    conf: sc.config.conf,
    categoryId: sc.config.categoryId ?? null,
    category: sc.config.category ?? null,
    allowScreen: sc.allowScreen,
  }));

  const isLinearMaterial =
    systemData.brandProduct?.product?.kind === "LINEAR_MATERIAL";

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
          <span className="text-foreground">{systemData.name}</span>
        </div>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{systemData.name}</CardTitle>
          <CardDescription>
            Manage the configs available for this system. Product:{" "}
            <span className="font-medium">
              {systemData.brandProduct.product.name}
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <SystemConfigsClient
            systemId={systemId}
            systemName={systemData.name}
            isLinearMaterial={isLinearMaterial}
            initialAssociatedConfigs={associatedConfigs}
            initialAvailableConfigs={availableConfigs}
          />
        </CardContent>
      </Card>
    </div>
  );
}
