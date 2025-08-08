import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getEstimates } from "@/app/api/estimates.api";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns-estimates";

export default async function EstimatesPage() {
  //Obtenemos el token aquí, en el Server Component
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  //Pasamos el token a la función de la API
  const estimates = await getEstimates(token);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Estimates</h1>
        <Button variant="green" asChild>
          <Link href="/estimates/new">+ New Estimate</Link>
        </Button>
      </div>
      <div className="container mx-auto py-10">
        <DataTable
          columns={columns}
          data={estimates}
          filterColumnId="name"
          filterPlaceholder="Filter by name..."
        />
      </div>
    </div>
  );
}
