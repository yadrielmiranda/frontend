// src/app/settings/roles/page.tsx

import { cookies } from "next/headers";
import { DataTable } from "@/components/data-table";
import { getRoles } from "@/app/api/roles.api";
import { columns } from "./columns-roles";


export default async function RolesPage() {
  // Obtenemos el token en el servidor para la carga inicial de datos
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  // Llamamos a la API para obtener los roles
  const roles = await getRoles(token);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Roles & Markups</h1>
        {/* No necesitamos un botón de "Nuevo" ya que los roles son fijos */}
      </div>
      <div className="container mx-auto py-10">
        <DataTable
          columns={columns}
          data={roles}
          // No añadimos filtro porque la lista de roles es corta
        />
      </div>
    </div>
  );
}