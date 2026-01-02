"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { addConfigToSystem, removeConfigFromSystem } from "@/app/api/systems.api";
import {
  getAssociatedConfigsColumns,
  getAvailableConfigsColumns,
} from "./columns-system-configs";

type Config = { id: number; conf: string };

interface SystemConfigsClientProps {
  systemId: number;
  initialAssociatedConfigs: Config[];
  initialAvailableConfigs: Config[];
}

export function SystemConfigsClient({
  systemId,
  initialAssociatedConfigs,
  initialAvailableConfigs,
}: SystemConfigsClientProps) {
  const router = useRouter();

  const handleAdd = async (configId: number) => {
    try {
      await addConfigToSystem(systemId, configId);
      router.refresh();
      toast.success("Configuration added successfully.");
    } catch (error) {
      console.error("Error al añadir configuración:", error);
      toast.error("Error adding configuration.");
    }
  };

  const handleRemove = async (configId: number) => {
    try {
      await removeConfigFromSystem(systemId, configId);
      router.refresh();
      toast.success("Configuration successfully removed.");
    } catch (error) {
      console.error("Error al quitar configuración:", error);
      toast.error("Error removing configuration.");
    }
  };

  const associatedColumns = getAssociatedConfigsColumns(handleRemove);
  const availableColumns = getAvailableConfigsColumns(handleAdd);

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Configuraciones Asociadas</h2>
        <DataTable columns={associatedColumns} data={initialAssociatedConfigs} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Configuraciones Disponibles</h2>
        <DataTable
          columns={availableColumns}
          data={initialAvailableConfigs}
          filterColumnId="conf"
          filterPlaceholder="Buscar configuración..."
        />
      </div>
    </div>
  );
}
