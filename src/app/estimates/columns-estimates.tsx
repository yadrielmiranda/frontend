"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteEstimate } from "@/app/api/estimates.api";
import { toast } from "sonner";

// Ajusta este tipo según la respuesta de tu API
export type Estimate = {
    id: number;
    number: string;
    name: string;
    project: string;
    priceT: number;
    date: string;
}

export const columns: ColumnDef<Estimate>[] = [
    { accessorKey: "number", header: "Número" },
    { accessorKey: "name", header: "Cliente" },
    { accessorKey: "project", header: "Proyecto" },
    { 
        accessorKey: "priceT", 
        header: "Total",
        cell: ({ row }) => `$${row.original.priceT.toFixed(2)}`
    },
    { 
        accessorKey: "date", 
        header: "Fecha",
        cell: ({ row }) => new Date(row.original.date).toLocaleDateString()
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const estimate = row.original;
            const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
            const router = useRouter();

            const handleDelete = async () => {
                try {
                    await deleteEstimate(estimate.id);
                    toast.success("Presupuesto eliminado exitosamente.");
                    router.refresh();
                } catch (error) {
                    toast.error("Error al eliminar el presupuesto.");
                    console.error(error);
                } finally {
                    setShowDeleteConfirm(false);
                }
            };

            return (
                <div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem asChild><Link href={`/settings/estimates/${estimate.id}`}>Ver Detalles</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href={`/settings/estimates/${estimate.id}/edit`}>Editar</Link></DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onSelect={() => setShowDeleteConfirm(true)}>Eliminar</DropdownMenuItem>
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