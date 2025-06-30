"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteConfig } from "@/app/api/configs.api";

// Tipo de dato para la tabla. Debe coincidir con la respuesta de getConfigs()
export type Config = {
    id: number;
    conf: string;
    prod: { // El producto viene anidado
        id: number;
        name: string;
    };
}

export const columns: ColumnDef<Config>[] = [
    {
        accessorKey: "conf",
        header: "Nombre de la Configuración",
    },
    {
        accessorKey: "prod.name", // Accedemos al nombre del producto anidado
        header: "Producto Asociado",
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const config = row.original;
            const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
            const router = useRouter();

            const handleDelete = async () => {
                try {
                    await deleteConfig(config.id);
                    setShowDeleteConfirm(false);
                    router.refresh();
                } catch (error) {
                    console.error("Error al eliminar la configuración", error);
                }
            };

            return (
                <div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={`/settings/configs/${config.id}/edit`}>
                                    Editar
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onSelect={() => setShowDeleteConfirm(true)}
                            >
                                Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DeleteConfirmationDialog
                        isOpen={showDeleteConfirm}
                        onClose={() => setShowDeleteConfirm(false)}
                        onConfirm={handleDelete}
                    />
                </div>
            );
        },
    },
];