"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner"; // <-- 1. Importa toast
import { DataTable } from "@/components/data-table";
import { addConfigToSystem, removeConfigFromSystem } from "@/app/api/systems.api";
import { getAssociatedConfigsColumns, getAvailableConfigsColumns } from "./columns-system-configs";

type Config = { id: number; conf: string; };

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
            router.refresh(); // Recarga los datos del servidor
            toast.success("Configuration added successfully."); // <-- 2. Notificación de éxito
        } catch (error) {
            console.error("Error al añadir configuración:", error);
            toast.error("Error adding configuration."); // <-- 3. Notificación de error
        }
    };

    const handleRemove = async (configId: number) => {
        try {
            await removeConfigFromSystem(systemId, configId);
            router.refresh();
            toast.success("Configuration successfully removed."); // <-- 2. Notificación de éxito
        } catch (error) {
            console.error("Error al quitar configuración:", error);
            toast.error("Error removing configuration."); // <-- 3. Notificación de error
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
                <DataTable columns={availableColumns} data={initialAvailableConfigs} filterColumnId="conf" filterPlaceholder="Buscar configuración..." />
            </div>
        </div>
    );
}