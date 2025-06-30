"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

type Config = { id: number; conf: string; };

export const getAssociatedConfigsColumns = (onRemove: (configId: number) => void): ColumnDef<Config>[] => [
    {
        accessorKey: "conf",
        header: "Nombre",
    },
    {
        id: "actions",
        cell: ({ row }) => <Button variant="destructive" size="sm" onClick={() => onRemove(row.original.id)}>Quitar</Button>,
    },
];

export const getAvailableConfigsColumns = (onAdd: (configId: number) => void): ColumnDef<Config>[] => [
    {
        accessorKey: "conf",
        header: "Nombre",
    },
    {
        id: "actions",
        cell: ({ row }) => <Button variant="green" size="sm" onClick={() => onAdd(row.original.id)}>Añadir</Button>,
    },
];
