import Link from "next/link";
import { getEstimates } from "@/app/api/estimates.api";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns-estimates";

export default async function EstimatesPage() {
    const estimates = await getEstimates();

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Presupuestos</h1>
                <Button asChild variant="green">
                    <Link href="/settings/estimates/new">+ Nuevo Presupuesto</Link>
                </Button>
            </div>
            <div className="container mx-auto py-10">
                <DataTable
                    columns={columns}
                    data={estimates}
                    filterColumnId="name"
                    filterPlaceholder="Filtrar por cliente..."
                />
            </div>
        </div>
    );
}