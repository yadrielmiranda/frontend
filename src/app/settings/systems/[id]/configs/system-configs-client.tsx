"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { addConfigToSystem, removeConfigFromSystem } from "@/app/api/systems.api";
import { getAssociatedConfigsColumns, getAvailableConfigsColumns } from "./columns-system-configs"; // Columnas que crearemos

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
            router.refresh(); // Recarga los datos del servidor para actualizar ambas tablas
        } catch (error) {
            console.error("Error al añadir configuración:", error);
            alert("Error al añadir configuración.");
        }
    };

    const handleRemove = async (configId: number) => {
        try {
            await removeConfigFromSystem(systemId, configId);
            router.refresh();
        } catch (error) {
            console.error("Error al quitar configuración:", error);
            alert("Error al quitar configuración.");
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