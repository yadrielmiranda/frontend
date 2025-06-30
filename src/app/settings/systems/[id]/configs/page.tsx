import {
  getSystemWithConfigs,
  getAvailableConfigs,
} from "@/app/api/systems.api";
import { SystemConfigsClient } from "./system-configs-client";

export default async function ManageSystemConfigsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const systemId = Number(id);

  // Obtenemos los datos en paralelo para optimizar la carga
  const [systemData, availableConfigs] = await Promise.all([
    getSystemWithConfigs(systemId),
    getAvailableConfigs(systemId),
  ]);

  const associatedConfigs = systemData.sysconfs.map((sc: any) => sc.config);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-2">
        Gestionar Configuraciones para: {systemData.name}
      </h1>
      <p className="text-muted-foreground mb-6">
        Producto: {systemData.brandProduct.product.name}
      </p>

      <SystemConfigsClient
        systemId={systemId}
        initialAssociatedConfigs={associatedConfigs}
        initialAvailableConfigs={availableConfigs}
      />
    </div>
  );
}
