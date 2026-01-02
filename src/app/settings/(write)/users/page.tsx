import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { getUsers } from "@/app/api/users.api";
import { columns } from "./columns-users";
import { getCurrentUser } from "@/lib/session";
import { isAdmin, canAccessSettings } from "@/lib/rbac";

export default async function AdminUsersPage() {
  // 1) Primero sesión
  const currentUser = await getCurrentUser();

  // no logueado => login
  if (!currentUser) redirect("/login");

  const role = currentUser.role?.name ?? null;

  // 2) Permitir ver: admin + operator
  if (!canAccessSettings(role)) {
    // puedes mandar a "/" o "/settings"
    redirect("/");
  }

  // 3) Solo si pasó el guard, entonces cargamos users
  const users = await getUsers();

  // 4) Permitir editar: solo admin
  const canEdit = isAdmin(role);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">User Management</h1>

        {canEdit && (
          <Button variant="green" asChild>
            <Link href="/settings/users/new">+ New User</Link>
          </Button>
        )}
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
