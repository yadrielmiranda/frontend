import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cookies } from "next/headers";
import { getUsers } from "@/app/api/users.api";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns-users";

export default async function AdminUsersPage() {
  // Se obtiene el token desde las cookies en el Server Component.
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  // Se pasa el token a la función para autenticar la llamada a la API.
  const users = await getUsers(token);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">User Management</h1>
        <Button variant="green" asChild>
          {/* Asegúrate de que esta ruta coincida con tu estructura */}
          <Link href="/settings/users/new">+ New User</Link>
        </Button>
      </div>
      <div className="container mx-auto py-10">
        <DataTable
          columns={columns}
          data={users}
          filterColumnId="username"
          filterPlaceholder="Filter by username..."
        />
      </div>
    </div>
  );
}
