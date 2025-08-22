import { cookies } from "next/headers";
import { getGlobalParameters } from "@/app/api/global-parameters.api";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns"; // Importamos desde el archivo local de columnas

export default async function GlobalParametersPage() {
  // CORRECCIÓN: Se añade 'await' a la llamada de cookies()
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  
  const parameters = await getGlobalParameters(token);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Global Parameters</h1>
        {/* No hay botón de "Nuevo" ya que los parámetros se definen en el código */}
      </div>
      <div className="container mx-auto py-10">
        <DataTable
          columns={columns}
          data={parameters}
          // No añadimos filtro porque la lista será corta
        />
      </div>
    </div>
  );
}
