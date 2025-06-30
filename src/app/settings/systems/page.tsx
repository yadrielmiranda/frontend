import Link from "next/link";
import { getSystems } from "@/app/api/systems.api";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns-systems";


export default async function SystemsPage() {
    const systems = await getSystems();

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Sistemas</h1>
                <Button asChild variant="green">
                    <Link href="/settings/systems/new">+ Nuevo Sistema</Link>
                </Button>
            </div>
            <div className="container mx-auto py-10">
                <DataTable
                    columns={columns}
                    data={systems}
                    filterColumnId="name" // Filtraremos por el nombre del sistema
                    filterPlaceholder="Filtrar sistemas..."
                />
            </div>
        </div>
    );
}